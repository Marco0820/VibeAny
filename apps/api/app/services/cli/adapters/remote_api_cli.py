"""Remote GPT-5 API CLI adapter.

This adapter replaces local CLI tooling by forwarding instructions to an
external HTTP API (e.g. OpenAI GPT-5). The remote service is expected to
return a structured payload that describes code changes to apply to the local
repository.
"""
from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, Iterable, List, Optional

import httpx

from app.core.config import settings
from app.core.terminal_ui import ui
from app.models.messages import Message

from ..base import BaseCLI, CLIType


class RemoteAPICLI(BaseCLI):
    """Adapter that invokes a remote GPT-5 powered API for code generation."""

    def __init__(self, db_session=None):
        super().__init__(CLIType.REMOTE)
        self.db_session = db_session
        self._session_store: dict[str, str] = {}

    async def check_availability(self) -> Dict[str, Any]:
        """Verify remote API credentials/config are present and reachable."""
        if not settings.gpt5_api_key:
            return {
                "available": False,
                "configured": False,
                "error": "Missing GPT5_API_KEY",
            }
        if not settings.gpt5_api_base:
            return {
                "available": False,
                "configured": False,
                "error": "Missing GPT5_API_BASE",
            }

        default_model = settings.gpt5_model or "gpt-5"

        if settings.gpt5_health_url:
            try:
                async with httpx.AsyncClient(timeout=settings.gpt5_timeout) as client:
                    response = await client.get(
                        settings.gpt5_health_url,
                        headers=self._auth_headers(),
                    )
                    response.raise_for_status()
            except Exception as exc:
                return {
                    "available": False,
                    "configured": True,
                    "error": f"Remote API health check failed: {exc}",
                }

        return {
            "available": True,
            "configured": True,
            "models": [default_model],
            "default_models": [default_model],
        }

    async def execute_with_streaming(
        self,
        instruction: str,
        project_path: str,
        session_id: Optional[str] = None,
        log_callback: Optional[Any] = None,  # Unused but kept for signature parity
        images: Optional[List[Dict[str, Any]]] = None,
        model: Optional[str] = None,
        is_initial_prompt: bool = False,
    ) -> AsyncGenerator[Message, None]:
        """Send instruction to remote GPT-5 API and apply returned operations."""
        if not settings.gpt5_api_key or not settings.gpt5_api_base:
            raise RuntimeError("Remote API is not configured (missing API key or base URL)")

        repo_path = self._resolve_repo_path(project_path)
        context = await self._collect_project_context(repo_path)
        payload = self._build_request_payload(
            instruction=instruction,
            model=model or settings.gpt5_model or "gpt-5",
            context=context,
            session_id=session_id,
            is_initial_prompt=is_initial_prompt,
            images=images or [],
        )

        ui.info("Dispatching instruction to remote GPT-5 API", "RemoteCLI")

        async with httpx.AsyncClient(timeout=settings.gpt5_timeout) as client:
            response = await client.post(
                settings.gpt5_endpoint_url,
                headers=self._auth_headers(),
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        summary = data.get("summary") or "Remote execution completed."
        operations = data.get("operations", [])
        followups = data.get("followups", [])
        remote_session_id = data.get("session_id")

        if remote_session_id:
            await self.set_session_id(project_path, remote_session_id)

        applied_ops: List[str] = []
        for op in operations:
            result = await self._apply_operation(repo_path, op)
            applied_ops.append(result)

        # Yield informational logs first
        if applied_ops:
            yield Message(
                id=self._new_message_id(),
                project_id=project_path,
                role="assistant",
                message_type="info",
                content="\n".join(applied_ops),
                metadata_json={
                    "cli_type": self.cli_type.value,
                    "kind": "operations_log",
                },
            )

        if followups:
            for followup in followups:
                yield Message(
                    id=self._new_message_id(),
                    project_id=project_path,
                    role="assistant",
                    message_type="assistant",
                    content=followup,
                    metadata_json={
                        "cli_type": self.cli_type.value,
                        "kind": "followup",
                    },
                )

        yield Message(
            id=self._new_message_id(),
            project_id=project_path,
            role="assistant",
            message_type="assistant",
            content=summary,
            metadata_json={
                "cli_type": self.cli_type.value,
                "kind": "summary",
            },
        )

    async def get_session_id(self, project_id: str) -> Optional[str]:
        if self.db_session:
            return self._session_store.get(project_id)
        return self._session_store.get(project_id)

    async def set_session_id(self, project_id: str, session_id: str) -> None:
        self._session_store[project_id] = session_id

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _auth_headers(self) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {settings.gpt5_api_key}",
            "Content-Type": "application/json",
        }
        if settings.gpt5_additional_headers:
            headers.update(settings.gpt5_additional_headers)
        return headers

    def _resolve_repo_path(self, project_path: str) -> str:
        repo_candidate = Path(project_path) / "repo"
        if repo_candidate.exists():
            return str(repo_candidate)
        return project_path

    async def _collect_project_context(self, repo_path: str) -> Dict[str, Any]:
        """Collect lightweight project context for the remote API."""
        repo = Path(repo_path)
        files: List[str] = []
        for rel_path in self._iter_project_files(repo):
            files.append(rel_path)
            if len(files) >= settings.gpt5_context_file_limit:
                break

        important_snippets: Dict[str, str] = {}
        for candidate in settings.gpt5_context_files:
            file_path = repo / candidate
            if file_path.exists() and file_path.is_file():
                try:
                    important_snippets[candidate] = file_path.read_text(encoding="utf-8")[: settings.gpt5_context_snippet_limit]
                except Exception:
                    continue

        return {
            "files": files,
            "snippets": important_snippets,
        }

    def _iter_project_files(self, repo: Path) -> Iterable[str]:
        ignore_dirs = {".git", "node_modules", ".next", "__pycache__"}
        for path in repo.rglob("*"):
            if path.is_dir():
                if path.name in ignore_dirs:
                    path.skip = True
                continue
            if any(part in ignore_dirs for part in path.parts):
                continue
            rel = path.relative_to(repo)
            yield str(rel)

    def _build_request_payload(
        self,
        instruction: str,
        model: str,
        context: Dict[str, Any],
        session_id: Optional[str],
        is_initial_prompt: bool,
        images: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        return {
            "model": model,
            "instruction": instruction,
            "context": context,
            "session_id": session_id,
            "is_initial_prompt": is_initial_prompt,
            "images": images,
            "system_prompt": settings.gpt5_system_prompt,
            "options": {
                "apply_patch": True,
                "return_summary": True,
            },
        }

    async def _apply_operation(self, repo_path: str, operation: Dict[str, Any]) -> str:
        op_type = operation.get("type")
        if op_type == "write_file":
            path = operation.get("path")
            content = operation.get("content", "")
            if not path:
                return "⚠️ write_file without path skipped"
            full_path = Path(repo_path) / path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding="utf-8")
            return f"✏️ Wrote {path}"

        if op_type == "delete_file":
            path = operation.get("path")
            if not path:
                return "⚠️ delete_file without path skipped"
            full_path = Path(repo_path) / path
            if full_path.exists():
                full_path.unlink()
                return f"🗑️ Deleted {path}"
            return f"ℹ️ delete_file skipped (missing {path})"

        if op_type == "apply_patch":
            patch = operation.get("patch", "")
            if not patch.strip():
                return "⚠️ apply_patch skipped (empty patch)"
            await self._run_patch(repo_path, patch)
            return "🪄 Applied patch"

        if op_type == "run_command":
            command = operation.get("command")
            if not command:
                return "⚠️ run_command skipped (empty command)"
            await self._run_command(repo_path, command)
            return f"💻 Ran command: {command}"

        return f"⚠️ Unknown operation type: {op_type}"

    async def _run_patch(self, repo_path: str, patch: str) -> None:
        process = await asyncio.create_subprocess_exec(
            "patch",
            "-p1",
            cwd=repo_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate(input=patch.encode("utf-8"))
        if process.returncode != 0:
            ui.error(
                f"patch command failed: {stderr.decode() or stdout.decode()}",
                "RemoteCLI",
            )
            raise RuntimeError(f"patch command failed: {stderr.decode() or stdout.decode()}")

    async def _run_command(self, repo_path: str, command: str) -> None:
        process = await asyncio.create_subprocess_shell(
            command,
            cwd=repo_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            ui.error(
                f"Command failed ({command}): {stderr.decode() or stdout.decode()}",
                "RemoteCLI",
            )
            raise RuntimeError(f"Command failed: {command}")

    @staticmethod
    def _new_message_id() -> str:
        return os.urandom(16).hex()
