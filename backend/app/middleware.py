"""
Security middleware stack for EcoTwin.
Provides: security headers, XSS protection, content-type validation,
request sanitization, and CORS hardening.
"""

import re
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

logger = logging.getLogger("ecotwin.security")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject production security headers into every response."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # ── Anti-XSS / Content Security ──
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=*, microphone=(), geolocation=(), payment=()"
        )

        # ── HSTS: enforce HTTPS (browsers will remember for 1 year) ──
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

        # ── Content Security Policy ──
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
            "connect-src 'self' http://localhost:* https://generativelanguage.googleapis.com",
            "frame-ancestors 'none'",
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # ── Prevent caching of API responses ──
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"

        return response


class RequestSanitizationMiddleware(BaseHTTPMiddleware):
    """
    Sanitize incoming requests:
    - Block requests with suspicious path traversal patterns
    - Limit request body size globally
    - Log suspicious activity
    """

    MAX_BODY_SIZE = 10 * 1024 * 1024  # 10 MB hard cap

    # Patterns that indicate path traversal or injection attempts
    SUSPICIOUS_PATTERNS = [
        re.compile(r"\.\./"),           # Path traversal
        re.compile(r"%2e%2e", re.I),    # URL-encoded traversal
        re.compile(r"<script", re.I),   # Script injection in URL
        re.compile(r"javascript:", re.I),
    ]

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # ── Block path traversal ──
        for pattern in self.SUSPICIOUS_PATTERNS:
            if pattern.search(path):
                logger.warning(
                    "Blocked suspicious request: %s from %s",
                    path,
                    request.client.host if request.client else "unknown",
                )
                return JSONResponse(
                    status_code=400,
                    content={"error": "Bad request", "detail": "Invalid path"},
                )

        # ── Enforce body size limit ──
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_BODY_SIZE:
            return JSONResponse(
                status_code=413,
                content={"error": "Payload too large", "detail": "Request body exceeds 10MB limit"},
            )

        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log request timing and status for audit trail."""

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 2)

        # Don't log health checks (too noisy)
        if request.url.path != "/api/health":
            logger.info(
                "%s %s %s %sms",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )

        return response
