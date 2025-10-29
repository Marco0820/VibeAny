"""Endpoints for managing user point balances."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.users import User
from app.services.points_service import (
    DEFAULT_USAGE_COSTS,
    InsufficientPointsError,
    PointsService,
)


router = APIRouter()


class RechargeRequest(BaseModel):
    package_id: str = Field(..., description="套餐 ID，例如 starter/creator/studio")


class ConsumeRequest(BaseModel):
    points: int = Field(..., gt=0, description="需要消耗的积分数")
    reason: str = Field(..., max_length=64, description="积分消耗原因标识")
    description: Optional[str] = Field(None, max_length=255, description="可选的人类可读描述")
    metadata: Optional[dict] = Field(default=None, description="可选的附加元数据")


@router.get("/plans")
def list_recharge_plans(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取积分充值套餐列表（需登录用于个性化推荐）。"""

    service = PointsService(db)
    return {
        "plans": service.get_packages(),
        "usage_costs": DEFAULT_USAGE_COSTS,
        "balance": user.points,
    }


@router.get("/balance")
def get_balance(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """返回当前用户的积分余额与累积统计。"""

    service = PointsService(db)
    return {
        "summary": service.get_summary(user),
        "usage_costs": DEFAULT_USAGE_COSTS,
    }


@router.get("/history")
def get_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """分页返回积分流水记录。"""

    service = PointsService(db)
    history = service.get_history(user, limit=limit, offset=offset)
    return {
        "items": [tx.to_dict() for tx in history],
        "limit": limit,
        "offset": offset,
    }


@router.post("/recharge")
def recharge_points(
    payload: RechargeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """充值积分，立即生效（模拟支付成功后的入账）。"""

    service = PointsService(db)
    try:
        transaction = service.recharge(user, payload.package_id)
    except ValueError as exc:  # 未知套餐
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "transaction": transaction.to_dict(),
        "summary": service.get_summary(user),
    }


@router.post("/consume")
def consume_points(
    payload: ConsumeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """消耗积分，常用于调用付费服务或创建资源。"""

    service = PointsService(db)
    try:
        transaction = service.consume(
            user,
            payload.points,
            reason=payload.reason,
            description=payload.description,
            metadata=payload.metadata,
        )
    except InsufficientPointsError:
        raise HTTPException(status_code=402, detail="积分不足，请先充值")

    return {
        "transaction": transaction.to_dict(),
        "summary": service.get_summary(user),
    }
