"""
Complete database setup - Run this ONE script to set everything up from scratch
"""
import asyncio
import sys

async def setup_everything():
    print("=" * 60)
    print("COMPLETE DATABASE SETUP")
    print("=" * 60)

    # Load settings first
    from app.core.config import settings

    # Parse DATABASE_URL to get connection details
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "")
    auth_part, rest = url.split("@")
    user, password = auth_part.split(":")
    host_port, dbname = rest.split("/")
    host, port = host_port.split(":")

    print(f"\nDatabase: {dbname} @ {host}:{port}")

    # Step 1: Check database connection
    print("\n[1/4] Checking database connection...")
    try:
        import asyncpg

        try:
            conn = await asyncpg.connect(
                user=user,
                password=password,
                database='postgres',
                host=host,
                port=int(port)
            )

            exists = await conn.fetchval(
                f"SELECT 1 FROM pg_database WHERE datname = '{dbname}'"
            )

            if not exists:
                await conn.execute(f'CREATE DATABASE {dbname}')
                print(f"   [OK] Database '{dbname}' created")
            else:
                print(f"   [OK] Database '{dbname}' exists")

            await conn.close()
        except Exception as e:
            print(f"   [WARN] {e}")
            print(f"   Assuming database exists, continuing...")

    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        return False

    # Step 2: Reset schema
    print("\n[2/4] Resetting database schema...")
    try:
        from sqlalchemy import text
        from app.db.database import engine, Base

        async with engine.begin() as conn:
            await conn.execute(text('DROP SCHEMA IF EXISTS public CASCADE'))
            await conn.execute(text('CREATE SCHEMA public'))
            await conn.execute(text('GRANT ALL ON SCHEMA public TO postgres'))
            await conn.execute(text('GRANT ALL ON SCHEMA public TO public'))
        print("   [OK] Schema reset complete")
    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Step 3: Create tables
    print("\n[3/4] Creating tables...")
    try:
        # Import all models to register them with Base
        from app.models import (
            Tenant, User, Department, Patient, Bed, Alert,
            PatientVitals, PatientNote, BedAssignment, UserSession
        )

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("   [OK] All tables created")
    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Step 4: Seed data
    print("\n[4/4] Seeding data...")
    try:
        from seed_data import seed_data
        await seed_data()
    except Exception as e:
        print(f"   [FAIL] Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

async def main():
    success = await setup_everything()

    print("\n" + "=" * 60)
    if success:
        print("SETUP COMPLETE!")
        print("=" * 60)
        print("\nLogin credentials:")
        print("  Nurse:  priya@hospital.com / nurse123")
        print("  Doctor: ananya@hospital.com / doctor123")
        print("  Admin:  rajesh@hospital.com / admin123")
        print("\nStart the backend with:")
        print("  python -m uvicorn app.main:app --reload --port 8000")
    else:
        print("SETUP FAILED!")
        print("=" * 60)
        print("\nPlease check the errors above.")

if __name__ == "__main__":
    asyncio.run(main())
