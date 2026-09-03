import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import InstrumentCategory
from app.core.config import settings

async def seed():
    url = settings.DATABASE_URL.split('?')[0]
    engine = create_async_engine(url, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession)

    async with async_session() as session:
        # Seed 1 category
        cat = InstrumentCategory(
            id='816e8633-8a3c-4de3-92f5-d57be3cda4b8',
            name='Electronic Weighing Scale',
            default_validity_months=12
        )
        session.add(cat)
        try:
            await session.commit()
            print("Seeded successfully")
        except Exception as e:
            print(f"Seed failed or already seeded: {e}")

if __name__ == '__main__':
    asyncio.run(seed())
