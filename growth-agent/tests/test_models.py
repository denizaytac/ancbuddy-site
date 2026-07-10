import pytest
from agents import AgentOutputSchema

from growth_agent.config import Settings
from growth_agent.models import AgentPlan, DecisionRequest


def test_change_requires_feedback_or_content():
    request = DecisionRequest(decision="change", expected_version=1)
    with pytest.raises(ValueError):
        request.validate_semantics()


def test_production_rejects_plaintext_password_and_unsafe_cookie():
    with pytest.raises(ValueError):
        Settings(
            app_env="production",
            ceo_password="plaintext",
            session_secret="strong",
            cookie_secure=False,
            store_backend="memory",
        )


def test_agent_output_schema_is_strict():
    schema = AgentOutputSchema(AgentPlan)
    assert schema.is_strict_json_schema() is True
