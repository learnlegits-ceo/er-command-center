"""
Database diagnostic script - checks if everything is set up correctly
Run from backend root: python scripts/check_db.py
"""
import asyncio
import sys
import os

# Allow imports from backend root (app.*)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def check_database():
    print("=" * 60)
    print("Database Diagnostic Check")
    print("=" * 60)

    # Check 1: Can we import settings?
    print("\n1. Checking configuration...")
    try:
        from app.core.config import settings
        print(f"   ✓ Database URL: {settings.DATABASE_URL[:50]}...")
    except Exception as e:
        print(f"   ✗ Config error: {e}")
        return

    # Check 2: Can we connect to database?
    print("\n2. Checking database connection...")
    try:
        import asyncpg
        url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "")
        auth_part, rest = url.split("@")
        user, password = auth_part.split(":")
        host_port, dbname = rest.split("/")
        host, port = host_port.split(":")

        conn = await asyncpg.connect(
            user=user,
            password=password,
            database=dbname,
            host=host,
            port=int(port)
        )
        print(f"   ✓ Connected to database '{dbname}'")
    except asyncpg.exceptions.InvalidCatalogNameError:
        print(f"   ✗ Database '{dbname}' does not exist!")
        print(f"   → Run: createdb {dbname}")
        print(f"   → Or in psql: CREATE DATABASE {dbname};")
        return
    except Exception as e:
        print(f"   ✗ Connection failed: {e}")
        print("   → Make sure PostgreSQL is running")
        print("   → Check your DATABASE_URL in .env")
        return

    # Check 3: Do tables exist?
    print("\n3. Checking if tables exist...")
    try:
        tables = await conn.fetch("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)

        if not tables:
            print("   ✗ No tables found!")
            print("   → Run: python reset_db.py")
            await conn.close()
            return

        table_names = [t['table_name'] for t in tables]
        print(f"   ✓ Found {len(table_names)} tables")

        required_tables = ['users', 'tenants', 'departments', 'patients', 'beds']
        missing = [t for t in required_tables if t not in table_names]

        if missing:
            print(f"   ✗ Missing tables: {missing}")
            print("   → Run: python reset_db.py")
            await conn.close()
            return
        else:
            print(f"   ✓ All required tables exist")
    except Exception as e:
        print(f"   ✗ Error checking tables: {e}")
        await conn.close()
        return

    # Check 4: Is there seed data?
    print("\n4. Checking for seed data...")
    try:
        user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
        tenant_count = await conn.fetchval("SELECT COUNT(*) FROM tenants")
        patient_count = await conn.fetchval("SELECT COUNT(*) FROM patients")

        print(f"   Tenants: {tenant_count}")
        print(f"   Users: {user_count}")
        print(f"   Patients: {patient_count}")

        if user_count == 0:
            print("   ✗ No users found - database needs seeding!")
            print("   → Run: python seed_data.py")
            await conn.close()
            return
        else:
            print(f"   ✓ Seed data present")
    except Exception as e:
        print(f"   ✗ Error checking data: {e}")
        await conn.close()
        return

    # Check 5: Can we find demo users?
    print("\n5. Checking demo users...")
    try:
        demo_users = await conn.fetch("""
            SELECT email, name, role FROM users
            WHERE email IN ('priya@hospital.com', 'ananya@hospital.com', 'rajesh@hospital.com')
        """)

        if not demo_users:
            print("   ✗ Demo users not found!")
            print("   → Run: python seed_data.py")
        else:
            print(f"   ✓ Found {len(demo_users)} demo users:")
            for u in demo_users:
                print(f"     - {u['email']} ({u['role']})")
    except Exception as e:
        print(f"   ✗ Error: {e}")

    await conn.close()

    print("\n" + "=" * 60)
    print("Diagnostic complete!")
    print("=" * 60)
    print("\nIf all checks passed, your database is ready.")
    print("Start the backend with: python -m uvicorn app.main:app --reload --port 8000")

if __name__ == "__main__":
    asyncio.run(check_database())
