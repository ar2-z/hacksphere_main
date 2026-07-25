import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_quiz_health(client):
    response = client.get("/api/v1/quiz/health")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "quiz"
    assert data["status"] == "ready"


def test_quiz_rounds_list(client):
    response = client.get("/api/v1/quiz/rounds?competition_id=1")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "total" in data
    assert "page" in data
