import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.models.models import Instrument
from app.core.config import settings

async def query():
    url = settings.DATABASE_URL.split('?')[0]
    engine = create_async_engine(url, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession)
    async with async_session() as sess:
        result = await sess.execute(select(Instrument))
        rows = result.scalars().all()
        for i in rows:
            print(f"id={i.id}  owner_id={i.owner_id}  serial={i.serial_number}")
        if not rows:
            print("No instruments found in database.")

asyncio.run(query())
