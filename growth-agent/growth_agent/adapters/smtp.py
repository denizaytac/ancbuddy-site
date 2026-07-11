from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage
from email.utils import parseaddr

from ..config import Settings
from ..models import ApprovalSnapshot, ExecutionResult, GrowthAction


class SMTPAdapter:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def execute(
        self, action: GrowthAction, approval: ApprovalSnapshot
    ) -> ExecutionResult:
        if not self.settings.smtp_host or not self.settings.smtp_from:
            return ExecutionResult(
                status="integration_required",
                provider="smtp",
                details={"reason": "SMTP_HOST and SMTP_FROM are required"},
            )
        content = approval.approved_content
        recipients = content.get("to")
        if isinstance(recipients, str):
            recipients = [recipients]
        if not recipients or not all(self._valid_address(value) for value in recipients):
            return ExecutionResult(
                status="failed",
                provider="smtp",
                details={"reason": "Approved content has no valid recipient"},
            )
        subject = str(content.get("subject") or "").strip()
        body = str(content.get("body") or "").strip()
        if not subject or not body or "\n" in subject or "\r" in subject:
            return ExecutionResult(
                status="failed",
                provider="smtp",
                details={"reason": "Approved subject/body is invalid"},
            )

        sender_address = parseaddr(self.settings.smtp_from)[1]
        if "@" not in sender_address:
            return ExecutionResult(
                status="failed", provider="smtp", details={"reason": "SMTP_FROM is invalid"}
            )
        message = EmailMessage()
        message["From"] = self.settings.smtp_from
        message["To"] = ", ".join(recipients)
        message["Subject"] = subject
        sender_domain = sender_address.rsplit("@", 1)[-1]
        message["Message-ID"] = f"<growth-{action.id}-v{action.version}@{sender_domain}>"
        if reply_to := content.get("reply_to"):
            if not self._valid_address(str(reply_to)):
                return ExecutionResult(
                    status="failed", provider="smtp", details={"reason": "Invalid reply_to"}
                )
            message["Reply-To"] = str(reply_to)
        message.set_content(body)
        try:
            message_id = await asyncio.to_thread(self._send, message)
        except (OSError, smtplib.SMTPException) as exc:
            return ExecutionResult(
                status="failed",
                provider="smtp",
                details={"reason": type(exc).__name__},
            )
        return ExecutionResult(status="executed", provider="smtp", external_id=message_id)

    def _send(self, message: EmailMessage) -> str | None:
        with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port, timeout=30) as client:
            if self.settings.smtp_starttls:
                client.starttls()
            if self.settings.smtp_username:
                client.login(self.settings.smtp_username, self.settings.smtp_password or "")
            client.send_message(message)
        return message.get("Message-ID")

    @staticmethod
    def _valid_address(value: str) -> bool:
        if any(character in value for character in "\r\n"):
            return False
        _, address = parseaddr(value)
        return bool(address and "@" in address and address == value.strip())
