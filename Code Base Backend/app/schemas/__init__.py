from .auth import (
    LoginRequest, LoginResponse, TokenResponse,
    ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest,
    ChangePasswordRequest, RefreshTokenRequest
)
from .user import (
    UserResponse, UserCreate, UserUpdate,
    UserSettingsResponse, UserSettingsUpdate,
    TwoFactorEnableResponse, TwoFactorVerifyRequest
)
from .patient import (
    PatientCreate, PatientUpdate, PatientResponse, PatientListResponse,
    PatientDischargeRequest
)
from .vitals import (
    VitalsCreate, VitalsResponse, VitalsOCRResponse
)
from .triage import (
    TriageRequest, TriageResponse, QuickTriageRequest
)
from .note import NoteCreate, NoteResponse
from .prescription import PrescriptionCreate, PrescriptionResponse
from .bed import BedResponse, BedAssignRequest
from .alert import (
    AlertCreate, AlertResponse, AlertAcknowledgeRequest,
    AlertResolveRequest, AlertForwardRequest
)
from .police_case import (
    PoliceCaseCreate, PoliceCaseResponse, PoliceContactRequest
)
from .dashboard import DashboardStatsResponse
from .common import (
    SuccessResponse, ErrorResponse, PaginationParams, PaginatedResponse
)

__all__ = [
    # Auth
    "LoginRequest", "LoginResponse", "TokenResponse",
    "ForgotPasswordRequest", "VerifyOTPRequest", "ResetPasswordRequest",
    "ChangePasswordRequest", "RefreshTokenRequest",
    # User
    "UserResponse", "UserCreate", "UserUpdate",
    "UserSettingsResponse", "UserSettingsUpdate",
    "TwoFactorEnableResponse", "TwoFactorVerifyRequest",
    # Patient
    "PatientCreate", "PatientUpdate", "PatientResponse", "PatientListResponse",
    "PatientDischargeRequest",
    # Vitals
    "VitalsCreate", "VitalsResponse", "VitalsOCRResponse",
    # Triage
    "TriageRequest", "TriageResponse", "QuickTriageRequest",
    # Note
    "NoteCreate", "NoteResponse",
    # Prescription
    "PrescriptionCreate", "PrescriptionResponse",
    # Bed
    "BedResponse", "BedAssignRequest",
    # Alert
    "AlertCreate", "AlertResponse", "AlertAcknowledgeRequest",
    "AlertResolveRequest", "AlertForwardRequest",
    # Police Case
    "PoliceCaseCreate", "PoliceCaseResponse", "PoliceContactRequest",
    # Dashboard
    "DashboardStatsResponse",
    # Common
    "SuccessResponse", "ErrorResponse", "PaginationParams", "PaginatedResponse",
]
