import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import async_session
from app.models.models import InstrumentCategory

CATEGORIES = [
    ("Non-automatic weighing scale", 12),
    ("Auto Gravimetric scale", 12),
    ("Hopper weigher", 12),
    ("Check weigher", 12),
    ("In-motion road vehicle scale", 12),
    ("Tank weighing scale", 12),
    ("Water meter", 60),
    ("Gas meter", 60),
    ("Flow meter", 24),
    ("Fuel Dispenser (Petrol/Diesel)", 24),
    ("Measuring tape", 60),
    ("Auto/Taxi meter", 12),
    ("Sphygmomanometer", 24),
    ("Liquor measures", 12),
    ("Other", 12),
]

async def seed_categories():
    async with async_session() as db:
        for name, validity in CATEGORIES:
            res = await db.execute(select(InstrumentCategory).where(InstrumentCategory.name == name))
            existing = res.scalar_one_or_none()
            if not existing:
                cat = InstrumentCategory(name=name, default_validity_months=validity)
                db.add(cat)
        await db.commit()
        print("Categories seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_categories())
