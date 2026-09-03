from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Dict, Optional

from app.db.session import get_db
from app.models.models import AuditLog, Application, Instrument, User, UserRole
from app.core.security import get_current_user, UserPayload, require_role
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID

router = APIRouter()

class AuditLogResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    action: str
    entity: str
    entity_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SystemMetrics(BaseModel):
    total_users: int
    total_instruments: int
    total_applications: int
    applications_by_status: Dict[str, int]

@router.get("/metrics", response_model=SystemMetrics)
async def get_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(require_role([UserRole.admin.value]))
):
    users_count = await db.scalar(select(func.count(User.id)))
    instruments_count = await db.scalar(select(func.count(Instrument.id)))
    apps_count = await db.scalar(select(func.count(Application.id)))
    
    status_counts_result = await db.execute(
        select(Application.status, func.count(Application.id)).group_by(Application.status)
    )
    # The status is an enum, we use `.value` or string format
    status_counts = {getattr(status, 'value', str(status)): count for status, count in status_counts_result.all()}
    
    return SystemMetrics(
        total_users=users_count or 0,
        total_instruments=instruments_count or 0,
        total_applications=apps_count or 0,
        applications_by_status=status_counts
    )

@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(require_role([UserRole.admin.value]))
):
    result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100))
    return result.scalars().all()
