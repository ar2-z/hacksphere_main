import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "HackSphere"


def test_api_health(client):
    response = client.get("/api/v1/quiz/health")
    assert response.status_code == 200
    data = response.json()
    assert data["module"] == "quiz"
