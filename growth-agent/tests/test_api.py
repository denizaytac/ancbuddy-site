from __future__ import annotations


def test_health_is_public_and_safe(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ancbuddy-growth-agent",
        "store": "memory",
        "agent_ready": False,
        "execution_mode": "simulation",
        "executor_alive": True,
        "executor_ready": True,
        "executor_last_error": None,
    }


def test_login_sets_httponly_cookie_and_me_works(client):
    response = client.post("/api/auth/login", json={"token": "correct-horse"})
    assert response.status_code == 200
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "SameSite=strict" in response.headers["set-cookie"]
    assert client.get("/api/auth/me").json()["authenticated"] is True


def test_invalid_login_and_unauthenticated_dashboard_are_rejected(client):
    assert client.post("/api/auth/login", json={"token": "wrong"}).status_code == 401
    assert client.get("/api/dashboard").status_code == 401


def test_sensitive_validation_errors_never_reflect_tokens(client, auth_headers):
    marker = "BADTOKEN_SUPER_SECRET_DO_NOT_REFLECT"
    integration = client.put(
        "/api/integrations/github",
        headers=auth_headers,
        json={"token": marker},
    )
    assert integration.status_code == 422
    assert marker not in integration.text

    oversized = marker * 30
    login = client.post("/api/auth/login", json={"token": oversized})
    assert login.status_code == 422
    assert marker not in login.text


def test_dashboard_contract(client, auth_headers):
    response = client.get("/api/dashboard", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["goal"] == {"target": 1000.0, "earned": 100.0, "currency": "EUR"}
    assert body["metrics"] == {"trial_downloads": 12, "replies": 2, "revenue": 40.0}
    assert body["actions"] == []
    assert set(body["activity"]) == {"next_run", "agent_note"}
    assert "Simulation" in body["activity"]["agent_note"]


def test_scheduler_token_is_scoped_to_runs(client):
    scheduler = {"Authorization": "Bearer scheduler-api-token", "Idempotency-Key": "job-1"}
    assert client.get("/api/dashboard", headers=scheduler).status_code == 401
    response = client.post("/api/runs/daily", headers=scheduler, json={"trigger": "github"})
    assert response.status_code == 202
    assert response.json()["idempotency_key"] == "job-1"


def test_run_idempotency_returns_existing_run(client, auth_headers):
    headers = {**auth_headers, "Idempotency-Key": "same-run"}
    first = client.post("/api/runs/weekly", headers=headers, json={"focus": "reviewers"})
    second = client.post("/api/runs/weekly", headers=headers, json={"focus": "ignored"})
    assert first.status_code == 202
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


def test_approval_endpoint_leaves_action_approved_in_simulation(client, auth_headers):
    run = client.post(
        "/api/runs/manual",
        headers={**auth_headers, "Idempotency-Key": "approval-case"},
        json={},
    )
    assert run.status_code == 202
    dashboard = client.get("/api/dashboard", headers=auth_headers).json()
    action = dashboard["actions"][0]
    approved = client.post(
        f"/api/actions/{action['id']}/decisions",
        headers=auth_headers,
        json={"decision": "approve", "expected_version": action["version"]},
    )
    assert approved.status_code == 200
    approved_action = approved.json()["dashboard"]["actions"][0]
    assert approved_action["status"] == "approved"
    assert approved_action["version"] == action["version"] + 1


def test_cors_is_exact_and_credentialed(client):
    allowed = client.options(
        "/api/dashboard",
        headers={
            "Origin": "https://ancbuddy.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert allowed.headers["access-control-allow-origin"] == "https://ancbuddy.com"
    assert allowed.headers["access-control-allow-credentials"] == "true"
    denied = client.options(
        "/api/dashboard",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in denied.headers
