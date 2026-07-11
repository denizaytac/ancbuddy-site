from __future__ import annotations

from abc import ABC, abstractmethod

from ..config import Settings
from ..models import ApprovalSnapshot, ExecutionResult, GrowthAction


class Adapter(ABC):
    @abstractmethod
    async def execute(
        self, action: GrowthAction, approval: ApprovalSnapshot
    ) -> ExecutionResult: ...


class AdapterFactory:
    def __init__(self, settings: Settings):
        self.settings = settings

    def for_action(self, action: GrowthAction) -> Adapter:
        channel = action.channel.lower()
        action_type = action.type.lower()
        if channel == "email" or action_type == "email":
            from .smtp import SMTPAdapter

            return SMTPAdapter(self.settings)
        if channel in {"website", "github"} or action_type == "site_pr":
            from .github import GitHubPRAdapter

            return GitHubPRAdapter(self.settings)
        from .webhook import WebhookAdapter

        return WebhookAdapter(self.settings)
