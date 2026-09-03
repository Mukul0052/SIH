from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.models import Application, ApplicationStatus, Instrument, AuditLog, UserRole, FinalDecision, Test, AutomatedResult
from app.schemas.applications import ApplicationCreate, ApplicationResponse, ScheduleRequest, AssignRequest, DecisionRequest
from app.schemas.tests import TestCreate, TestResponse
from app.core.security import get_current_user, UserPayload, require_role
from app.core.rate_limit import limiter

router = APIRouter()

def generate_application_number():
    return f"APP-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

async def log_audit(db: AsyncSession, user_id: str, action: str, entity: str, entity_id: str):
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id
    )
    db.add(log)
    # Don't commit here, let the caller commit the transaction

@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    app_data: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(require_role([UserRole.owner.value]))
):
    # Verify instrument ownership
    result = await db.execute(select(Instrument).where(Instrument.id == app_data.instrument_id))
    instrument = result.scalar_one_or_none()
    
    if not instrument or str(instrument.owner_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Instrument not found or not owned by you.")
        
    new_app = Application(
        application_number=generate_application_number(),
        instrument_id=app_data.instrument_id,
        applicant_id=current_user.id,
        verification_type=app_data.verification_type,
        status=ApplicationStatus.draft
    )
    db.add(new_app)
    await db.flush() # flush to get the id for the audit log
    
    await log_audit(db, current_user.id, 'CREATED', 'Application', new_app.id)
    await db.commit()
    await db.refresh(new_app)
    return new_app

@router.post("/{id}/submit", response_model=ApplicationResponse)
@limiter.limit("5/minute")
async def submit_application(
    request: Request,
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(require_role([UserRole.owner.value]))
):
    from app.models.models import User
    
    result = await db.execute(select(Application).where(Application.id == id, Application.applicant_id == current_user.id))
    app = result.scalar_one_or_none()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    if app.status != ApplicationStatus.draft:
        raise HTTPException(status_code=400, detail="Only draft applications can be submitted.")
        
    # Intelligent Auto-Assignment
    # First, fetch the applicant's jurisdiction
    applicant = await db.get(User, current_user.id)
    app_jurisdiction = app.jurisdiction or applicant.jurisdiction
    
    # Try to find an LMO in the EXACT jurisdiction
    lmo = None
    if app_jurisdiction:
        lmo_result = await db.execute(
            select(User).where(User.role == UserRole.lmo, User.jurisdiction == app_jurisdiction).limit(1)
        )
        lmo = lmo_result.scalar_one_or_none()
    
    # Fallback (Load Balancing): Find ANY LMO with fewest assignments
    if not lmo:
        lmo_result = await db.execute(
            select(User)
            .where(User.role == UserRole.lmo)
            .outerjoin(Application, Application.assigned_officer_id == User.id)
            .group_by(User.id)
            .order_by(func.count(Application.id).asc())
            .limit(1)
        )
        lmo = lmo_result.scalar_one_or_none()
    
    if lmo:
        app.assigned_officer_id = lmo.id
        app.assigned_officer_role = UserRole.lmo
        app.status = ApplicationStatus.assigned
        app.scheduled_date = datetime.now()
    else:
        app.status = ApplicationStatus.submitted
        
    app.submission_date = datetime.utcnow()
    
    await log_audit(db, current_user.id, 'SUBMITTED', 'Application', app.id)
    await db.commit()
    await db.refresh(app)
    return app

@router.get("/", response_model=List[ApplicationResponse])
async def list_applications(
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(get_current_user)
):
    query = select(Application)
    
    if current_user.role == UserRole.owner.value:
        query = query.where(Application.applicant_id == current_user.id)
    elif current_user.role == UserRole.lmo.value:
        # LMO sees their assigned applications
        query = query.where(Application.assigned_officer_id == current_user.id)
    elif current_user.role == UserRole.gatc.value:
        # GATC sees all under_review (escalated), approved and certificate_generated applications
        query = query.where(Application.status.in_([
            ApplicationStatus.under_review, 
            ApplicationStatus.approved,
            ApplicationStatus.certificate_generated
        ]))
        
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{id}/schedule", response_model=ApplicationResponse)
async def schedule_application(
    id: str,
    req: ScheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(require_role([UserRole.admin.value]))
):
    result = await db.execute(select(Application).where(Application.id == id))
    app = result.scalar_one_or_none()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app.status = ApplicationStatus.scheduled
    app.scheduled_date = req.scheduled_date
    app.jurisdiction = req.jurisdiction
    
    await log_audit(db, current_user.id, 'SCHEDULED', 'Application', app.id)
    await db.commit()
    await db.refresh(app)
    return app

@router.post("/{id}/assign", response_model=ApplicationResponse)
async def assign_application(
    id: str,
    req: AssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(require_role([UserRole.admin.value]))
):
    result = await db.execute(select(Application).where(Application.id == id))
    app = result.scalar_one_or_none()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app.status = ApplicationStatus.assigned
    app.assigned_officer_id = req.officer_id
    app.assigned_officer_role = req.officer_role
    
    await log_audit(db, current_user.id, 'ASSIGNED', 'Application', app.id)
    await db.commit()
    return app

@router.post("/{id}/tests", response_model=TestResponse, status_code=status.HTTP_201_CREATED)
async def record_test(
    id: str,
    test_data: TestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(require_role([UserRole.lmo.value, UserRole.gatc.value]))
):
    # Verify assignment
    result = await db.execute(select(Application).where(Application.id == id))
    app = result.scalar_one_or_none()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    if str(app.assigned_officer_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Not assigned to this application.")

    # Calculate pass/fail automatically
    error = abs(test_data.expected_value - test_data.actual_value)
    is_passed = error <= test_data.tolerance_margin

    new_test = Test(
        application_id=app.id,
        test_type=test_data.test_type,
        parameter_name=test_data.parameter_name,
        standard_value=test_data.expected_value,
        observed_value=test_data.actual_value,
        calculated_error=error,
        unit=test_data.unit,
        tolerance_margin=test_data.tolerance_margin,
        automated_result=AutomatedResult.PASS if is_passed else AutomatedResult.FAIL,
        remarks=test_data.remarks,
        entered_by=uuid.UUID(current_user.id)
    )
    db.add(new_test)
    
    # Update application status
    if app.status == ApplicationStatus.assigned or app.status == ApplicationStatus.inspection_pending:
        app.status = ApplicationStatus.testing_in_progress
        
    await log_audit(db, current_user.id, 'TEST_RECORDED', 'Application', app.id)
    await db.commit()
    await db.refresh(new_test)
    return new_test

@router.get("/{id}/tests", response_model=List[TestResponse])
async def list_tests(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(get_current_user)
):
    query = select(Test).where(Test.application_id == id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{id}/finalize-tests", response_model=ApplicationResponse)
async def finalize_tests(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(require_role([UserRole.lmo.value, UserRole.gatc.value]))
):
    result = await db.execute(select(Application).where(Application.id == id))
    app = result.scalar_one_or_none()
    
    if not app or str(app.assigned_officer_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    tests_result = await db.execute(select(Test).where(Test.application_id == id))
    tests = tests_result.scalars().all()
    
    if not tests:
        raise HTTPException(status_code=400, detail="No tests recorded.")

    # Automated Decision Engine
    failures = sum(1 for t in tests if t.automated_result == AutomatedResult.FAIL)
    
    if failures == 0:
        app.final_decision = FinalDecision.approved
        app.status = ApplicationStatus.approved
    elif failures == 1:
        # Flag for GATC review
        app.status = ApplicationStatus.under_review
        # Here we would reassign to GATC in a real flow
    else:
        app.final_decision = FinalDecision.rejected
        app.status = ApplicationStatus.rejected

    app.decided_by = uuid.UUID(current_user.id)
    app.decided_at = datetime.utcnow()

    await log_audit(db, current_user.id, 'TESTS_FINALIZED', 'Application', app.id)
    await db.commit()
    await db.refresh(app)
    return app

@router.post("/{id}/decision", response_model=ApplicationResponse)
async def manual_decision(
    id: str,
    req: DecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(require_role([UserRole.gatc.value, UserRole.admin.value]))
):
    result = await db.execute(select(Application).where(Application.id == id))
    app = result.scalar_one_or_none()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app.final_decision = req.decision
    app.status = ApplicationStatus.approved if req.decision == FinalDecision.approved else ApplicationStatus.rejected
    app.decided_by = uuid.UUID(current_user.id)
    app.decided_at = datetime.utcnow()

    await log_audit(db, current_user.id, 'MANUAL_DECISION', 'Application', app.id)
    await db.commit()
    await db.refresh(app)
    return app
