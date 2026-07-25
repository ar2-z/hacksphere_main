import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_clues_health(client):
    response = client.get("/api/v1/clues/health")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "clues"
    assert data["status"] == "ready"


def test_clues_list(client):
    response = client.get("/api/v1/clues/?competition_id=1")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "total" in data
