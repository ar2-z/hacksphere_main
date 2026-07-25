import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_scores_health(client):
    response = client.get("/api/v1/scores/health")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "scores"
    assert data["status"] == "ready"


def test_leaderboard(client):
    response = client.get("/api/v1/scores/leaderboard/1")
    assert response.status_code == 200
    data = response.json()
    assert "entries" in data
    assert "total_teams" in data
