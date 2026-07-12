"""
Centralized configuration for SnackFlow backend.

All environment-driven configuration lives here so that the rest of the
codebase never touches `os.environ` directly. This keeps configuration
testable, typed, and validated at startup (fail fast if something is missing).
"""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---------- App ----------
    APP_NAME: str = "SnackFlow API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api"

    # ---------- Database ----------
    DATABASE_URL: str
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # ---------- Redis ----------
    REDIS_URL: str = "redis://localhost:6379/0"

    # ---------- Security ----------
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ADMIN_API_KEY: str = "change_this_admin_key"

    # ---------- CORS ----------
    CORS_ORIGINS: str = "http://localhost:3000"

    # ---------- Razorpay ----------
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # ---------- Business Rules ----------
    MAX_ITEMS_PER_ORDER: int = 10
    ORDER_ID_PREFIX: str = "A"
    SESSION_TTL_HOURS: int = 6
    BASE_PREP_TIME_MINUTES: int = 8
    AVG_TIME_PER_QUEUED_ORDER_MINUTES: int = 4

    # ---------- Rate Limiting ----------
    ORDER_RATE_LIMIT_MAX: int = 3
    ORDER_RATE_LIMIT_WINDOW_SECONDS: int = 900

    # ---------- Scheduler ----------
    DAILY_RESET_HOUR: int = 23
    DAILY_RESET_MINUTE: int = 59
    TIMEZONE: str = "Asia/Kolkata"

    # ---------- Logging ----------
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def ensure_async_driver(cls, v: str) -> str:
        """Guarantee we use the async (psycopg) driver even if a plain
        postgres:// URL is supplied (common when copy-pasting from Supabase)."""
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+psycopg://", 1)
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance -- .env is read only once per process."""
    return Settings()


settings = get_settings()