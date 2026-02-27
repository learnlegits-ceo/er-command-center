from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
from functools import lru_cache

_INSECURE_DEFAULTS = {
    "change-this-in-production",
    "change-this-jwt-secret",
    "change-this-secret-key-min-32-chars",
    "change-this-jwt-secret-key-min-32-chars",
}


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "ER Command Center"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_VERSION: str = "v1"
    SECRET_KEY: str = "change-this-in-production"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/er_command_center"
    DATABASE_SYNC_URL: str = "postgresql://postgres:password@localhost:5432/er_command_center"

    # JWT
    JWT_SECRET_KEY: str = "change-this-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Groq AI
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_VISION_MODEL: str = "llama-3.2-90b-vision-preview"
    GROQ_MAX_TOKENS: int = 1024
    GROQ_TEMPERATURE: float = 0.3

    # Trigger.dev (Background Jobs)
    TRIGGER_API_KEY: str = ""
    TRIGGER_API_URL: str = "https://api.trigger.dev"

    # AWS (Optional - for S3 uploads)
    AWS_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET_NAME: str = "er-command-center-uploads"

    # Email (Resend - via Trigger.dev)
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@ercommandcenter.com"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:5173"

    # Redis (optional)
    REDIS_URL: str = ""

    @field_validator("SECRET_KEY", "JWT_SECRET_KEY")
    @classmethod
    def must_not_be_default(cls, v: str, info) -> str:
        """Prevent application startup with insecure placeholder secrets."""
        if v in _INSECURE_DEFAULTS:
            raise ValueError(
                f"{info.field_name} is set to an insecure default. "
                "Set a strong random value in your .env file before starting the server."
            )
        if len(v) < 32:
            raise ValueError(
                f"{info.field_name} must be at least 32 characters long."
            )
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        # Looks for .env in repo root first, then falls back to local .env.
        # This lets a single root .env file drive both backend and frontend.
        env_file = ("../../.env", "../.env", ".env")
        case_sensitive = True
        extra = "ignore"  # Allow extra env vars (e.g. VITE_*) without error


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
