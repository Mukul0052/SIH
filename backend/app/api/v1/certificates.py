from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, date, timedelta
import uuid
import os
import hashlib
import json

import qrcode
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors

from app.db.session import get_db
from app.models.models import Certificate, Application, ApplicationStatus, UserRole
from app.schemas.certificates import CertificateCreate, CertificateResponse
from app.core.security import get_current_user, UserPayload, require_role
from pydantic import BaseModel, ConfigDict
from app.core.rate_limit import limiter

router = APIRouter()

PDF_DIR = "static/certificates"
os.makedirs(PDF_DIR, exist_ok=True)

def generate_pdf(cert_number: str, qr_token: str, app_id: str, owner_id: str, filepath: str):
    c = canvas.Canvas(filepath, pagesize=letter)
    width, height = letter
    
    # Draw Border
    c.setStrokeColor(colors.HexColor("#004d40"))
    c.setLineWidth(4)
    c.rect(0.5*inch, 0.5*inch, width - 1*inch, height - 1*inch)
    
    c.setStrokeColor(colors.HexColor("#004d40"))
    c.setLineWidth(1)
    c.rect(0.6*inch, 0.6*inch, width - 1.2*inch, height - 1.2*inch)

    # Header
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(colors.HexColor("#004d40"))
    c.drawCentredString(width/2, height - 1.5*inch, "GOVERNMENT OF INDIA")
    
    c.setFont("Helvetica", 16)
    c.drawCentredString(width/2, height - 1.9*inch, "Department of Legal Metrology")
    
    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(colors.HexColor("#b71c1c"))
    c.drawCentredString(width/2, height - 2.5*inch, "CERTIFICATE OF VERIFICATION")
    
    # Body
    c.setFont("Helvetica", 14)
    c.setFillColor(colors.black)
    
    text_x = 1.2 * inch
    
    # 1. Body Text
    text_y = height - 3.5 * inch
    line_spacing = 0.35 * inch
    c.drawString(text_x, text_y, "This is to certify that the weighing and measuring instrument")
    c.drawString(text_x, text_y - line_spacing, "associated with the following details has been verified and")
    c.drawString(text_x, text_y - 2*line_spacing, "found to be strictly in accordance with the standards.")
    
    # 2. Details Box
    box_height = 2.8 * inch
    box_y = text_y - 2*line_spacing - 0.5*inch - box_height # start box below the text
    
    c.setLineWidth(1)
    c.setStrokeColor(colors.lightgrey)
    c.rect(text_x - 0.2*inch, box_y, width - 2*inch, box_height, fill=0)
    
    # Inside the box
    c.setFont("Helvetica-Bold", 12)
    c.drawString(text_x, box_y + 2.3*inch, "Certificate Number:")
    c.drawString(text_x, box_y + 1.8*inch, "Application ID:")
    c.drawString(text_x, box_y + 1.3*inch, "Owner ID:")
    c.drawString(text_x, box_y + 0.8*inch, "Date of Issue:")
    c.drawString(text_x, box_y + 0.3*inch, "Valid Until:")
    
    c.setFont("Helvetica", 12)
    c.drawString(text_x + 2.0*inch, box_y + 2.3*inch, cert_number)
    c.drawString(text_x + 2.0*inch, box_y + 1.8*inch, app_id)
    c.drawString(text_x + 2.0*inch, box_y + 1.3*inch, owner_id)
    c.drawString(text_x + 2.0*inch, box_y + 0.8*inch, date.today().isoformat())
    c.drawString(text_x + 2.0*inch, box_y + 0.3*inch, (date.today() + timedelta(days=365)).isoformat())

    # Generate QR Code
    qr = qrcode.QRCode(box_size=4, border=1)
    qr.add_data(f"{qr_token}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR to BytesIO and draw
    img_buffer = BytesIO()
    img.save(img_buffer, format="PNG")
    img_buffer.seek(0)
    
    from reportlab.lib.utils import ImageReader
    qr_image = ImageReader(img_buffer)
    c.drawImage(qr_image, width - 2.8*inch, 1.2*inch, width=1.6*inch, height=1.6*inch)
    
    # Footer / QR label
    c.setFont("Helvetica-Oblique", 11)
    c.drawString(1.2*inch, 1.8*inch, "Authenticity can be verified at the Public Verification Portal.")
    
    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(colors.HexColor("#b71c1c"))
    c.drawString(1.2*inch, 1.5*inch, f"Verification ID: {qr_token}")
    
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.black)
    c.drawString(1.2*inch, 2.3*inch, "Authorized Signatory")
    c.drawString(1.2*inch, 2.1*inch, "Govt Approved Test Center (GATC)")
    
    c.save()

@router.post("/generate", response_model=CertificateResponse)
@limiter.limit("5/minute")
async def generate_certificate(
    request: Request,
    data: CertificateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(require_role([UserRole.admin.value, UserRole.gatc.value]))
):
    # Get Application
    res = await db.execute(select(Application).where(Application.id == data.application_id))
    app = res.scalar_one_or_none()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    if app.status not in [ApplicationStatus.approved, ApplicationStatus.certificate_generated]:
        raise HTTPException(status_code=400, detail="Cannot generate certificate for unapproved application.")
        
    # Check if exists
    res = await db.execute(select(Certificate).where(Certificate.application_id == app.id))
    existing = res.scalar_one_or_none()
    
    cert_num = existing.certificate_number if existing else f"CERT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    qr_token = existing.qr_token if existing else hashlib.sha256(cert_num.encode()).hexdigest()[:16]
    pdf_filename = f"{cert_num}.pdf"
    pdf_path = os.path.join(PDF_DIR, pdf_filename)
    
    # Generate PDF
    generate_pdf(cert_num, qr_token, str(app.id), str(app.applicant_id), pdf_path)
    
    if existing:
        return existing
    
    # Create DB record
    sig_payload = {"cert": cert_num, "app": str(app.id)}
    
    from dateutil.relativedelta import relativedelta
    from app.models.models import Instrument, InstrumentCategory
    
    res_inst = await db.execute(
        select(InstrumentCategory.default_validity_months)
        .join(Instrument, Instrument.category_id == InstrumentCategory.id)
        .where(Instrument.id == app.instrument_id)
    )
    validity_months = res_inst.scalar_one_or_none() or 12
    
    cert = Certificate(
        certificate_number=cert_num,
        application_id=app.id,
        qr_token=qr_token,
        issue_date=date.today(),
        valid_until=date.today() + relativedelta(months=validity_months),
        status="active",
        signature_payload=sig_payload,
        signature_value="dummy_signature_value",
        pdf_storage_ref=f"/{pdf_path.replace(os.sep, '/')}"
    )
    
    app.status = ApplicationStatus.certificate_generated
    
    db.add(cert)
    await db.commit()
    await db.refresh(cert)
    
    return cert

@router.get("/verify/{token}", response_model=CertificateResponse)
async def verify_certificate(token: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import or_
    res = await db.execute(select(Certificate).where(
        or_(Certificate.qr_token == token, Certificate.certificate_number == token)
    ))
    cert = res.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Invalid verification ID or Certificate Number")
    return cert

@router.get("/application/{app_id}", response_model=CertificateResponse)
async def get_certificate_by_app(
    app_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: UserPayload = Depends(require_role([UserRole.owner.value, UserRole.gatc.value, UserRole.admin.value]))
):
    res = await db.execute(select(Certificate).where(Certificate.application_id == app_id))
    cert = res.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found for this application")
    
    # Check if the PDF exists on disk (handle ephemeral Render disk wipes)
    pdf_path = os.path.join(PDF_DIR, f"{cert.certificate_number}.pdf")
    if not os.path.exists(pdf_path):
        app_res = await db.execute(select(Application).where(Application.id == app_id))
        app = app_res.scalar_one_or_none()
        if app:
            generate_pdf(cert.certificate_number, cert.qr_token, str(app.id), str(app.applicant_id), pdf_path)
            
    return cert

