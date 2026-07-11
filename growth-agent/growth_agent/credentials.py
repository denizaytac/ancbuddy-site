from __future__ import annotations

import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class CredentialError(RuntimeError):
    pass


class CredentialCipher:
    """Small AES-GCM envelope. Plaintext credentials never leave this boundary."""

    VERSION = 1

    def __init__(self, configured_key: str | None):
        if not configured_key:
            raise CredentialError("INTEGRATION_ENCRYPTION_KEY is not configured")
        self.key = self._decode_key(configured_key)
        self.aes = AESGCM(self.key)

    @staticmethod
    def _decode_key(value: str) -> bytes:
        raw = value.strip()
        try:
            decoded = base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4))
        except (ValueError, TypeError):
            decoded = b""
        if len(decoded) == 32:
            return decoded
        if len(raw) >= 32:
            # Supports high-entropy password-manager values while always producing
            # the 256-bit key required by AES-GCM.
            return hashlib.sha256(raw.encode("utf-8")).digest()
        raise CredentialError("INTEGRATION_ENCRYPTION_KEY must contain at least 32 characters")

    def encrypt(self, provider: str, plaintext: str) -> tuple[str, str]:
        nonce = os.urandom(12)
        associated_data = f"ancbuddy:{provider}:v{self.VERSION}".encode()
        ciphertext = self.aes.encrypt(nonce, plaintext.encode(), associated_data)
        return (
            base64.urlsafe_b64encode(ciphertext).decode().rstrip("="),
            base64.urlsafe_b64encode(nonce).decode().rstrip("="),
        )

    def decrypt(self, provider: str, ciphertext: str, nonce: str) -> str:
        try:
            decoded = base64.urlsafe_b64decode(
                ciphertext + "=" * (-len(ciphertext) % 4)
            )
            decoded_nonce = base64.urlsafe_b64decode(nonce + "=" * (-len(nonce) % 4))
            associated_data = f"ancbuddy:{provider}:v{self.VERSION}".encode()
            return self.aes.decrypt(decoded_nonce, decoded, associated_data).decode()
        except Exception as exc:
            raise CredentialError("Stored credential could not be decrypted") from exc
