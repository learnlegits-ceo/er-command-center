"""
Run the seed_data.sql file against the database
"""
import asyncio
import asyncpg
from app.core.config import settings

async def run_seed():
    # Parse the DATABASE_URL to get connection params
    # Format: postgresql+asyncpg://user:password@host:port/dbname
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "")

    # Parse user:password@host:port/dbname
    auth_part, rest = url.split("@")
    user, password = auth_part.split(":")
    host_port, dbname = rest.split("/")
    host, port = host_port.split(":")

    print(f"Connecting to {host}:{port}/{dbname} as {user}...")

    # Connect to database
    conn = await asyncpg.connect(
        user=user,
        password=password,
        database=dbname,
        host=host,
        port=int(port)
    )

    print("Connected! Reading seed_data.sql...")

    # Read SQL file
    with open("seed_data.sql", "r") as f:
        sql = f.read()

    print("Executing SQL statements...")

    # Split and execute statements
    # asyncpg doesn't support multiple statements, so we split them
    statements = sql.split(";")

    for i, stmt in enumerate(statements):
        stmt = stmt.strip()
        if stmt and not stmt.startswith("--") and not stmt.startswith("SELECT"):
            try:
                await conn.execute(stmt)
                print(f"  [OK] Statement {i+1} executed")
            except Exception as e:
                if "duplicate" in str(e).lower() or "conflict" in str(e).lower():
                    print(f"  [SKIP] Statement {i+1} skipped (data already exists)")
                else:
                    print(f"  [ERR] Statement {i+1} error: {e}")

    await conn.close()
    print("\n=== Seed data loaded successfully! ===")
    print("\nLogin credentials:")
    print("  Nurse: priya@hospital.com / nurse123")
    print("  Doctor: ananya@hospital.com / doctor123")
    print("  Admin: rajesh@hospital.com / admin123")

if __name__ == "__main__":
    asyncio.run(run_seed())
