import os
import secrets
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
import yaml
from pathlib import Path


class Settings(BaseSettings):
    """Application settings with validation and secure defaults."""

    # ── API Keys (never expose, never log) ──
    gemini_api_key: str = ""
    secret_key: str = ""  # Auto-generated if empty

    # ── Server ──
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_origin: str = "http://localhost:5173"
    debug: bool = False  # Hardened: off by default

    # ── Database ──
    database_url: str = "sqlite:///./ecotwin.db"

    # ── Seed ──
    seed_random: int = 42

    # ── Rate Limits ──
    max_upload_size_mb: int = 5
    detection_rate_limit: int = 30
    recommend_rate_limit: int = 10

    # ── Admin Credentials ──
    admin_username: str = "admin"
    admin_password_hash: str = ""  # bcrypt hash; empty = admin login disabled

    model_config = {
        "env_file": [
            Path(__file__).resolve().parent.parent.parent / ".env",
            Path(__file__).resolve().parent.parent / ".env",
            ".env",
        ],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @field_validator("secret_key", mode="before")
    @classmethod
    def _generate_secret_key(cls, v: str) -> str:
        """Auto-generate a cryptographic secret if none provided."""
        if not v:
            return secrets.token_urlsafe(32)
        return v

    @field_validator("debug", mode="before")
    @classmethod
    def _coerce_debug(cls, v):
        """Ensure debug is always a bool, and respect env override."""
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes")
        return bool(v)


@lru_cache()
def get_settings() -> Settings:
    return Settings()


def validate_env():
    """Validate critical environment variables at startup.
    Raises RuntimeError with a descriptive message on failure.
    """
    settings = get_settings()
    warnings = []

    if not settings.gemini_api_key:
        warnings.append(
            "GEMINI_API_KEY is not set. LLM recommendations will use cached fallback."
        )

    if settings.debug:
        warnings.append(
            "DEBUG mode is ON. Disable in production by setting DEBUG=false."
        )

    if settings.frontend_origin == "*":
        warnings.append(
            "FRONTEND_ORIGIN is set to '*'. Restrict to your domain in production."
        )

    return warnings


def load_yaml_config(filename: str) -> dict:
    config_dir = Path(__file__).parent.parent / "config"
    with open(config_dir / filename, "r") as f:
        return yaml.safe_load(f)


@lru_cache()
def get_label_map() -> dict:
    return load_yaml_config("label_map.yaml")


@lru_cache()
def get_emission_factors() -> dict:
    return load_yaml_config("emission_factors.yaml")
