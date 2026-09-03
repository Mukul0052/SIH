from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
from typing import List
import logging
import uuid

from app.db.session import get_db
from app.models.models import Instrument, UserRole
from app.schemas.instruments import InstrumentCreate, InstrumentResponse
from app.core.security import get_current_user, UserPayload

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=InstrumentResponse, status_code=status.HTTP_201_CREATED)
async def create_instrument(
    instrument: InstrumentCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(get_current_user)
):
    new_instrument = Instrument(
        **instrument.model_dump(),
        owner_id=uuid.UUID(current_user.id)  # Ensure UUID type
    )
    db.add(new_instrument)
    try:
        await db.commit()
        await db.refresh(new_instrument)
        return new_instrument
    except IntegrityError as e:
        await db.rollback()
        error_str = str(e.orig)
        if "serial_number" in error_str or "duplicate" in error_str.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Instrument with this serial number already registered to you."
            )
        if "category" in error_str or "foreign key" in error_str.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid instrument category. Please contact admin."
            )
        logger.error(f"IntegrityError creating instrument: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database error: {error_str}"
        )

@router.get("/", response_model=List[InstrumentResponse])
async def list_instruments(
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(get_current_user)
):
    logger.info(f"Listing instruments for user: id={current_user.id}, role={current_user.role}")
    
    # First, let's check total count for debugging
    count_result = await db.execute(text("SELECT COUNT(*) FROM instruments"))
    total_count = count_result.scalar()
    logger.info(f"Total instruments in DB: {total_count}")
    
    query = select(Instrument)
    if current_user.role == UserRole.owner.value:
        user_uuid = uuid.UUID(current_user.id)
        query = query.where(Instrument.owner_id == user_uuid)
    
    result = await db.execute(query)
    instruments = result.scalars().all()
    logger.info(f"Returning {len(instruments)} instruments for user {current_user.id}")
    return instruments

@router.get("/{id}", response_model=InstrumentResponse)
async def get_instrument(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(get_current_user)
):
    result = await db.execute(select(Instrument).where(Instrument.id == uuid.UUID(id)))
    instrument = result.scalar_one_or_none()
    
    if not instrument:
        raise HTTPException(status_code=404, detail="Instrument not found")
        
    if current_user.role == UserRole.owner.value and str(instrument.owner_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this instrument")
        
    return instrument
