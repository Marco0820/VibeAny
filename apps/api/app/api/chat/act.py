"""
Act Execution API Endpoints
Handles CLI execution and AI actions
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid
import asyncio
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, get_generation_user
from app.models.projects import Project
from app.models.messages import Message
from app.models.sessions import Session as ChatSession
from app.models.commits import Commit
from app.models.user_requests import UserRequest
from app.models.users import User
from app.services.cli.unified_manager import UnifiedCLIManager
from app.services.cli.base import CLIType
from app.services.git_ops import commit_all
from app.services.local_runtime import (
    start_preview_process,
    stop_preview_process,
    preview_status,
)
from app.core.websocket.manager import manager
from app.core.terminal_ui import ui
from app.services.points_service import PointsService, InsufficientPointsError


router = APIRouter()


class ImageAttachment(BaseModel):
    name: str
    # Either base64_data or path must be provided
    base64_data: Optional[str] = None
    path: Optional[str] = None  # Absolute path to image file
    mime_type: str = "image/jpeg"


class ActRequest(BaseModel):
    instruction: str
    conversation_id: str | None = None
    cli_preference: str | None = None
    fallback_enabled: bool = True
    images: List[ImageAttachment] = []
    is_initial_prompt: bool = False
    # Planning-only flag: when true (for chat endpoint), generate a detailed plan text without any file edits
    is_planning: bool = False
    # Combined flow: generate planning text first, then proceed to code generation and preview in one step
    plan_then_generate: bool = False


class ActResponse(BaseModel):
    session_id: str
    conversation_id: str
    status: str
    message: str


def get_active_request(db: Session, project_id: str) -> Optional[UserRequest]:
    """Return the latest ACT request that has not finished yet."""
    return (
        db.query(UserRequest)
        .filter(
            UserRequest.project_id == project_id,
            UserRequest.request_type == "act",
            UserRequest.is_completed.is_(False),
        )
        .order_by(UserRequest.created_at.desc())
        .first()
    )


async def ensure_preview_ready(
    project_id: str,
    repo_path: Optional[str],
    db: Session,
    session_id: str,
    conversation_id: str,
) -> Optional[str]:
    """Restart preview server to reflect latest changes and notify clients."""

    if not repo_path:
        ui.warning(f"Skip preview bootstrap for project {project_id}: missing repo path", "Preview")
        return None

    def _restart_preview() -> Optional[int]:
        try:
            status = preview_status(project_id)
            if status == "running":
                stop_preview_process(project_id)
            _, port = start_preview_process(project_id, repo_path)
            return port
        except Exception as exc:  # noqa: BLE001
            ui.warning(f"Preview restart failed: {exc}", "Preview")
            return None

    port = await asyncio.to_thread(_restart_preview)
    if not port:
        return None

    preview_url = f"http://localhost:{port}"

    project = db.get(Project, project_id)
    if project:
        project.preview_url = preview_url
        project.status = "preview_running"

    preview_message = Message(
        id=str(uuid.uuid4()),
        project_id=project_id,
        role="assistant",
        message_type="info",
        content=(
            "✅ 预览环境已刷新。\n\n"
            f"• 预览链接：{preview_url}\n"
            "• 请在右侧预览面板查看最新效果，并可在新标签页访问上方链接体验首页。"
        ),
        metadata_json={
            "type": "preview_ready",
            "preview_url": preview_url,
            "open_in_new_tab": True,
        },
        session_id=session_id,
        conversation_id=conversation_id,
        created_at=datetime.utcnow(),
    )
    db.add(preview_message)

    await manager.send_message(
        project_id,
        {
            "type": "message",
            "data": {
                "id": preview_message.id,
                "role": preview_message.role,
                "message_type": preview_message.message_type,
                "content": preview_message.content,
                "metadata": preview_message.metadata_json,
                "parent_message_id": None,
                "session_id": session_id,
                "conversation_id": conversation_id,
                "created_at": preview_message.created_at.isoformat(),
            },
            "timestamp": preview_message.created_at.isoformat(),
        },
    )

    await manager.broadcast_to_project(
        project_id,
        {
            "type": "project_status",
            "data": {
                "status": "preview_running",
                "preview_url": preview_url,
            },
        },
    )

    return preview_url

async def execute_act_instruction(
    project_id: str,
    instruction: str,
    session_id: str,
    conversation_id: str,
    images: List[ImageAttachment],
    db: Session,
    is_initial_prompt: bool = False
):
    """Execute an ACT instruction - can be called from other modules"""
    try:
        # Get project
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get or create session
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            # Use project's preferred CLI
            cli_type = project.preferred_cli or "remote"
            session = ChatSession(
                id=session_id,
                project_id=project_id,
                status="active",
                cli_type=cli_type,
                instruction=instruction,
                started_at=datetime.utcnow()
            )
            db.add(session)
            db.commit()
        
        # Extract project info to avoid DetachedInstanceError in background task
        project_info = {
            'id': project.id,
            'repo_path': project.repo_path,
            'preferred_cli': project.preferred_cli or "remote",
            'fallback_enabled': project.fallback_enabled if project.fallback_enabled is not None else True,
            'selected_model': project.selected_model
        }
        
        # Execute the task
        return await execute_act_task(
            project_info=project_info,
            session=session,
            instruction=instruction,
            conversation_id=conversation_id,
            images=images,
            db=db,
            cli_preference=None,  # Will use project's preferred CLI
            fallback_enabled=project_info['fallback_enabled'],
            is_initial_prompt=is_initial_prompt
        )
    except Exception as e:
        ui.error(f"Error in execute_act_instruction: {e}", "ACT")
        raise

async def execute_chat_task(
    project_info: dict,
    session: ChatSession,
    instruction: str,
    conversation_id: str,
    images: List[ImageAttachment],
    db: Session,
    cli_preference: CLIType = None,
    fallback_enabled: bool = True,
    is_initial_prompt: bool = False
):
    """Background task for executing Chat instructions"""
    try:
        # Extract project info from dict (to avoid DetachedInstanceError)
        project_id = project_info['id']
        project_repo_path = project_info['repo_path']
        project_preferred_cli = project_info['preferred_cli']
        project_fallback_enabled = project_info['fallback_enabled']
        project_selected_model = project_info['selected_model']
        
        # Use project's CLI preference if not explicitly provided
        if cli_preference is None:
            try:
                cli_preference = CLIType(project_preferred_cli)
            except ValueError:
                ui.warning(f"Unknown CLI type '{project_preferred_cli}', falling back to Claude", "CHAT")
                cli_preference = CLIType.CLAUDE
        
        ui.info(f"Using {cli_preference.value} with {project_selected_model or 'default model'}", "CHAT")
        
        # Update session status to running
        session.status = "running"
        db.commit()
        
        # Send chat_start event to trigger loading indicator
        await manager.broadcast_to_project(project_id, {
            "type": "chat_start",
            "data": {
                "session_id": session.id,
                "instruction": instruction
            }
        })
        
        # Initialize CLI manager
        cli_manager = UnifiedCLIManager(
            project_id=project_id,
            project_path=project_repo_path,
            session_id=session.id,
            conversation_id=conversation_id,
            db=db
        )
        
        # Qwen Coder does not support images yet; drop them to prevent errors
        safe_images = [] if cli_preference == CLIType.QWEN else images

        # If this is an initial prompt, enforce one-shot full generation without follow-up questions
        if is_initial_prompt:
            initial_marker = "[is_initial_prompt=true]"
            initial_guidance = (
                "\n\n" + initial_marker + "\n"
                "请一次性产出可运行的 Next.js 应用所需代码：页面/组件/样式/配置；"
                "若信息缺失，请使用合理默认并在结果中列出‘假设 Assumptions’；"
                "完成后触发预览事件（无需与用户进一步追问）。\n"
            )
            instruction = instruction + initial_guidance

        result = await cli_manager.execute_instruction(
            instruction=instruction,
            cli_type=cli_preference,
            fallback_enabled=project_fallback_enabled,
            images=safe_images,
            model=project_selected_model,
            is_initial_prompt=is_initial_prompt
        )
        
        
        # Handle result
        if result and result.get("success"):
            # For chat mode, we don't commit changes - just update session status
            session.status = "completed"
            session.completed_at = datetime.utcnow()
            fallback_from = result.get("fallback_from")
            if fallback_from:
                info_message = Message(
                    id=str(uuid.uuid4()),
                    project_id=project_id,
                    role="assistant",
                    message_type="info",
                    content=(
                        f"Primary CLI {fallback_from} encountered an issue. "
                        f"Automatically switched to {result.get('cli_used')} and completed the task."
                    ),
                    metadata_json={
                        "type": "cli_fallback",
                        "fallback_from": fallback_from,
                        "cli_used": result.get("cli_used"),
                    },
                    conversation_id=conversation_id,
                    session_id=session.id,
                    created_at=datetime.utcnow(),
                )
                db.add(info_message)
                await manager.broadcast_to_project(project_id, {
                    "type": "message",
                    "data": {
                        "id": info_message.id,
                        "role": info_message.role,
                        "message_type": info_message.message_type,
                        "content": info_message.content,
                        "metadata": info_message.metadata_json,
                        "parent_message_id": None,
                        "session_id": info_message.session_id,
                        "conversation_id": conversation_id,
                        "created_at": info_message.created_at.isoformat(),
                    },
                    "timestamp": info_message.created_at.isoformat(),
                })
            
        else:
            # Error message
            error_msg = Message(
                id=str(uuid.uuid4()),
                project_id=project_id,
                role="assistant",
                message_type="error",
                content=result.get("error", "Failed to execute chat instruction") if result else "No CLI available",
                metadata_json={
                "type": "chat_error",
                "cli_attempted": result.get("cli_attempted", cli_preference.value),
                "retry_attempted": result.get("retry_attempted", False),
                "retry_success": result.get("retry_success", False),
                "retry_attempts": result.get("retry_attempts", 0)
            },
            conversation_id=conversation_id,
            session_id=session.id,
            created_at=datetime.utcnow()
        )
            db.add(error_msg)
            
            session.status = "failed"
            session.error = result.get("error") if result else "No CLI available"
            session.completed_at = datetime.utcnow()
            
            # Send error message via WebSocket
            error_data = {
                "id": error_msg.id,
                "role": "assistant",
                "message_type": "error",
                "content": error_msg.content,
                "metadata": error_msg.metadata_json,
                "parent_message_id": None,
                "session_id": session.id,
                "conversation_id": conversation_id
            }
            await manager.broadcast_to_project(project_id, {
                "type": "message",
                "data": error_data,
                "timestamp": error_msg.created_at.isoformat()
            })
        
        db.commit()
        
        # Send chat_complete event to clear loading indicator and notify completion
        await manager.broadcast_to_project(project_id, {
            "type": "chat_complete",
            "data": {
                "status": session.status,
                "session_id": session.id
            }
        })
        
    except Exception as e:
        ui.error(f"Chat execution error: {e}", "CHAT")
        
        # Save error
        session.status = "failed"
        session.error = str(e)
        session.completed_at = datetime.utcnow()
        
        error_msg = Message(
            id=str(uuid.uuid4()),
            project_id=project_id,
            role="assistant",
            message_type="error",
            content=f"Chat execution failed: {str(e)}",
            metadata_json={"type": "chat_error"},
            conversation_id=conversation_id,
            session_id=session.id,
            created_at=datetime.utcnow()
        )
        db.add(error_msg)
        db.commit()
        
        # Send chat_complete event even on failure to clear loading indicator
        await manager.broadcast_to_project(project_id, {
            "type": "chat_complete",
            "data": {
                "status": "failed",
                "session_id": session.id,
                "error": str(e)
            }
        })


async def execute_act_task(
    project_info: dict,
    session: ChatSession,
    instruction: str,
    conversation_id: str,
    images: List[ImageAttachment],
    db: Session,
    cli_preference: CLIType = None,
    fallback_enabled: bool = True,
    is_initial_prompt: bool = False,
    request_id: str = None
):
    """Background task for executing Act instructions"""
    try:
        # Extract project info from dict (to avoid DetachedInstanceError)
        project_id = project_info['id']
        project_repo_path = project_info['repo_path']
        project_preferred_cli = project_info['preferred_cli']
        project_fallback_enabled = project_info['fallback_enabled']
        project_selected_model = project_info['selected_model']
        
        # Use project's CLI preference if not explicitly provided
        if cli_preference is None:
            try:
                cli_preference = CLIType(project_preferred_cli)
            except ValueError:
                ui.warning(f"Unknown CLI type '{project_preferred_cli}', falling back to Claude", "ACT")
                cli_preference = CLIType.CLAUDE
        
        ui.info(f"Using {cli_preference.value} with {project_selected_model or 'default model'}", "ACT")
        
        # Update session status to running
        session.status = "running"
        
        # ★ NEW: Update UserRequest status to started
        if request_id:
            user_request = db.query(UserRequest).filter(UserRequest.id == request_id).first()
            if user_request:
                user_request.started_at = datetime.utcnow()
                user_request.cli_type_used = cli_preference.value
                user_request.model_used = project_selected_model
        
        db.commit()
        
        # Send act_start event to trigger loading indicator
        await manager.broadcast_to_project(project_id, {
            "type": "act_start",
            "data": {
                "session_id": session.id,
                "instruction": instruction,
                "request_id": request_id
            }
        })
        
        # Initialize CLI manager
        cli_manager = UnifiedCLIManager(
            project_id=project_id,
            project_path=project_repo_path,
            session_id=session.id,
            conversation_id=conversation_id,
            db=db
        )
        
        # Qwen Coder does not support images yet; drop them to prevent errors
        safe_images = [] if cli_preference == CLIType.QWEN else images

        result = await cli_manager.execute_instruction(
            instruction=instruction,
            cli_type=cli_preference,
            fallback_enabled=project_fallback_enabled,
            images=safe_images,
            model=project_selected_model,
            is_initial_prompt=is_initial_prompt
        )
        
        
        # Handle result
        ui.info(f"Result received: success={result.get('success') if result else None}, cli={result.get('cli_used') if result else None}", "ACT")
        
        if result and result.get("success"):
            # Commit changes if any
            if result.get("has_changes"):
                try:
                    commit_message = f"🤖 {result.get('cli_used', 'AI')}: {instruction[:100]}"
                    commit_result = commit_all(project_repo_path, commit_message)
                    
                    if commit_result["success"]:
                        commit = Commit(
                            id=str(uuid.uuid4()),
                            project_id=project_id,
                            commit_hash=commit_result["commit_hash"],
                            message=commit_message,
                            author="AI Assistant",
                            created_at=datetime.utcnow()
                        )
                        db.add(commit)
                        db.commit()
                        
                        await manager.send_message(project_id, {
                            "type": "commit",
                            "data": {
                                "commit_hash": commit_result["commit_hash"],
                                "message": commit_message,
                                "files_changed": commit_result.get("files_changed", 0)
                            }
                        })
                except Exception as e:
                    ui.warning(f"Commit failed: {e}", "ACT")

            preview_url = await ensure_preview_ready(
                project_id,
                project_repo_path,
                db,
                session.id,
                conversation_id,
            )

            # Update session status only (no success message to user)
            session.status = "completed"
            session.completed_at = datetime.utcnow()

            # ★ NEW: Mark UserRequest as completed successfully
            if request_id:
                user_request = db.query(UserRequest).filter(UserRequest.id == request_id).first()
                if user_request:
                    user_request.is_completed = True
                    user_request.is_successful = True
                    user_request.completed_at = datetime.utcnow()
                    user_request.result_metadata = {
                        "stage": "completed",
                        "cli_used": result.get("cli_used"),
                        "has_changes": result.get("has_changes", False),
                        "files_modified": result.get("files_modified", []),
                        "preview_url": preview_url,
                    }
                    ui.success(f"UserRequest {request_id[:8]}... marked as completed", "ACT")
                else:
                    ui.warning(f"UserRequest {request_id[:8]}... not found for completion", "ACT")
            
        else:
            # Error message
            error_msg = Message(
                id=str(uuid.uuid4()),
                project_id=project_id,
                role="assistant",
                message_type="error",
                content=result.get("error", "Failed to execute instruction") if result else "No CLI available",
                metadata_json={
                    "type": "act_error",
                    "cli_attempted": cli_preference.value
                },
                conversation_id=conversation_id,
                session_id=session.id,
                created_at=datetime.utcnow()
            )
            db.add(error_msg)
            
            session.status = "failed"
            session.error = result.get("error") if result else "No CLI available"
            session.completed_at = datetime.utcnow()
            
            # ★ NEW: Mark UserRequest as completed with failure
            if request_id:
                user_request = db.query(UserRequest).filter(UserRequest.id == request_id).first()
                if user_request:
                    user_request.is_completed = True
                    user_request.is_successful = False
                    user_request.completed_at = datetime.utcnow()
                    user_request.error_message = result.get("error") if result else "No CLI available"
                    user_request.result_metadata = {
                        "stage": "failed",
                        "cli_attempted": cli_preference.value,
                        "error": result.get("error") if result else "No CLI available",
                    }
                    ui.warning(f"UserRequest {request_id[:8]}... marked as failed", "ACT")
                else:
                    ui.warning(f"UserRequest {request_id[:8]}... not found for failure marking", "ACT")
            
            # Send error message via WebSocket
            error_data = {
                "id": error_msg.id,
                "role": "assistant",
                "message_type": "error",
                "content": error_msg.content,
                "metadata": error_msg.metadata_json,
                "parent_message_id": None,
                "session_id": session.id,
                "conversation_id": conversation_id
            }
            await manager.broadcast_to_project(project_id, {
                "type": "message",
                "data": error_data,
                "timestamp": error_msg.created_at.isoformat()
            })
        
        try:
            db.commit()
            ui.success(f"Database commit successful for request {request_id[:8] if request_id else 'unknown'}...", "ACT")
        except Exception as commit_error:
            ui.error(f"Database commit failed: {commit_error}", "ACT")
            db.rollback()
            raise
        
        # Send act_complete event to clear loading indicator and notify completion
        await manager.broadcast_to_project(project_id, {
            "type": "act_complete",
            "data": {
                "status": session.status,
                "session_id": session.id,
                "request_id": request_id
            }
        })
        
    except Exception as e:
        ui.error(f"Execution error: {e}", "ACT")
        import traceback
        ui.error(f"Traceback: {traceback.format_exc()}", "ACT")
        
        # Save error
        session.status = "failed"
        session.error = str(e)
        session.completed_at = datetime.utcnow()
        
        # ★ NEW: Mark UserRequest as failed due to exception
        if request_id:
            user_request = db.query(UserRequest).filter(UserRequest.id == request_id).first()
            if user_request:
                user_request.is_completed = True
                user_request.is_successful = False
                user_request.completed_at = datetime.utcnow()
                user_request.error_message = str(e)
        
        error_msg = Message(
            id=str(uuid.uuid4()),
            project_id=project_id,
            role="assistant",
            message_type="error",
            content=f"Execution failed: {str(e)}",
            metadata_json={"type": "act_error"},
            conversation_id=conversation_id,
            session_id=session.id,
            created_at=datetime.utcnow()
        )
        db.add(error_msg)
        db.commit()
        
        # Send act_complete event even on failure to clear loading indicator
        await manager.broadcast_to_project(project_id, {
            "type": "act_complete",
            "data": {
                "status": "failed",
                "session_id": session.id,
                "request_id": request_id,
                "error": str(e)
            }
        })


@router.post("/{project_id}/act", response_model=ActResponse)
async def run_act(
    project_id: str,
    body: ActRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_generation_user),
):
    """Execute an ACT instruction immediately without generating a requirement doc."""
    instruction_text = body.instruction.strip()
    ui.info(f"Incoming instruction: {instruction_text[:80]}...", "ACT")

    if not instruction_text:
        raise HTTPException(status_code=400, detail="指令内容不能为空")

    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pending_request = get_active_request(db, project_id)

    if pending_request:
        raise HTTPException(status_code=409, detail="已有任务正在执行，请等待完成后再提交新的指令")

    conversation_id = body.conversation_id or str(uuid.uuid4())

    image_payloads: List[Dict[str, Any]] = []
    image_paths: List[str] = []
    attachments: List[Dict[str, str]] = []

    import os as _os  # Local import to avoid circular dependency surprises

    for img in body.images:
        img_dict = img.dict() if isinstance(img, ImageAttachment) else dict(img)
        image_payloads.append(img_dict)
        path_value = img_dict.get("path")
        name_value = img_dict.get("name")
        if path_value:
            image_paths.append(path_value)
            try:
                filename = _os.path.basename(path_value)
                if filename.strip():
                    attachments.append(
                        {
                            "name": name_value or filename,
                            "url": f"/api/assets/{project_id}/{filename}",
                        }
                    )
            except Exception as exc:  # noqa: BLE001 - continue processing other attachments
                ui.warning(f"Failed to process image path {path_value}: {exc}", "ACT")
        elif name_value:
            image_paths.append(name_value)

    # Optionally: plan then generate in one step
    if body.plan_then_generate:
        try:
            import os
            from openai import OpenAI

            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise RuntimeError("缺少 OPENAI_API_KEY 环境变量")

            client = OpenAI(api_key=api_key)
            model_name = os.getenv("OPENAI_PLANNING_MODEL", "gpt-4o-mini")

            system_plan_prompt = (
                "你是资深全栈架构师。先输出‘详细执行方案’，然后我们会立即进入代码生成。\n"
                "方案需覆盖：页面/路由、组件拆分、状态与数据结构、样式与依赖、接口与集成、文件结构建议、假设与未定项、风险与测试要点。\n"
                "保持结构化分节，清晰易确认。"
            )

            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_plan_prompt},
                    {"role": "user", "content": instruction_text},
                ],
                temperature=0.2,
            )
            plan_text = completion.choices[0].message.content or "(规划生成失败)"
        except Exception as e:
            ui.error(f"Planning generation failed before ACT: {e}", "ACT")
            plan_text = f"❗ 规划生成失败：{e}"

        # Save assistant planning message (so用户能看到规划文本), before code execution
        planning_msg = Message(
            id=str(uuid.uuid4()),
            project_id=project_id,
            role="assistant",
            message_type="chat",
            content=plan_text,
            metadata_json={
                "type": "planning_result",
                "planning": True,
                "combined": True
            },
            conversation_id=conversation_id,
            created_at=datetime.utcnow(),
        )
        db.add(planning_msg)
        db.commit()

        await manager.send_message(
            project_id,
            {
                "type": "message",
                "data": {
                    "id": planning_msg.id,
                    "role": planning_msg.role,
                    "message_type": planning_msg.message_type,
                    "content": planning_msg.content,
                    "metadata_json": planning_msg.metadata_json,
                    "parent_message_id": None,
                    "session_id": None,
                    "conversation_id": conversation_id,
                    "created_at": planning_msg.created_at.isoformat(),
                },
                "timestamp": planning_msg.created_at.isoformat(),
            },
        )

        # Append the plan to instruction to guide the one-shot generation
        instruction_text = (
            f"{instruction_text}\n\n<CONFIRMED_PLAN>\n{plan_text}\n</CONFIRMED_PLAN>\n"
        )

    message_content = instruction_text
    if image_paths:
        refs = [f"Image #{idx + 1} path: {path}" for idx, path in enumerate(image_paths)]
        message_content = f"{instruction_text}\n\n{chr(10).join(refs)}"

    cli_preference = CLIType(body.cli_preference or project.preferred_cli or "remote")
    fallback_enabled = body.fallback_enabled if body.fallback_enabled is not None else project.fallback_enabled
    if fallback_enabled is None:
        fallback_enabled = True

    user_message = Message(
        id=str(uuid.uuid4()),
        project_id=project_id,
        role="user",
        message_type="chat",
        content=message_content,
        metadata_json={
            "type": "act_instruction",
            "cli_preference": cli_preference.value,
            "fallback_enabled": fallback_enabled,
            "has_images": len(body.images) > 0,
            "image_paths": image_paths,
            "attachments": attachments,
        },
        conversation_id=conversation_id,
        created_at=datetime.utcnow(),
    )
    db.add(user_message)

    session = ChatSession(
        id=str(uuid.uuid4()),
        project_id=project_id,
        status="active",
        instruction=instruction_text,
        cli_type=cli_preference.value,
        started_at=datetime.utcnow(),
    )
    db.add(session)

    request_id = str(uuid.uuid4())
    metadata = {
        "stage": "executing",
        "conversation_id": conversation_id,
        "image_payloads": image_payloads,
        "attachments": attachments,
        "cli_preference": cli_preference.value,
        "fallback_enabled": fallback_enabled,
        "is_initial_prompt": body.is_initial_prompt,
    }
    user_request = UserRequest(
        id=request_id,
        project_id=project_id,
        user_message_id=user_message.id,
        session_id=session.id,
        instruction=instruction_text,
        request_type="act",
        created_at=datetime.utcnow(),
        result_metadata=metadata,
        started_at=datetime.utcnow(),
    )
    db.add(user_request)

    points_service = PointsService(db)
    act_cost = points_service.get_usage_cost("act_execution")
    if user and act_cost > 0:
        try:
            points_service.consume(
                user,
                act_cost,
                reason="act_execution",
                description=f"指令执行：{project.name}",
                metadata={
                    "project_id": project_id,
                    "instruction_preview": instruction_text[:120],
                },
            )
        except InsufficientPointsError:
            db.rollback()
            raise HTTPException(status_code=402, detail="积分不足，无法执行指令")

    try:
        db.commit()
    except Exception as exc:
        ui.error(f"Failed to persist new request: {exc}", "ACT")
        db.rollback()
        raise

    await manager.send_message(
        project_id,
        {
            "type": "message",
            "data": {
                "id": user_message.id,
                "role": user_message.role,
                "message_type": user_message.message_type,
                "content": user_message.content,
                "metadata_json": user_message.metadata_json,
                "parent_message_id": None,
                "session_id": session.id,
                "conversation_id": conversation_id,
                "request_id": request_id,
                "created_at": user_message.created_at.isoformat(),
            },
            "timestamp": user_message.created_at.isoformat(),
        },
    )

    await manager.broadcast_to_project(
        project_id,
        {
            "type": "act_stage",
            "data": {
                "request_id": request_id,
                "stage": "executing",
            },
        },
    )

    project_info = {
        "id": project.id,
        "repo_path": project.repo_path,
        "preferred_cli": project.preferred_cli or "remote",
        "fallback_enabled": project.fallback_enabled if project.fallback_enabled is not None else True,
        "selected_model": project.selected_model,
    }

    image_payload_objs = [ImageAttachment(**payload) for payload in image_payloads]

    background_tasks.add_task(
        execute_act_task,
        project_info,
        session,
        instruction_text,
        conversation_id,
        image_payload_objs,
        db,
        cli_preference,
        fallback_enabled,
        body.is_initial_prompt,
        request_id,
    )

    return ActResponse(
        session_id=session.id,
        conversation_id=conversation_id,
        status="running",
        message="Act execution started",
    )


@router.post("/{project_id}/chat", response_model=ActResponse)
async def run_chat(
    project_id: str,
    body: ActRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_generation_user),
):
    """Chat endpoint: supports planning-only (no code writes) on first step, or regular chat via ACT pipeline."""

    # Planning-only branch: generate a detailed execution plan text, without invoking CLI or making file edits
    if body.is_planning:
        instruction_text = body.instruction.strip()
        if not instruction_text:
            raise HTTPException(status_code=400, detail="指令内容不能为空")

        project = db.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        conversation_id = body.conversation_id or str(uuid.uuid4())

        # Save the user message
        user_message = Message(
            id=str(uuid.uuid4()),
            project_id=project_id,
            role="user",
            message_type="chat",
            content=instruction_text,
            metadata_json={
                "type": "planning_request"
            },
            conversation_id=conversation_id,
            created_at=datetime.utcnow(),
        )
        db.add(user_message)
        db.commit()

        # Generate plan using OpenAI (default model) - text only, no tools
        try:
            import os
            from openai import OpenAI

            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise RuntimeError("缺少 OPENAI_API_KEY 环境变量")

            client = OpenAI(api_key=api_key)
            model_name = os.getenv("OPENAI_PLANNING_MODEL", "gpt-4o-mini")

            system_plan_prompt = (
                "你是资深全栈架构师。当前阶段只输出‘详细执行方案’，不要做任何代码修改。\n"
                "请结构化给出：页面与路由、组件拆分、状态与数据结构、样式与依赖、接口与集成、文件结构建议、边界与假设、风险与测试要点。\n"
                "输出清晰分节，便于确认；不要请求进一步澄清，不要提示下一步操作。"
            )

            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_plan_prompt},
                    {"role": "user", "content": instruction_text},
                ],
                temperature=0.2,
            )
            plan_text = completion.choices[0].message.content or "(规划生成失败)"
        except Exception as e:
            ui.error(f"Planning generation failed: {e}", "CHAT")
            plan_text = f"❗ 规划生成失败：{e}"

        # Save assistant planning message
        plan_message = Message(
            id=str(uuid.uuid4()),
            project_id=project_id,
            role="assistant",
            message_type="chat",
            content=plan_text,
            metadata_json={
                "type": "planning_result",
                "planning": True
            },
            conversation_id=conversation_id,
            created_at=datetime.utcnow(),
        )
        db.add(plan_message)
        db.commit()

        # Push via WebSocket
        await manager.send_message(
            project_id,
            {
                "type": "message",
                "data": {
                    "id": plan_message.id,
                    "role": plan_message.role,
                    "message_type": plan_message.message_type,
                    "content": plan_message.content,
                    "metadata_json": plan_message.metadata_json,
                    "parent_message_id": None,
                    "session_id": None,
                    "conversation_id": conversation_id,
                    "created_at": plan_message.created_at.isoformat(),
                },
                "timestamp": plan_message.created_at.isoformat(),
            },
        )

        # Return a lightweight response (no running session for planning)
        return ActResponse(
            session_id="",
            conversation_id=conversation_id,
            status="completed",
            message="Planning generated",
        )

    # Default: use ACT two-stage pipeline
    return await run_act(project_id, body, background_tasks, db, user)
