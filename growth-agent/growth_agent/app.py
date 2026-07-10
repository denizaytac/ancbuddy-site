from __future__ import annotations

import asyncio
import secrets
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .agent import AgentsSDKPlanner, Planner
from .config import Settings, get_settings
from .models import DecisionRequest, LoginRequest, RunKind, RunRequest
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
    scheduler = InternalScheduler(settings, coordinator)
    scheduler_task: asyncio.Task | None = None

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        nonlocal scheduler_task
        await coordinator.recover()
        if settings.scheduler_enabled:
            scheduler_task = asyncio.create_task(scheduler.run())
        yield
        if scheduler_task:
            await scheduler.stop()
            await scheduler_task
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
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
    )

    @app.exception_handler(NotFoundError)
    async def not_found_handler(_: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(ConflictError)
    async def conflict_handler(_: Request, exc: ConflictError):
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.get("/health")
    async def health():
        store_healthy = await store.healthy()
        body = {
            "status": "ok" if store_healthy else "degraded",
            "service": "ancbuddy-growth-agent",
            "store": store.name,
            "agent_ready": settings.agent_ready,
            "execution_mode": settings.execution_mode,
        }
        return JSONResponse(status_code=200 if store_healthy else 503, content=body)

    @app.post("/api/auth/login")
    async def login(payload: LoginRequest, response: Response):
        if not auth.verify_password(payload.token):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = auth.issue_session()
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
        background_tasks: BackgroundTasks,
        _: Principal = Depends(auth.require_ceo),
    ):
        try:
            payload.validate_semantics()
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        action, approval = await store.decide_action(action_id, payload)
        if approval:
            background_tasks.add_task(
                executor.execute,
                action.id,
                action.version,
                approval.content_hash,
            )
        dashboard_value = await coordinator.dashboard()
        return {"dashboard": dashboard_value.model_dump(mode="json", exclude_none=True)}

    app.state.settings = settings
    app.state.store = store
    app.state.coordinator = coordinator
    app.state.executor = executor
    return app


# Imported by ASGI servers and the local entrypoint.
app = create_app()
