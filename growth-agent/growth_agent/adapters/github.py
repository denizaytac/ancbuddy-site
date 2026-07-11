from __future__ import annotations

import base64
import re
from pathlib import PurePosixPath
from urllib.parse import quote

import httpx

from ..config import Settings
from ..models import ApprovalSnapshot, ExecutionResult, GrowthAction


class GitHubPRAdapter:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def execute(
        self, action: GrowthAction, approval: ApprovalSnapshot
    ) -> ExecutionResult:
        if not self.settings.github_token or not self.settings.github_repository:
            return ExecutionResult(
                status="integration_required",
                provider="github",
                details={"reason": "GITHUB_TOKEN and GITHUB_REPOSITORY are required"},
            )
        content = approval.approved_content
        files = content.get("files")
        title = str(content.get("title") or action.title).strip()
        body = str(content.get("body") or content.get("preview") or "").strip()
        if not isinstance(files, list) or not files or not title:
            return ExecutionResult(
                status="failed",
                provider="github",
                details={"reason": "Approved website action needs title and files"},
            )
        for item in files:
            if not isinstance(item, dict) or not self._safe_path(str(item.get("path", ""))):
                return ExecutionResult(
                    status="failed",
                    provider="github",
                    details={"reason": "Approved file path is invalid"},
                )
            if not isinstance(item.get("content"), str):
                return ExecutionResult(
                    status="failed",
                    provider="github",
                    details={"reason": "Approved file content must be text"},
                )

        headers = {
            "authorization": f"Bearer {self.settings.github_token}",
            "accept": "application/vnd.github+json",
            "x-github-api-version": "2022-11-28",
        }
        base = self.settings.github_base_branch
        branch = f"growth/action-{self._slug(action.id)}-v{action.version}"
        api = f"https://api.github.com/repos/{self.settings.github_repository}"
        try:
            async with httpx.AsyncClient(headers=headers, timeout=30) as client:
                ref_response = await client.get(f"{api}/git/ref/heads/{quote(base, safe='')}")
                ref_response.raise_for_status()
                base_sha = ref_response.json()["object"]["sha"]
                create_ref = await client.post(
                    f"{api}/git/refs", json={"ref": f"refs/heads/{branch}", "sha": base_sha}
                )
                create_ref.raise_for_status()
                for item in files:
                    path = str(item["path"])
                    existing = await client.get(
                        f"{api}/contents/{quote(path, safe='/')}", params={"ref": base}
                    )
                    payload = {
                        "message": f"Growth action: {title}",
                        "content": base64.b64encode(item["content"].encode()).decode(),
                        "branch": branch,
                    }
                    if existing.status_code == 200:
                        payload["sha"] = existing.json()["sha"]
                    elif existing.status_code != 404:
                        existing.raise_for_status()
                    update = await client.put(
                        f"{api}/contents/{quote(path, safe='/')}", json=payload
                    )
                    update.raise_for_status()
                pr = await client.post(
                    f"{api}/pulls",
                    json={"title": title, "body": body, "head": branch, "base": base, "draft": True},
                )
                pr.raise_for_status()
        except (httpx.HTTPError, KeyError) as exc:
            return ExecutionResult(
                status="failed", provider="github", details={"reason": type(exc).__name__}
            )
        payload = pr.json()
        return ExecutionResult(
            status="executed",
            provider="github",
            external_id=str(payload.get("number")),
            details={"url": payload.get("html_url"), "draft": True},
        )

    @staticmethod
    def _safe_path(value: str) -> bool:
        path = PurePosixPath(value)
        return bool(value and not path.is_absolute() and ".." not in path.parts and "\\" not in value)

    @staticmethod
    def _slug(value: str) -> str:
        return re.sub(r"[^a-zA-Z0-9-]", "-", value).strip("-")[:40]
