"""
Simple in-memory sliding-window rate limiter.

No external dependencies required — uses Python stdlib only.
For multi-instance deployments, replace _attempts dict with a Redis backend.
"""

import time
from collections import defaultdict
from fastapi import HTTPException, Request, status

# Storage: {(endpoint, ip): [timestamp, ...]}
_attempts: dict = defaultdict(list)

# Configuration per endpoint
_LIMITS = {
    "login": {"max_attempts": 10, "window_seconds": 300},       # 10 per 5 min
    "forgot_password": {"max_attempts": 5, "window_seconds": 300},  # 5 per 5 min
    "verify_otp": {"max_attempts": 5, "window_seconds": 300},    # 5 per 5 min
}


def _check_rate_limit(endpoint: str, ip: str) -> None:
    """Raise HTTP 429 if the IP has exceeded the limit for the given endpoint."""
    config = _LIMITS.get(endpoint)
    if not config:
        return

    max_attempts = config["max_attempts"]
    window = config["window_seconds"]
    key = (endpoint, ip)
    now = time.time()
    window_start = now - window

    # Prune expired entries
    _attempts[key] = [t for t in _attempts[key] if t > window_start]

    if len(_attempts[key]) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many attempts. Please wait {window // 60} minutes before trying again.",
            headers={"Retry-After": str(window)},
        )

    _attempts[key].append(now)


def rate_limit_login(request: Request) -> None:
    """Rate limit the login endpoint."""
    _check_rate_limit("login", request.client.host if request.client else "unknown")


def rate_limit_forgot_password(request: Request) -> None:
    """Rate limit the forgot-password endpoint."""
    _check_rate_limit("forgot_password", request.client.host if request.client else "unknown")


def rate_limit_verify_otp(request: Request) -> None:
    """Rate limit the verify-otp endpoint."""
    _check_rate_limit("verify_otp", request.client.host if request.client else "unknown")
