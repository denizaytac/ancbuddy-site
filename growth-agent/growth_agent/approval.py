from __future__ import annotations

from email.utils import parseaddr
from urllib.parse import urlencode

from .adapters.github import GitHubContentError, validate_approved_files
from .config import Settings
from .models import GrowthAction
from .store import GrowthStore


class ApprovalBlocked(ValueError):
    pass


class ApprovalService:
    def __init__(self, settings: Settings, store: GrowthStore):
        self.settings = settings
        self.store = store

    @staticmethod
    def is_email(action: GrowthAction) -> bool:
        return action.type == "email"

    @staticmethod
    def is_website(action: GrowthAction) -> bool:
        return action.type == "site_pr"

    async def blocker(self, action: GrowthAction) -> str | None:
        if self.is_email(action):
            content = action.content
            recipient = (content.to or "").strip()
            parsed = parseaddr(recipient)[1]
            if (
                not recipient
                or parsed != recipient
                or "@" not in parsed
                or any(separator in recipient for separator in (",", ";", "\n", "\r"))
            ):
                return "Email draft needs exactly one concrete recipient"
            if not (content.subject and content.subject.strip() and content.body and content.body.strip()):
                return "Email draft needs a subject and body"
            return None
        if self.is_website(action):
            if self.settings.execution_mode != "live":
                return "Live draft-PR execution is not enabled"
            try:
                validate_approved_files(
                    action.content.model_dump(exclude_none=True).get("files")
                )
            except GitHubContentError as exc:
                return str(exc)
            integration = await self.store.get_integration("github")
            if not integration or integration.status != "ready":
                return "Connect and validate GitHub before approving"
            if integration.mode not in {"canary", "live"}:
                return "Enable the GitHub canary or live mode before approving"
            if integration.configuration.get("repository") != self.settings.github_repository:
                return "GitHub integration is connected to the wrong repository"
            return None
        return "This channel is draft-only and has no approved execution path"

    async def require_ready(self, action: GrowthAction) -> None:
        blocker = await self.blocker(action)
        if blocker:
            raise ApprovalBlocked(blocker)

    async def annotate(self, action: GrowthAction) -> GrowthAction:
        value = action.model_copy(deep=True)
        if value.status == "awaiting_approval":
            value.approval_blocker = await self.blocker(value)
            value.approval_ready = value.approval_blocker is None
        else:
            value.approval_ready = False
        if self.is_email(value) and value.status == "approved":
            value.gmail_compose_url = gmail_compose_url(value)
        return value


def gmail_compose_url(action: GrowthAction) -> str:
    content = action.content
    query = urlencode(
        {
            "view": "cm",
            "fs": "1",
            "to": content.to or "",
            "su": content.subject or "",
            "body": content.body or "",
        }
    )
    return f"https://mail.google.com/mail/?{query}"
