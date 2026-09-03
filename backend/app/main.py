from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1 import instruments, applications, certificates, admin
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.core.rate_limit import limiter

from app.db.session import engine, async_session
from sqlalchemy import text
import asyncio

async def check_expiring_certificates():
    from app.models.models import Certificate, Notification, NotificationChannel, Application
    from datetime import date, timedelta
    async with async_session() as sess:
        print("Running daily expiry check...")
        target_date = date.today() + timedelta(days=30)
        
        # Find certs expiring in exactly 30 days
        res = await sess.execute(
            select(Certificate, Application)
            .join(Application, Application.id == Certificate.application_id)
            .where(Certificate.valid_until == target_date)
        )
        for cert, app in res.all():
            print(f"Creating expiry notification for cert {cert.certificate_number}")
            notif = Notification(
                user_id=app.applicant_id,
                type="EXPIRY_REMINDER",
                channel=NotificationChannel.in_app,
                related_entity="Certificate",
                related_id=cert.id,
                status="pending"
            )
            sess.add(notif)
        await sess.commit()

scheduler = AsyncIOScheduler()
scheduler.add_job(check_expiring_certificates, CronTrigger(hour=0, minute=0))

async def sync_auth_users():
    async with async_session() as sess:
        auth_users = await sess.execute(text("""
            SELECT id, email, 
                   raw_user_meta_data->>'full_name' as name, 
                   raw_user_meta_data->>'role' as role,
                   raw_user_meta_data->>'jurisdiction' as jurisdiction,
                   raw_user_meta_data->>'employee_ref' as employee_ref
            FROM auth.users
        """))
        for au in auth_users:
            uid, email, name, role, jurisdiction, emp_ref = au
            exists = await sess.execute(text("SELECT id FROM public.users WHERE id = :id"), {"id": uid})
            if not exists.scalar():
                await sess.execute(text("""
                    INSERT INTO public.users (id, name, email, password_hash, role, status, jurisdiction, employee_or_license_ref)
                    VALUES (:id, :name, :email, :ph, :role, 'active', :jurisdiction, :emp_ref)
                """), {
                    "id": uid, 
                    "name": name or email.split('@')[0], 
                    "email": email, 
                    "ph": "managed_by_supabase_auth", 
                    "role": role or 'owner',
                    "jurisdiction": jurisdiction, 
                    "emp_ref": emp_ref
                })
        await sess.commit()

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Sync users on startup
    await sync_auth_users()
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(
    title="Unified Legal Metrology Verification System",
    description="Backend API for Legal Metrology Workflows",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://sih-seven-dun.vercel.app"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(instruments.router, prefix="/api/v1/instruments", tags=["Instruments"])
app.include_router(applications.router, prefix="/api/v1/applications", tags=["Applications"])
app.include_router(certificates.router, prefix="/api/v1/certificates", tags=["Certificates"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])

# Mount static for PDFs
import os
os.makedirs("static/certificates", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Unified Legal Metrology API"}
