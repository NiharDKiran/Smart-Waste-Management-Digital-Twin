"""
Authentication & Authorization for EcoTwin admin routes.
Uses JWT tokens with HMAC-SHA256 signing.
"""

import hmac
import hashlib
import json
import time
import base64
import re
from typing import Optional
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import get_settings

# ── Token Configuration ──
TOKEN_EXPIRY_SECONDS = 3600 * 8  # 8 hours
_bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with a salt derived from secret_key.
    For a hackathon project this is sufficient. For production, use bcrypt.
    """
    settings = get_settings()
    salt = settings.secret_key[:16]
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Constant-time comparison to prevent timing attacks."""
    computed = hash_password(plain_password)
    return hmac.compare_digest(computed, hashed_password)


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + "=" * padding)


def create_token(username: str) -> str:
    """Create a signed JWT-like token (header.payload.signature)."""
    settings = get_settings()

    header = _b64_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload_data = {
        "sub": username,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRY_SECONDS,
    }
    payload = _b64_encode(json.dumps(payload_data).encode())

    signature = hmac.new(
        settings.secret_key.encode(), f"{header}.{payload}".encode(), hashlib.sha256
    ).digest()
    sig_b64 = _b64_encode(signature)

    return f"{header}.{payload}.{sig_b64}"


def decode_token(token: str) -> Optional[dict]:
    """Verify and decode a token. Returns payload dict or None."""
    settings = get_settings()

    parts = token.split(".")
    if len(parts) != 3:
        return None

    header_b64, payload_b64, sig_b64 = parts

    # Verify signature
    expected_sig = hmac.new(
        settings.secret_key.encode(),
        f"{header_b64}.{payload_b64}".encode(),
        hashlib.sha256,
    ).digest()

    try:
        actual_sig = _b64_decode(sig_b64)
    except Exception:
        return None

    if not hmac.compare_digest(expected_sig, actual_sig):
        return None

    # Decode payload
    try:
        payload = json.loads(_b64_decode(payload_b64))
    except Exception:
        return None

    # Check expiry
    if payload.get("exp", 0) < time.time():
        return None

    return payload


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[str]:
    """Extract and validate current user from Bearer token.
    Returns username or None if no valid token.
    """
    if credentials is None:
        return None

    payload = decode_token(credentials.credentials)
    if payload is None:
        return None

    return payload.get("sub")


async def require_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> str:
    """Dependency that enforces admin authentication.
    Raises 401 if no valid token, 403 if user is not admin.
    """
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = payload.get("sub")
    settings = get_settings()
    if username != settings.admin_username:
        raise HTTPException(status_code=403, detail="Admin access required")

    return username


def sanitize_string(value: str, max_length: int = 500) -> str:
    """Sanitize a user-provided string: strip HTML tags, limit length."""
    # Strip HTML tags
    cleaned = re.sub(r"<[^>]+>", "", value)
    # Strip null bytes
    cleaned = cleaned.replace("\x00", "")
    # Limit length
    return cleaned[:max_length].strip()
