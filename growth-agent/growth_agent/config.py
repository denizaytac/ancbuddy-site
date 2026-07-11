from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env.local", ".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "test", "production"] = "development"
    port: int = Field(default=8080, ge=1, le=65535)
    public_base_url: str = "http://localhost:8080"
    ceo_origin: str = "http://localhost:5173"
    openai_api_key: str | None = None
    openai_model: str = "gpt-5-mini"
    blocked_channels: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["reddit"]
    )

    ceo_password_hash: str | None = None
    ceo_password: str | None = None
    ceo_api_token: str | None = None
    scheduler_api_token: str | None = None
    session_secret: str = "development-only-change-me"
    session_ttl_seconds: int = Field(default=43_200, ge=300, le=604_800)
    cookie_secure: bool = False
    cookie_name: str = "ancbuddy_ceo_session"
    execution_mode: Literal["simulation", "live"] = "simulation"

    goal_target: float = Field(default=1000, gt=0)
    goal_earned_baseline: float = Field(default=60, ge=0)
    goal_currency: str = "EUR"

    store_backend: Literal["memory", "supabase"] = "memory"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None

    scheduler_enabled: bool = False
    daily_run_hour_utc: int = Field(default=7, ge=0, le=23)
    weekly_run_weekday: int = Field(default=0, ge=0, le=6)
    weekly_run_hour_utc: int = Field(default=8, ge=0, le=23)

    smtp_host: str | None = None
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_starttls: bool = True

    github_token: str | None = None
    github_repository: str | None = None
    github_base_branch: str = "main"

    growth_webhook_url: str | None = None
    growth_webhook_secret: str | None = None

    @field_validator("blocked_channels", mode="before")
    @classmethod
    def parse_blocked_channels(cls, value: object) -> list[str]:
        if value is None:
            return []
        raw_values = value.split(",") if isinstance(value, str) else value
        if not isinstance(raw_values, (list, tuple, set)):
            raise ValueError("BLOCKED_CHANNELS must be a comma-separated list")
        normalized: list[str] = []
        for raw_value in raw_values:
            channel = str(raw_value).strip().lower()
            if channel and channel not in normalized:
                normalized.append(channel)
        return normalized

    @model_validator(mode="after")
    def validate_runtime(self) -> "Settings":
        if self.app_env == "production":
            if not self.ceo_password_hash:
                raise ValueError("CEO_PASSWORD_HASH is required in production")
            if self.ceo_password:
                raise ValueError("CEO_PASSWORD must not be used in production")
            if self.session_secret == "development-only-change-me":
                raise ValueError("SESSION_SECRET must be changed in production")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE=true is required in production")
            if self.store_backend != "supabase":
                raise ValueError("STORE_BACKEND=supabase is required in production")
        if self.store_backend == "supabase" and not (
            self.supabase_url and self.supabase_service_role_key
        ):
            raise ValueError("Supabase URL and service-role key are required")
        if (
            self.ceo_api_token
            and self.scheduler_api_token
            and self.ceo_api_token == self.scheduler_api_token
        ):
            raise ValueError("CEO_API_TOKEN and SCHEDULER_API_TOKEN must be different")
        return self

    @property
    def agent_ready(self) -> bool:
        return bool(self.openai_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
