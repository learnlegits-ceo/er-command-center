"""
Run the add_department_patients.sql file against the database
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

    print("Connected! Reading add_department_patients.sql...")

    # Read SQL file
    with open("add_department_patients.sql", "r", encoding="utf-8") as f:
        sql = f.read()

    print("Executing SQL statements...")

    # Split and execute statements
    # asyncpg doesn't support multiple statements, so we split them
    statements = sql.split(";")

    success_count = 0
    skip_count = 0
    error_count = 0

    for i, stmt in enumerate(statements):
        stmt = stmt.strip()
        # Remove leading comment lines to get to the actual SQL
        lines = stmt.split('\n')
        sql_lines = [l for l in lines if l.strip() and not l.strip().startswith('--')]
        actual_sql = '\n'.join(sql_lines).strip()

        if actual_sql and actual_sql.upper().startswith('INSERT'):
            try:
                await conn.execute(actual_sql)
                success_count += 1
                print(f"  [OK] Statement {i+1} executed")
            except Exception as e:
                if "duplicate" in str(e).lower() or "conflict" in str(e).lower() or "unique" in str(e).lower():
                    skip_count += 1
                    print(f"  [SKIP] Statement {i+1} skipped (data already exists)")
                else:
                    error_count += 1
                    print(f"  [ERR] Statement {i+1} error: {e}")

    await conn.close()
    print(f"\n=== Done! ===")
    print(f"  Successful: {success_count}")
    print(f"  Skipped: {skip_count}")
    print(f"  Errors: {error_count}")
    print("\nNew patients added to all departments!")

if __name__ == "__main__":
    asyncio.run(run_seed())
