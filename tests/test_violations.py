import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_violations_health(client):
    response = client.get("/api/v1/violations/my-count")
    assert response.status_code in [200, 401, 403]
