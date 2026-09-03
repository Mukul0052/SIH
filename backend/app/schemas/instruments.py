from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime
import re

VALID_ACCURACY_CLASSES = ['Class I', 'Class II', 'Class III', 'Class IV']
VALID_UNITS = ['mg', 'g', 'kg', 't', 'L', 'mL', 'kL']

class InstrumentCreate(BaseModel):
    serial_number: str
    category_id: UUID
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    capacity: Optional[float] = None
    capacity_unit: Optional[str] = 'kg'
    accuracy_class: Optional[str] = 'Class III'
    location_address: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None

    @field_validator('serial_number')
    @classmethod
    def validate_serial(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 50:
            raise ValueError('Serial number must be 3–50 characters.')
        if not re.match(r'^[A-Za-z0-9\-_/]+$', v):
            raise ValueError('Serial number can only contain letters, digits, hyphens, underscores, and slashes.')
        return v

    @field_validator('accuracy_class')
    @classmethod
    def validate_accuracy(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_ACCURACY_CLASSES:
            raise ValueError(f'Accuracy class must be one of: {", ".join(VALID_ACCURACY_CLASSES)}')
        return v

    @field_validator('capacity')
    @classmethod
    def validate_capacity(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError('Capacity must be a positive number.')
        return v

    @field_validator('capacity_unit')
    @classmethod
    def validate_unit(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_UNITS:
            raise ValueError(f'Unit must be one of: {", ".join(VALID_UNITS)}')
        return v

    @field_validator('gps_lat')
    @classmethod
    def validate_lat(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < -90 or v > 90):
            raise ValueError('Latitude must be between -90 and 90.')
        return v

    @field_validator('gps_lng')
    @classmethod
    def validate_lng(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < -180 or v > 180):
            raise ValueError('Longitude must be between -180 and 180.')
        return v

class InstrumentResponse(InstrumentCreate):
    id: UUID
    owner_id: UUID
    previous_certificate_id: Optional[UUID] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
