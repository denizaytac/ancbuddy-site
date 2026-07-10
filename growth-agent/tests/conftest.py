from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from growth_agent.app import create_app
from growth_agent.config import Settings
from growth_agent.models import AgentPlan, Metrics
from growth_agent.store import InMemoryGrowthStore


class FakePlanner:
    async def plan(
        self, kind, metrics, previous_metrics, current_actions, feedback_context, focus
    ):
        return AgentPlan.model_validate(
            {
                "summary": f"{kind} analysis complete",
                "actions": [
                    {
                        "type": "email",
                        "title": "Ask one reviewer for a factual review",
                        "channel": "email",
                        "expected_upside": {"level": "medium", "detail": "One relevant audience"},
                        "evidence": {"level": "medium", "detail": "Public Mac app coverage"},
                        "risk": {"level": "low", "detail": "Single personal message"},
                        "content": {
                            "to": "reviewer@example.com",
                            "subject": "ANCBuddy review copy",
                            "body": "Would a review copy be useful?",
                            "preview": "One personal review request",
                        },
                    }
                ],
            }
        )


@pytest.fixture
def settings() -> Settings:
    return Settings(
        app_env="test",
        openai_api_key="",
        ceo_password="correct-horse",
        ceo_api_token="ceo-api-token",
        scheduler_api_token="scheduler-api-token",
        session_secret="test-session-secret-with-enough-entropy",
        cookie_secure=False,
        execution_mode="simulation",
        store_backend="memory",
        goal_target=1000,
        goal_earned_baseline=60,
        goal_currency="EUR",
        ceo_origin="https://ancbuddy.com",
    )


@pytest.fixture
def store() -> InMemoryGrowthStore:
    return InMemoryGrowthStore(Metrics(trial_downloads=12, replies=2, revenue=40))


@pytest.fixture
def client(settings, store):
    app = create_app(settings=settings, store=store, planner=FakePlanner())
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer ceo-api-token"}
