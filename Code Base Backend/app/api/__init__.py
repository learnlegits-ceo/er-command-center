from fastapi import APIRouter
from .routes import auth, users, patients, vitals, triage, notes, prescriptions, beds, alerts, police_cases, dashboard, admin, departments

api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(prescriptions.router, prefix="/patients", tags=["Prescriptions"])
api_router.include_router(notes.router, prefix="/patients", tags=["Patient Notes"])
api_router.include_router(vitals.router, prefix="/vitals", tags=["Vitals"])
api_router.include_router(triage.router, prefix="/triage", tags=["AI Triage"])
api_router.include_router(beds.router, prefix="/beds", tags=["Beds"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(police_cases.router, prefix="/police-cases", tags=["Police Cases"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(departments.router, prefix="/departments", tags=["Departments"])

__all__ = ["api_router"]
