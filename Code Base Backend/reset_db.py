"""
Reset database - drops all tables and recreates them
"""
import asyncio
from sqlalchemy import text
from app.db.database import engine, Base

async def reset_db():
    print("Dropping all tables...")
    async with engine.begin() as conn:
        await conn.execute(text('DROP SCHEMA public CASCADE'))
        await conn.execute(text('CREATE SCHEMA public'))
        await conn.execute(text('GRANT ALL ON SCHEMA public TO postgres'))
        await conn.execute(text('GRANT ALL ON SCHEMA public TO public'))
    print("Database schema reset complete!")

    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created!")

if __name__ == "__main__":
    asyncio.run(reset_db())
