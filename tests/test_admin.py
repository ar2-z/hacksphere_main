import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_admin_health(client):
    response = client.get("/api/v1/admin/health")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "admin"
    assert data["status"] == "ready"


def test_admin_dashboard_unauthorized(client):
    response = client.get("/api/v1/admin/dashboard/1")
    assert response.status_code in [401, 403]
