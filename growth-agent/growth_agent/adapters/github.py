from __future__ import annotations

import base64
import binascii
import re
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any
from urllib.parse import quote

import httpx

from ..config import Settings
from ..models import ApprovalSnapshot, ExecutionResult, GrowthAction


ALLOWED_PREFIXES = (
    "site-src/content/",
    "site-src/src/",
    "site-src/public/",
    "docs/growth/",
)
DENIED_PREFIXES = (
    ".github/workflows/",
    "growth-agent/",
    "supabase/migrations/",
    ".git/",
)
MAX_FILES = 10
MAX_TOTAL_BYTES = 1024 * 1024


@dataclass(frozen=True)
class GitHubTokenCheck:
    repository: str
    repository_id: int
    default_branch: str


class GitHubContentError(ValueError):
    pass


class GitHubTokenError(ValueError):
    pass


def validate_approved_files(files: Any) -> list[dict[str, str]]:
    if not isinstance(files, list) or not files:
        raise GitHubContentError("Website draft needs at least one file")
    if len(files) > MAX_FILES:
        raise GitHubContentError(f"Website draft may contain at most {MAX_FILES} files")
    validated: list[dict[str, str]] = []
    seen: set[str] = set()
    total_bytes = 0
    for item in files:
        if not isinstance(item, dict):
            raise GitHubContentError("Every approved file must contain path and content")
        path = str(item.get("path", ""))
        content = item.get("content")
        if not _safe_path(path):
            raise GitHubContentError(f"File path is not allowed: {path or '(empty)'}")
        if path in seen:
            raise GitHubContentError(f"Duplicate file path: {path}")
        if not isinstance(content, str):
            raise GitHubContentError("Approved file content must be text")
        total_bytes += len(content.encode("utf-8"))
        if total_bytes > MAX_TOTAL_BYTES:
            raise GitHubContentError("Website draft exceeds the 1 MB content limit")
        seen.add(path)
        validated.append({"path": path, "content": content})
    return validated


def _safe_path(value: str) -> bool:
    path = PurePosixPath(value)
    lowered = value.lower()
    if (
        not value
        or value != value.strip()
        or any(ord(character) < 32 for character in value)
        or path.is_absolute()
        or any(part in {"", ".", ".."} for part in path.parts)
        or "\\" in value
    ):
        return False
    if any(part == ".git" or part.startswith(".env") for part in path.parts):
        return False
    if any(
        path.parts[index : index + 2] == (".github", "workflows")
        for index in range(max(0, len(path.parts) - 1))
    ):
        return False
    if value.startswith(DENIED_PREFIXES) or lowered.startswith(".env"):
        return False
    return value.startswith(ALLOWED_PREFIXES)


class GitHubClient:
    def __init__(
        self,
        token: str,
        repository: str,
        *,
        client: httpx.AsyncClient | None = None,
        timeout: float = 30,
    ):
        self.repository = repository
        self.api = f"https://api.github.com/repos/{repository}"
        self._client = client
        self._owns_client = client is None
        self._headers = {
            "authorization": f"Bearer {token}",
            "accept": "application/vnd.github+json",
            "x-github-api-version": "2022-11-28",
        }
        self._timeout = timeout

    async def __aenter__(self) -> GitHubClient:
        if self._client is None:
            self._client = httpx.AsyncClient(headers=self._headers, timeout=self._timeout)
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("GitHubClient must be used as an async context manager")
        return self._client

    async def validate_token(self, expected_repository: str) -> GitHubTokenCheck:
        if self.repository.lower() != expected_repository.lower():
            raise GitHubTokenError("Token repository does not match the configured repository")
        response = await self.client.get(self.api)
        if response.status_code in {401, 403, 404}:
            raise GitHubTokenError("Token cannot access the ANCBuddy repository")
        response.raise_for_status()
        payload = response.json()
        full_name = str(payload.get("full_name", ""))
        permissions = payload.get("permissions") or {}
        if full_name.lower() != expected_repository.lower():
            raise GitHubTokenError("GitHub returned a different repository")
        # Repository `push` is GitHub's non-mutating signal for Contents:write.
        if permissions.get("push") is not True:
            raise GitHubTokenError("Token needs Contents: read and write")
        pulls = await self.client.get(f"{self.api}/pulls", params={"state": "open", "per_page": 1})
        if pulls.status_code in {401, 403, 404}:
            raise GitHubTokenError("Token needs Pull requests access")
        pulls.raise_for_status()
        return GitHubTokenCheck(
            repository=full_name,
            repository_id=int(payload["id"]),
            default_branch=str(payload.get("default_branch") or "main"),
        )

    async def find_pull_request(self, branch: str, base: str) -> dict[str, Any] | None:
        owner = self.repository.split("/", 1)[0]
        response = await self.client.get(
            f"{self.api}/pulls",
            params={"state": "all", "head": f"{owner}:{branch}", "base": base, "per_page": 1},
        )
        response.raise_for_status()
        rows = response.json()
        return rows[0] if rows else None

    async def ensure_branch(self, branch: str, base: str) -> None:
        branch_ref = f"{self.api}/git/ref/heads/{quote(branch, safe='')}"
        existing = await self.client.get(branch_ref)
        if existing.status_code == 200:
            return
        if existing.status_code != 404:
            existing.raise_for_status()
        base_response = await self.client.get(
            f"{self.api}/git/ref/heads/{quote(base, safe='')}"
        )
        base_response.raise_for_status()
        base_sha = base_response.json()["object"]["sha"]
        create = await self.client.post(
            f"{self.api}/git/refs", json={"ref": f"refs/heads/{branch}", "sha": base_sha}
        )
        if create.status_code == 422:
            # A concurrent/retried worker may have created the deterministic ref.
            reconcile = await self.client.get(branch_ref)
            reconcile.raise_for_status()
            return
        create.raise_for_status()

    async def put_file(self, branch: str, title: str, path: str, content: str) -> None:
        endpoint = f"{self.api}/contents/{quote(path, safe='/')}"
        existing = await self.client.get(endpoint, params={"ref": branch})
        payload: dict[str, Any] = {
            "message": f"Growth action: {title}",
            "content": base64.b64encode(content.encode()).decode(),
            "branch": branch,
        }
        if existing.status_code == 200:
            current = existing.json()
            encoded = str(current.get("content", "")).replace("\n", "")
            try:
                current_content = base64.b64decode(encoded).decode()
            except (binascii.Error, UnicodeDecodeError):
                current_content = ""
            if current_content == content:
                return
            payload["sha"] = current["sha"]
        elif existing.status_code != 404:
            existing.raise_for_status()
        update = await self.client.put(endpoint, json=payload)
        update.raise_for_status()

    async def create_pull_request(
        self, branch: str, base: str, title: str, body: str
    ) -> dict[str, Any]:
        response = await self.client.post(
            f"{self.api}/pulls",
            json={"title": title, "body": body, "head": branch, "base": base, "draft": True},
        )
        if response.status_code == 422:
            existing = await self.find_pull_request(branch, base)
            if existing:
                return existing
        response.raise_for_status()
        return response.json()


class GitHubPRAdapter:
    def __init__(
        self,
        settings: Settings,
        token: str,
        repository: str,
        *,
        client: httpx.AsyncClient | None = None,
    ):
        self.settings = settings
        self.token = token
        self.repository = repository
        self.client = client

    async def execute(
        self, action: GrowthAction, approval: ApprovalSnapshot
    ) -> ExecutionResult:
        content = approval.approved_content
        title = str(content.get("title") or action.title).strip()
        body = str(content.get("body") or content.get("preview") or "").strip()
        try:
            files = validate_approved_files(content.get("files"))
        except GitHubContentError as exc:
            return ExecutionResult(
                status="failed", provider="github", details={"reason": str(exc)}
            )
        if not title:
            return ExecutionResult(
                status="failed",
                provider="github",
                details={"reason": "Approved website action needs a title"},
            )

        base = self.settings.github_base_branch
        branch = f"growth/action-{_slug(action.id)}-v{approval.action_version}"
        github = GitHubClient(
            self.token, self.repository, client=self.client
        )
        try:
            async with github:
                existing_pr = await github.find_pull_request(branch, base)
                if existing_pr:
                    return _result(existing_pr, branch, reconciled=True)
                await github.ensure_branch(branch, base)
                for item in files:
                    await github.put_file(branch, title, item["path"], item["content"])
                pull_request = await github.create_pull_request(branch, base, title, body)
        except (httpx.TimeoutException, httpx.NetworkError):
            # A request can have reached GitHub before the connection failed. A
            # durable retry will reconcile the deterministic branch and PR.
            return ExecutionResult(
                status="unknown",
                provider="github",
                details={"reason": "GitHub response was ambiguous", "branch": branch},
            )
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            rate_limited = status_code == 403 and exc.response.headers.get(
                "x-ratelimit-remaining"
            ) == "0"
            if status_code in {409, 422, 429} or status_code >= 500 or rate_limited:
                # GitHub may have committed the write before returning a
                # conflict/rate-limit/server response. The next durable attempt
                # starts by reconciling the deterministic PR and branch.
                return ExecutionResult(
                    status="unknown",
                    provider="github",
                    details={
                        "reason": "GitHub write result requires reconciliation",
                        "branch": branch,
                        "status_code": status_code,
                    },
                )
            return ExecutionResult(
                status="failed",
                provider="github",
                details={"reason": "GitHub rejected the draft PR", "branch": branch},
            )
        except (httpx.HTTPError, KeyError) as exc:
            return ExecutionResult(
                status="failed",
                provider="github",
                details={"reason": type(exc).__name__, "branch": branch},
            )
        return _result(pull_request, branch, reconciled=False)

    @staticmethod
    def _safe_path(value: str) -> bool:
        return _safe_path(value)

    @staticmethod
    def _slug(value: str) -> str:
        return _slug(value)


def _result(payload: dict[str, Any], branch: str, *, reconciled: bool) -> ExecutionResult:
    return ExecutionResult(
        status="executed",
        provider="github",
        external_id=str(payload.get("number")),
        details={
            "url": payload.get("html_url"),
            "draft": bool(payload.get("draft", True)),
            "branch": branch,
            "reconciled": reconciled,
        },
    )


def _slug(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9-]", "-", value).strip("-")[:40]
