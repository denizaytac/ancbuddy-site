from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass
from datetime import UTC, datetime

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import HTTPException, Request, status

from .config import Settings


@dataclass(frozen=True)
class Principal:
    subject: str = "ceo"
    method: str = "session"


class AuthService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._password_hasher = PasswordHasher()

    def verify_password(self, password: str) -> bool:
        if self.is_valid_api_token(password):
            return True
        if self.settings.ceo_password_hash:
            try:
                return self._password_hasher.verify(self.settings.ceo_password_hash, password)
            except (VerifyMismatchError, InvalidHashError):
                return False
        if self.settings.app_env in {"development", "test"} and self.settings.ceo_password:
            return secrets.compare_digest(self.settings.ceo_password, password)
        return False

    def is_valid_api_token(self, token: str) -> bool:
        if not self.settings.ceo_api_token or not secrets.compare_digest(
            self.settings.ceo_api_token, token
        ):
            return False
        expires_at = self.settings.ceo_api_token_expires_at
        if expires_at is None:
            return True
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        return expires_at > datetime.now(UTC)

    def issue_session(self, *, api_token_login: bool = False) -> str:
        expires_at = int(time.time()) + self.settings.session_ttl_seconds
        if api_token_login and self.settings.ceo_api_token_expires_at:
            configured_expiry = self.settings.ceo_api_token_expires_at
            if configured_expiry.tzinfo is None:
                configured_expiry = configured_expiry.replace(tzinfo=UTC)
            expires_at = min(expires_at, int(configured_expiry.timestamp()))
        payload = {
            "sub": "ceo",
            "iat": int(time.time()),
            "exp": expires_at,
            "nonce": secrets.token_urlsafe(12),
        }
        encoded = self._b64(json.dumps(payload, separators=(",", ":")).encode())
        signature = self._sign(encoded)
        return f"{encoded}.{signature}"

    def verify_session(self, token: str) -> bool:
        try:
            encoded, signature = token.split(".", 1)
            if not hmac.compare_digest(signature, self._sign(encoded)):
                return False
            payload = json.loads(self._unb64(encoded))
            return payload.get("sub") == "ceo" and int(payload.get("exp", 0)) > int(time.time())
        except (ValueError, TypeError, json.JSONDecodeError):
            return False

    async def require_ceo(self, request: Request) -> Principal:
        authorization = request.headers.get("authorization", "")
        if authorization.lower().startswith("bearer "):
            token = authorization[7:].strip()
            if self.is_valid_api_token(token):
                return Principal(method="api_token")
            if self.verify_session(token):
                return Principal(method="bearer_session")

        cookie = request.cookies.get(self.settings.cookie_name)
        if cookie and self.verify_session(cookie):
            return Principal(method="cookie")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    async def require_run_operator(self, request: Request) -> Principal:
        authorization = request.headers.get("authorization", "")
        if authorization.lower().startswith("bearer ") and self.settings.scheduler_api_token:
            token = authorization[7:].strip()
            if secrets.compare_digest(token, self.settings.scheduler_api_token):
                return Principal(subject="scheduler", method="scheduler_token")
        return await self.require_ceo(request)

    def _sign(self, encoded: str) -> str:
        digest = hmac.new(
            self.settings.session_secret.encode(), encoded.encode(), hashlib.sha256
        ).digest()
        return self._b64(digest)

    @staticmethod
    def _b64(value: bytes) -> str:
        return base64.urlsafe_b64encode(value).decode().rstrip("=")

    @staticmethod
    def _unb64(value: str) -> bytes:
        return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
