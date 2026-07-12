from __future__ import annotations

import asyncio
import secrets
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .agent import AgentsSDKPlanner, Planner
from .adapters.github import GitHubTokenError
from .approval import ApprovalBlocked, ApprovalService
from .config import Settings, get_settings
from .credentials import CredentialError
from .integrations import IntegrationService
from .models import (
    DecisionRequest,
    EnableIntegrationRequest,
    GitHubIntegrationUpdate,
    LoginRequest,
    ManualOutcomeRequest,
    RunKind,
    RunRequest,
)
from .security import AuthService, Principal
from .service import ExecutionService, InternalScheduler, RunCoordinator
from .store import ConflictError, GrowthStore, NotFoundError, build_store


def create_app(
    settings: Settings | None = None,
    store: GrowthStore | None = None,
    planner: Planner | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    store = store or build_store(settings)
    planner = planner or AgentsSDKPlanner(settings)
    auth = AuthService(settings)
    coordinator = RunCoordinator(settings, store, planner)
    executor = ExecutionService(settings, store)
    approvals = ApprovalService(settings, store)
    integrations = IntegrationService(settings, store)
    scheduler = InternalScheduler(settings, coordinator)
    scheduler_task: asyncio.Task | None = None
    executor_task: asyncio.Task | None = None

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        nonlocal scheduler_task, executor_task
        await coordinator.recover()
        executor_task = asyncio.create_task(executor.run())
        if settings.scheduler_enabled:
            scheduler_task = asyncio.create_task(scheduler.run())
        yield
        if scheduler_task:
            await scheduler.stop()
            await scheduler_task
        await executor.stop()
        if executor_task:
            await executor_task
        await coordinator.shutdown()
        await store.close()

    app = FastAPI(
        title="ANCBuddy Growth Agent",
        version="0.1.0",
        docs_url="/docs" if settings.app_env != "production" else None,
        redoc_url=None,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.ceo_origin],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
    )

    @app.exception_handler(NotFoundError)
    async def not_found_handler(_: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(_: Request, exc: RequestValidationError):
        # FastAPI normally includes the rejected raw input. Tokens/passwords
        # must never be reflected into a response, proxy log, or browser error.
        safe_errors = [
            {
                "type": error.get("type"),
                "loc": error.get("loc"),
                "msg": error.get("msg"),
            }
            for error in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": safe_errors})

    @app.exception_handler(ConflictError)
    async def conflict_handler(_: Request, exc: ConflictError):
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(ApprovalBlocked)
    async def approval_blocked_handler(_: Request, exc: ApprovalBlocked):
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(GitHubTokenError)
    async def github_token_handler(_: Request, exc: GitHubTokenError):
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(CredentialError)
    async def credential_handler(_: Request, exc: CredentialError):
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    @app.get("/health")
    async def health():
        store_healthy = await store.healthy()
        executor_alive = executor_task is not None and not executor_task.done()
        executor_ready = executor_alive and (
            settings.execution_mode != "live" or executor.last_error_type is None
        )
        body = {
            "status": "ok" if store_healthy and executor_ready else "degraded",
            "service": "ancbuddy-growth-agent",
            "store": store.name,
            "agent_ready": settings.agent_ready,
            "execution_mode": settings.execution_mode,
            "executor_alive": executor_alive,
            "executor_ready": executor_ready,
            "executor_last_error": executor.last_error_type,
        }
        return JSONResponse(
            status_code=200 if store_healthy and executor_ready else 503,
            content=body,
        )

    @app.post("/api/auth/login")
    async def login(payload: LoginRequest, response: Response):
        password = payload.password.get_secret_value()
        if not auth.verify_password(password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = auth.issue_session(api_token_login=auth.is_valid_api_token(password))
        response.set_cookie(
            settings.cookie_name,
            token,
            max_age=settings.session_ttl_seconds,
            httponly=True,
            secure=settings.cookie_secure,
            samesite="strict",
            path="/",
        )
        return {"ok": True}

    @app.post("/api/auth/logout", status_code=204)
    async def logout(response: Response):
        response.delete_cookie(
            settings.cookie_name,
            httponly=True,
            secure=settings.cookie_secure,
            samesite="strict",
            path="/",
        )

    @app.get("/api/auth/me")
    async def me(principal: Principal = Depends(auth.require_ceo)):
        return {"authenticated": True, "subject": principal.subject}

    @app.get("/api/dashboard")
    async def dashboard(_: Principal = Depends(auth.require_ceo)):
        value = await coordinator.dashboard()
        return value.model_dump(mode="json", exclude_none=True)

    @app.post("/api/runs/{kind}")
    async def create_run(
        kind: RunKind,
        background_tasks: BackgroundTasks,
        response: Response,
        payload: RunRequest | None = None,
        idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
        _: Principal = Depends(auth.require_run_operator),
    ):
        payload = payload or RunRequest()
        key = idempotency_key or f"api:{kind}:{secrets.token_urlsafe(18)}"
        run, created = await coordinator.enqueue(kind, payload, key)
        if created:
            background_tasks.add_task(coordinator.execute, run)
            response.status_code = status.HTTP_202_ACCEPTED
        else:
            response.status_code = status.HTTP_200_OK
        return run

    @app.post("/api/actions/{action_id}/decisions")
    async def decide(
        action_id: str,
        payload: DecisionRequest,
        _: Principal = Depends(auth.require_ceo),
    ):
        try:
            payload.validate_semantics()
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        enqueue_provider = None
        if payload.decision == "approve":
            current = await store.get_action(action_id)
            await approvals.require_ready(current)
            if approvals.is_website(current):
                enqueue_provider = "github"
        action, approval = await store.decide_action(
            action_id, payload, enqueue_provider=enqueue_provider
        )
        if approval and enqueue_provider:
            executor.wake()
        dashboard_value = await coordinator.dashboard()
        return {"dashboard": dashboard_value.model_dump(mode="json", exclude_none=True)}

    @app.get("/api/integrations/github")
    async def github_integration(_: Principal = Depends(auth.require_ceo)):
        return await integrations.view("github")

    @app.put("/api/integrations/github")
    async def save_github_integration(
        payload: GitHubIntegrationUpdate,
        _: Principal = Depends(auth.require_ceo),
    ):
        return await integrations.save_github(payload.token.get_secret_value())

    @app.delete("/api/integrations/github", status_code=204)
    async def delete_github_integration(_: Principal = Depends(auth.require_ceo)):
        await integrations.delete("github")

    @app.post("/api/integrations/github/enable")
    async def enable_github_integration(
        payload: EnableIntegrationRequest,
        _: Principal = Depends(auth.require_ceo),
    ):
        if settings.execution_mode != "live":
            raise ConflictError("Set EXECUTION_MODE=live before enabling GitHub execution")
        value = await integrations.enable("github", payload.mode)
        executor.wake()
        return value

    @app.get("/api/executions/{job_id}")
    async def execution(job_id: str, _: Principal = Depends(auth.require_ceo)):
        job = await store.get_execution_job(job_id)
        return job.summary()

    @app.post("/api/actions/{action_id}/manual-outcomes")
    async def manual_outcome(
        action_id: str,
        payload: ManualOutcomeRequest,
        _: Principal = Depends(auth.require_ceo),
    ):
        await store.record_manual_outcome(action_id, payload)
        dashboard_value = await coordinator.dashboard()
        return {"dashboard": dashboard_value.model_dump(mode="json", exclude_none=True)}

    app.state.settings = settings
    app.state.store = store
    app.state.coordinator = coordinator
    app.state.executor = executor
    return app


# Imported by ASGI servers and the local entrypoint.
app = create_app()
