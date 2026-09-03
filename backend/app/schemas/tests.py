from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

class TestCreate(BaseModel):
    test_type: str
    parameter_name: str
    expected_value: float
    actual_value: float
    unit: str
    tolerance_margin: float
    remarks: Optional[str] = None

class TestResponse(BaseModel):
    id: UUID
    application_id: UUID
    test_type: str
    parameter_name: Optional[str]
    standard_value: float
    observed_value: float
    calculated_error: float
    unit: Optional[str]
    tolerance_margin: Optional[float]
    automated_result: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
