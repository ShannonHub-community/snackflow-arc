import asyncio
import sys
import uuid
from src.database.session import AsyncSessionLocal
from src.models.menu import MenuCategory, MenuItem
from sqlalchemy import select

async def seed():
    db = AsyncSessionLocal()
    try:
        categories = ["Mains", "Sides", "Beverages", "Desserts"]
        print("Seeding categories...")
        for i, cat_name in enumerate(categories):
            # Check if category exists
            res = await db.execute(select(MenuCategory).where(MenuCategory.name == cat_name))
            cat = res.scalar_one_or_none()
            if not cat:
                cat = MenuCategory(
                    id=uuid.uuid4(),
                    name=cat_name,
                    display_order=i
                )
                db.add(cat)
                print(f"Created category: {cat_name}")
            else:
                print(f"Category already exists: {cat_name} ({cat.id})")
        await db.commit()
        print("Commit successful!")
    except Exception as e:
        print("Error during seed:")
        import traceback
        traceback.print_exc()
        await db.rollback()
    finally:
        await db.close()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.run(seed(), loop_factory=asyncio.SelectorEventLoop)
    else:
        asyncio.run(seed())
