import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_get_bins():
    response = client.get("/api/bins")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 20
    first = data[0]
    assert "id" in first
    assert "name" in first
    assert "fill_level" in first
    assert "waste_type_mix" in first


def test_get_single_bin():
    response = client.get("/api/bins/1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1


def test_simulate_baseline():
    response = client.post("/api/simulate", json={"hours": 24})
    assert response.status_code == 200
    data = response.json()
    assert "baseline" in data
    assert data["baseline"]["overflow_incidents"] >= 0
    assert data["baseline"]["estimated_co2_kg"] >= 0


def test_simulate_with_scenario():
    payload = {
        "hours": 24,
        "scenario": {
            "name": "Add Extra Bins",
            "scenario_type": "add_bins",
            "parameters": {
                "zone_name": "Food Court",
                "count": 2,
                "capacity_liters": 120,
            },
        },
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["scenario"] is not None
    assert "diff" in data


def test_scenarios_flow():
    # Save a scenario
    payload = {
        "name": "Pickup Frequency Boost",
        "scenario_type": "change_frequency",
        "parameters": {"zone_name": "Medical Center", "frequency_multiplier": 2.0},
        "simulation_hours": 12,
    }
    create_resp = client.post("/api/scenarios", json=payload)
    assert create_resp.status_code == 200
    created = create_resp.json()
    assert created["name"] == "Pickup Frequency Boost"

    # List scenarios
    list_resp = client.get("/api/scenarios")
    assert list_resp.status_code == 200
    scenarios = list_resp.json()
    assert len(scenarios) >= 1


def test_report_pdf_generation():
    response = client.get("/api/report")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 1000
