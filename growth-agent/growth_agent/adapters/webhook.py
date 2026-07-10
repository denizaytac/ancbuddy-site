from __future__ import annotations

import hashlib
import hmac
import json

import httpx

from ..config import Settings
from ..models import ApprovalSnapshot, ExecutionResult, GrowthAction


class WebhookAdapter:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def execute(
        self, action: GrowthAction, approval: ApprovalSnapshot
    ) -> ExecutionResult:
        if not self.settings.growth_webhook_url:
            return ExecutionResult(
                status="integration_required",
                provider="manual",
                details={"reason": f"No integration is configured for {action.channel}"},
            )
        payload = {
            "action_id": action.id,
            "version": action.version,
            "channel": action.channel,
            "type": action.type,
            "content_hash": approval.content_hash,
            "content": approval.approved_content,
        }
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        headers = {"content-type": "application/json"}
        headers["idempotency-key"] = (
            f"growth:{action.id}:v{action.version}:{approval.content_hash}"
        )
        if self.settings.growth_webhook_secret:
            headers["x-ancbuddy-signature"] = hmac.new(
                self.settings.growth_webhook_secret.encode(), encoded, hashlib.sha256
            ).hexdigest()
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    self.settings.growth_webhook_url, content=encoded, headers=headers
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            return ExecutionResult(
                status="failed", provider="webhook", details={"reason": type(exc).__name__}
            )
        return ExecutionResult(
            status="executed",
            provider="webhook",
            external_id=response.headers.get("x-request-id"),
        )
