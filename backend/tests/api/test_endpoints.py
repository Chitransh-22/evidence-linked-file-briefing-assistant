import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_health_check_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_auth_login_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Invalid password
        bad_resp = await ac.post("/api/v1/auth/login", json={"username": "admin", "password": "WrongPassword"})
        assert bad_resp.status_code == 401

        # Valid login
        good_resp = await ac.post("/api/v1/auth/login", json={"username": "admin", "password": "AdminSecureGov2026!"})
        assert good_resp.status_code == 200
        body = good_resp.json()
        assert "access_token" in body
        assert body["user"]["role"] == "system_administrator"


@pytest.mark.asyncio
async def test_cases_api_authorized():
    transport = ASGITransport(app=app)
    token = create_access_token({"sub": "admin", "role": "system_administrator"})
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/v1/cases", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert data["total"] >= 1


@pytest.mark.asyncio
async def test_evidence_api_authorized():
    transport = ASGITransport(app=app)
    token = create_access_token({"sub": "investigator", "role": "investigating_officer"})
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/v1/evidence", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data


@pytest.mark.asyncio
async def test_admin_rbac_protection():
    transport = ASGITransport(app=app)
    # Intake officer should NOT have access to admin users list
    token = create_access_token({"sub": "intake_officer", "role": "intake_officer"})
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/v1/admin/users", headers=headers)
        assert resp.status_code == 403
