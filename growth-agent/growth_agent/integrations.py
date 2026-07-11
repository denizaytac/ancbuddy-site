from __future__ import annotations

import httpx

from .adapters.github import GitHubClient, GitHubTokenError
from .config import Settings
from .credentials import CredentialCipher
from .models import IntegrationRecord, IntegrationView, utc_now
from .store import GrowthStore


class IntegrationService:
    def __init__(self, settings: Settings, store: GrowthStore):
        self.settings = settings
        self.store = store

    async def view(self, provider: str) -> IntegrationView:
        integration = await self.store.get_integration(provider)
        if not integration:
            return IntegrationView(
                provider=provider,
                configured=False,
                repository=(
                    self.settings.github_repository if provider == "github" else None
                ),
                mode="disabled",
                status="unconfigured",
            )
        return IntegrationView(
            provider=provider,
            configured=bool(
                integration.credential_ciphertext and integration.credential_nonce
            ),
            repository=str(integration.configuration.get("repository") or "") or None,
            mode=integration.mode,
            status=integration.status,
            succeeded_count=integration.succeeded_count,
            last_tested_at=integration.last_validated_at,
            last_error=integration.last_error,
        )

    async def save_github(self, token: str) -> IntegrationView:
        token = token.strip()
        if not token.startswith("github_pat_") or not 20 <= len(token) <= 512:
            raise GitHubTokenError("Use a valid fine-grained GitHub token (github_pat_...)")
        repository = self.settings.github_repository
        try:
            async with GitHubClient(token, repository) as github:
                checked = await github.validate_token(repository)
        except GitHubTokenError:
            raise
        except httpx.HTTPError as exc:
            raise GitHubTokenError("GitHub token validation is currently unavailable") from exc
        cipher = CredentialCipher(self.settings.integration_encryption_key)
        ciphertext, nonce = cipher.encrypt("github", token)
        now = utc_now()
        record = IntegrationRecord(
            provider="github",
            status="ready",
            mode="disabled",
            credential_ciphertext=ciphertext,
            credential_nonce=nonce,
            credential_key_version=CredentialCipher.VERSION,
            configuration={"repository": checked.repository, "base_branch": "main"},
            metadata={
                "repository_id": checked.repository_id,
                "default_branch": checked.default_branch,
                "contents_write_verified": True,
                "pull_requests_write_check": "verified_on_first_draft_pr",
            },
            last_validated_at=now,
            last_error=None,
        )
        await self.store.save_integration(record)
        return await self.view("github")

    async def delete(self, provider: str) -> None:
        await self.store.delete_integration(provider)

    async def enable(self, provider: str, mode: str) -> IntegrationView:
        await self.store.enable_integration(provider, mode)
        return await self.view(provider)

    def decrypt(self, integration: IntegrationRecord) -> str:
        if not (
            integration.credential_ciphertext and integration.credential_nonce
        ):
            raise GitHubTokenError("GitHub integration has no stored credential")
        cipher = CredentialCipher(self.settings.integration_encryption_key)
        return cipher.decrypt(
            integration.provider,
            integration.credential_ciphertext,
            integration.credential_nonce,
        )
