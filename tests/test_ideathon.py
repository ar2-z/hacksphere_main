import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_ideathon_health(client):
    response = client.get("/api/v1/ideathon/health")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "ideathon"
    assert data["status"] == "ready"
