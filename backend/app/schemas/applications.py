from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.models import ApplicationStatus, VerificationType, UserRole

class ApplicationCreate(BaseModel):
    instrument_id: UUID
    verification_type: VerificationType

class ApplicationResponse(BaseModel):
    id: UUID
    application_number: str
    instrument_id: UUID
    applicant_id: UUID
    verification_type: VerificationType
    status: ApplicationStatus
    jurisdiction: Optional[str] = None
    submission_date: Optional[datetime] = None
    scheduled_date: Optional[datetime] = None
    assigned_officer_id: Optional[UUID] = None
    assigned_officer_role: Optional[UserRole] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ScheduleRequest(BaseModel):
    scheduled_date: datetime
    jurisdiction: str

class AssignRequest(BaseModel):
    officer_id: UUID
    officer_role: UserRole

class ReassignRequest(AssignRequest):
    reason: str

class DecisionRequest(BaseModel):
    decision: str # 'approved' or 'rejected'
    remarks: Optional[str] = None
