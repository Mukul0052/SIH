from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from uuid import UUID
from datetime import date, datetime

class CertificateCreate(BaseModel):
    application_id: UUID

class CertificateResponse(BaseModel):
    id: UUID
    certificate_number: str
    application_id: UUID
    qr_token: str
    issue_date: date
    valid_until: date
    status: str
    pdf_storage_ref: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
