import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings

async def assign():
    url = settings.DATABASE_URL.split('?')[0]
    engine = create_async_engine(url, connect_args={"statement_cache_size": 0})
    s = sessionmaker(engine, class_=AsyncSession)()
    
    # get lmo user
    lmo = await s.execute(text("SELECT id FROM public.users WHERE role='lmo' LIMIT 1"))
    lmo_id = lmo.scalar()
    if not lmo_id:
        print("No LMO user found.")
        return
        
    # assign all apps
    await s.execute(text("UPDATE applications SET status='assigned', assigned_officer_id=:lmo_id"), {"lmo_id": lmo_id})
    await s.commit()
    print(f"Assigned applications to LMO {lmo_id}")
    await s.close()

asyncio.run(assign())
