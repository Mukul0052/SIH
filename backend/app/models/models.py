import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean, Date, DateTime, 
    ForeignKey, Text, Enum, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base

class UserRole(str, enum.Enum):
    owner = 'owner'
    lmo = 'lmo'
    gatc = 'gatc'
    admin = 'admin'
    regulatory = 'regulatory'

class UserStatus(str, enum.Enum):
    pending_approval = 'pending_approval'
    active = 'active'
    suspended = 'suspended'

class ApplicationStatus(str, enum.Enum):
    draft = 'draft'
    submitted = 'submitted'
    under_review = 'under_review'
    scheduled = 'scheduled'
    assigned = 'assigned'
    inspection_pending = 'inspection_pending'
    testing_in_progress = 'testing_in_progress'
    results_submitted = 'results_submitted'
    approved = 'approved'
    rejected = 'rejected'
    certificate_generated = 'certificate_generated'
    closed = 'closed'

class VerificationType(str, enum.Enum):
    initial = 'initial'
    re_verification = 're_verification'

class AutomatedResult(str, enum.Enum):
    PASS = 'PASS'
    FAIL = 'FAIL'
    WARNING = 'WARNING'
    REVIEW_REQUIRED = 'REVIEW_REQUIRED'

class FinalDecision(str, enum.Enum):
    approved = 'approved'
    rejected = 'rejected'

class NotificationChannel(str, enum.Enum):
    in_app = 'in_app'
    email = 'email'
    sms = 'sms'

class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20))
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.active)
    organization = Column(String(255))
    jurisdiction = Column(String(100))
    employee_or_license_ref = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class InstrumentCategory(Base):
    __tablename__ = 'instrument_categories'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(150), unique=True, nullable=False)
    default_validity_months = Column(Integer, nullable=False, default=12)

class Instrument(Base):
    __tablename__ = 'instruments'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    serial_number = Column(String(100), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey('instrument_categories.id'), nullable=False)
    type = Column(String(150))
    manufacturer = Column(String(200))
    model = Column(String(150))
    capacity = Column(Numeric(12, 3))
    capacity_unit = Column(String(20))
    accuracy_class = Column(String(20))
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    location_address = Column(Text)
    gps_lat = Column(Numeric(9, 6))
    gps_lng = Column(Numeric(9, 6))
    previous_certificate_id = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    category = relationship("InstrumentCategory")
    owner = relationship("User")

class JurisdictionConfig(Base):
    __tablename__ = 'jurisdiction_config'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jurisdiction = Column(String(100), unique=True, nullable=False)
    gatc_approval_routes_to = Column(String(20), nullable=False, default='lmo')

class Application(Base):
    __tablename__ = 'applications'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_number = Column(String(30), unique=True, nullable=False)
    instrument_id = Column(UUID(as_uuid=True), ForeignKey('instruments.id'), nullable=False)
    applicant_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    verification_type = Column(Enum(VerificationType), nullable=False)
    status = Column(Enum(ApplicationStatus), nullable=False, default=ApplicationStatus.draft)
    jurisdiction = Column(String(100))
    submission_date = Column(DateTime(timezone=True))
    scheduled_date = Column(DateTime(timezone=True))
    assigned_officer_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    assigned_officer_role = Column(Enum(UserRole))
    final_decision = Column(Enum(FinalDecision))
    decided_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    decided_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    instrument = relationship("Instrument")
    applicant = relationship("User", foreign_keys=[applicant_id])
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id])

class Rule(Base):
    __tablename__ = 'rules'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey('instrument_categories.id'), nullable=False)
    version = Column(Integer, nullable=False)
    effective_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    procedure_reference = Column(String(255))
    test_type = Column(String(150), nullable=False)
    calculation_formula = Column(String(50), nullable=False, default='observed_minus_standard')
    permissible_limits = Column(JSONB, nullable=False)
    warning_multiplier = Column(Numeric(4, 2), nullable=False, default=1.0)
    legal_source_reference = Column(String(255))
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Test(Base):
    __tablename__ = 'tests'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey('applications.id'), nullable=False)
    rule_id = Column(UUID(as_uuid=True), ForeignKey('rules.id'), nullable=True)
    test_type = Column(String(150), nullable=False)
    parameter_name = Column(String(255))
    unit = Column(String(50))
    tolerance_margin = Column(Numeric(14, 4))
    standard_value = Column(Numeric(14, 4))
    observed_value = Column(Numeric(14, 4))
    calculated_error = Column(Numeric(14, 4))
    automated_result = Column(Enum(AutomatedResult))
    remarks = Column(Text)
    entered_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Certificate(Base):
    __tablename__ = 'certificates'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    certificate_number = Column(String(40), unique=True, nullable=False)
    application_id = Column(UUID(as_uuid=True), ForeignKey('applications.id'), unique=True, nullable=False)
    qr_token = Column(String(64), unique=True, nullable=False)
    issue_date = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default='active')
    signature_payload = Column(JSONB, nullable=False)
    signature_value = Column(Text, nullable=False)
    pdf_storage_ref = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Evidence(Base):
    __tablename__ = 'evidence'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey('applications.id'), nullable=False)
    test_id = Column(UUID(as_uuid=True), ForeignKey('tests.id'))
    file_type = Column(String(50))
    storage_ref = Column(String(500), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    action = Column(String(100), nullable=False)
    entity = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    old_value = Column(JSONB)
    new_value = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    type = Column(String(50), nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    related_entity = Column(String(50))
    related_id = Column(UUID(as_uuid=True))
    status = Column(String(20), nullable=False, default='pending')
    sent_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
