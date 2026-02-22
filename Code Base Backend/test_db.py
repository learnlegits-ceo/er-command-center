import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:klim@localhost:5433/demo_health"

async def test_async_connection():
    engine = create_async_engine(
        DATABASE_URL,
        echo=True,
    )

    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("✅ Async DB connected successfully:", result.scalar())
    except Exception as e:
        print("❌ Async DB connection failed:", e)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_async_connection())
