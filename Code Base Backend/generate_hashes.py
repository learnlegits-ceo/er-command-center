"""
Generate correct bcrypt password hashes for seed data
"""
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

passwords = {
    "nurse123": "Nurse password",
    "doctor123": "Doctor password",
    "admin123": "Admin password",
    "password123": "Default password"
}

print("=" * 60)
print("Bcrypt Password Hashes")
print("=" * 60)

for password, description in passwords.items():
    hash = pwd_context.hash(password)
    print(f"\n{description} ({password}):")
    print(f"  {hash}")

    # Verify it works
    if pwd_context.verify(password, hash):
        print("  ✓ Verified")
    else:
        print("  ✗ VERIFICATION FAILED!")

print("\n" + "=" * 60)
