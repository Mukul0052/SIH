import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings

async def sync_users():
    url = settings.DATABASE_URL.split('?')[0]
    engine = create_async_engine(url, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as sess:
        # Get all auth users directly
        auth_users = await sess.execute(text("SELECT id, email, raw_user_meta_data->>'full_name' as name, raw_user_meta_data->>'role' as role FROM auth.users"))
        
        for au in auth_users:
            uid, email, name, role = au
            if not name:
                name = email.split('@')[0]
            if not role:
                role = 'owner'
                
            print(f"Syncing user {email} (role: {role})")
            
            # Check if exists in public.users
            exists = await sess.execute(text("SELECT id FROM public.users WHERE id = :id"), {"id": uid})
            if not exists.scalar():
                # Insert
                await sess.execute(text("""
                    INSERT INTO public.users (id, name, email, password_hash, role, status)
                    VALUES (:id, :name, :email, :ph, :role, 'active')
                """), {
                    "id": uid,
                    "name": name,
                    "email": email,
                    "ph": "managed_by_supabase_auth",
                    "role": role
                })
                print(f"-> Inserted {email}")
            else:
                print(f"-> Already synced {email}")
                
        await sess.commit()

asyncio.run(sync_users())
