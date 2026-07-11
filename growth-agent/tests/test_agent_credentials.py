from growth_agent import agent as agent_module
from growth_agent.config import Settings


def test_planner_registers_key_loaded_from_settings(monkeypatch):
    captured: list[str] = []
    monkeypatch.setattr(agent_module, "set_default_openai_key", captured.append)

    agent_module.AgentsSDKPlanner(
        Settings(app_env="test", openai_api_key="test-key-not-a-real-secret")
    )

    assert captured == ["test-key-not-a-real-secret"]


def test_planner_instructions_include_configured_hard_channel_blocks():
    planner = agent_module.AgentsSDKPlanner(
        Settings(app_env="test", blocked_channels="reddit, linkedin")
    )

    assert isinstance(planner.agent.instructions, str)
    assert "Hard channel blocklist: reddit, linkedin" in planner.agent.instructions
    assert "subreddit and r/... count as Reddit" in planner.agent.instructions
