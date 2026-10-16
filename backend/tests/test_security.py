import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import get_settings
from app.auth import (
    hash_password,
    verify_password,
    create_token,
    decode_token,
    sanitize_string,
)

client = TestClient(app)


def test_security_headers_present():
    """Verify production security headers are injected into HTTP responses."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    headers = resp.headers

    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert "1; mode=block" in headers.get("x-xss-protection", "")
    assert "strict-origin-when-cross-origin" in headers.get("referrer-policy", "")
    assert "max-age=31536000" in headers.get("strict-transport-security", "")
    assert "default-src 'self'" in headers.get("content-security-policy", "")
    assert "no-store" in headers.get("cache-control", "")


def test_path_traversal_blocked():
    """Verify path traversal attacks are rejected with 400 Bad Request."""
    resp = client.get("/api/../etc/passwd")
    assert resp.status_code in (400, 404)


def test_debug_mode_docs_disabled():
    """Verify Swagger/Redoc endpoints are hidden when debug=False."""
    settings = get_settings()
    if not settings.debug:
        resp = client.get("/docs")
        assert resp.status_code == 404
        resp_openapi = client.get("/openapi.json")
        assert resp_openapi.status_code == 404


def test_string_sanitizer():
    """Verify HTML tags and null bytes are stripped from user inputs."""
    dirty = "<script>alert('xss')</script>Hello<b>World</b>\x00!"
    clean = sanitize_string(dirty)
    assert "<script>" not in clean
    assert "<b>" not in clean
    assert "\x00" not in clean
    assert "HelloWorld!" in clean


def test_password_hashing_and_verification():
    """Verify password hashing produces salted SHA-256 and constant-time check works."""
    raw = "SuperSecretPassword123!"
    hashed = hash_password(raw)
    assert hashed != raw
    assert len(hashed) == 64  # SHA-256 hex digest length
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_flow():
    """Verify token generation, signature validation, and payload extraction."""
    token = create_token("admin")
    assert len(token.split(".")) == 3

    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "admin"
    assert "exp" in payload
    assert "iat" in payload

    # Tampered token fails verification
    tampered = token[:-4] + "xxxx"
    assert decode_token(tampered) is None


def test_admin_route_protection():
    """Verify /api/admin/reset-twin rejects unauthenticated requests."""
    # 1. No token -> 401 Unauthorized
    resp_no_token = client.post("/api/admin/reset-twin")
    assert resp_no_token.status_code == 401

    # 2. Non-admin token -> 403 Forbidden
    non_admin_token = create_token("operator")
    resp_non_admin = client.post(
        "/api/admin/reset-twin",
        headers={"Authorization": f"Bearer {non_admin_token}"},
    )
    assert resp_non_admin.status_code == 403

    # 3. Valid admin token -> 200 OK
    admin_token = create_token("admin")
    resp_admin = client.post(
        "/api/admin/reset-twin",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_admin.status_code == 200
    assert "Digital twin reset" in resp_admin.json()["message"]


def test_detect_image_magic_bytes_validation():
    """Verify files with fake image MIME type but invalid magic bytes are rejected."""
    fake_data = b"This is a text file masquerading as an image."
    resp = client.post(
        "/api/detect",
        files={"file": ("test.jpg", io.BytesIO(fake_data), "image/jpeg")},
    )
    assert resp.status_code == 400
    assert "valid image format" in resp.json()["detail"]


def test_detect_valid_image_magic(monkeypatch):
    """Verify valid JPEG magic bytes pass initial validation and reach detector."""
    from unittest.mock import MagicMock
    from app.schemas import DetectionResult

    mock_detect = MagicMock(return_value=[
        DetectionResult(
            waste_class="recyclable",
            confidence=0.92,
            raw_label="bottle",
            description="Recyclable plastic bottle",
            data_source="detected",
        )
    ])
    monkeypatch.setattr("app.main.detect_waste", mock_detect)

    valid_jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * 32
    resp = client.post(
        "/api/detect",
        files={"file": ("test.jpg", io.BytesIO(valid_jpeg), "image/jpeg")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "detections" in data
    assert data["detections"][0]["waste_class"] == "recyclable"
    assert mock_detect.called
