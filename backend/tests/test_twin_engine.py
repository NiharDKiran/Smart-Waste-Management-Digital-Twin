import pytest
from datetime import datetime, timezone, timedelta
from app.twin.engine import Bin, Zone, Truck, TwinEngine, _haversine_km


def _make_engine() -> TwinEngine:
    engine = TwinEngine(emission_factors={
        "emission_factors": {
            "truck_per_km": {"value": 0.27},
            "overflow_cleanup": {"value": 2.5},
            "contamination_penalty": {"value": 0.15},
            "segregation_intervention_factor": {"value": 0.3},
        }
    })
    zone = Zone(id=1, name="Test Zone", zone_type="admin", pickup_frequency_hours=24)
    engine.add_zone(zone)
    truck = Truck(id=1, name="Test Truck", base_latitude=12.82, base_longitude=77.50)
    engine.add_truck(truck)
    return engine


def _make_bin(bin_id: int = 1, fill_level: float = 50.0, capacity: float = 120.0) -> Bin:
    return Bin(
        id=bin_id,
        name=f"Test Bin {bin_id}",
        zone_id=1,
        zone_name="Test Zone",
        zone_type="admin",
        latitude=12.82,
        longitude=77.50,
        capacity_liters=capacity,
        fill_level=fill_level,
        per_hour_fill_rate=3.0,
        waste_type_mix={"wet": 0.3, "dry": 0.3, "recyclable": 0.3, "hazardous": 0.1},
        contamination_score=0.2,
        last_collected=datetime.now(timezone.utc) - timedelta(hours=5),
    )


class TestBinProperties:
    def test_fill_percentage(self):
        b = _make_bin(fill_level=60.0, capacity=120.0)
        assert b.fill_percentage == 50.0

    def test_fill_percentage_capped_at_100(self):
        b = _make_bin(fill_level=200.0, capacity=120.0)
        assert b.fill_percentage == 100.0

    def test_hours_until_overflow(self):
        b = _make_bin(fill_level=90.0, capacity=120.0)
        assert b.hours_until_overflow == pytest.approx(10.0)

    def test_overflow_risk_when_close(self):
        b = _make_bin(fill_level=90.0, capacity=120.0)
        assert b.overflow_risk is True

    def test_no_overflow_risk_when_far(self):
        b = _make_bin(fill_level=10.0, capacity=120.0)
        assert b.overflow_risk is False


class TestTwinEngine:
    def test_add_and_get_bin(self):
        engine = _make_engine()
        b = _make_bin()
        engine.add_bin(b)
        assert engine.get_bin(1) is b
        assert len(engine.get_all_bins()) == 1

    def test_bin_added_to_zone(self):
        engine = _make_engine()
        engine.add_bin(_make_bin(bin_id=1))
        engine.add_bin(_make_bin(bin_id=2))
        assert 1 in engine.zones[1].bins
        assert 2 in engine.zones[1].bins

    def test_update_bin_from_detection(self):
        engine = _make_engine()
        b = _make_bin(fill_level=50.0)
        engine.add_bin(b)
        result = engine.update_bin_from_detection(1, "wet", fill_increment=10.0)
        assert result is not None
        assert result.fill_level == 60.0
        assert result.data_source == "detected"

    def test_update_nonexistent_bin_returns_none(self):
        engine = _make_engine()
        result = engine.update_bin_from_detection(999, "dry")
        assert result is None

    def test_simulate_advances_fill(self):
        engine = _make_engine()
        engine.add_bin(_make_bin(fill_level=0.0, capacity=120.0))
        metrics = engine.simulate(hours=10)
        assert metrics.avg_fill_level > 0

    def test_simulate_counts_overflows(self):
        engine = _make_engine()
        engine.add_bin(_make_bin(fill_level=115.0, capacity=120.0))
        metrics = engine.simulate(hours=5)
        assert metrics.overflow_incidents > 0

    def test_scenario_add_bins(self):
        engine = _make_engine()
        engine.add_bin(_make_bin(bin_id=1))
        snapshot = engine.apply_scenario("add_bins", {"count": 3, "zone_id": 1})
        assert len(snapshot) == 4

    def test_scenario_segregation_intervention(self):
        engine = _make_engine()
        b = _make_bin(bin_id=1)
        b.contamination_score = 0.5
        engine.add_bin(b)
        snapshot = engine.apply_scenario(
            "segregation_intervention", {"zone_id": 1, "reduction_factor": 0.5}
        )
        assert snapshot[1].contamination_score == pytest.approx(0.25)

    def test_run_scenario_comparison_returns_diff(self):
        engine = _make_engine()
        engine.add_bin(_make_bin(bin_id=1, fill_level=50.0))
        engine.add_bin(_make_bin(bin_id=2, fill_level=30.0))
        baseline, scenario, diff = engine.run_scenario_comparison(
            "add_bins", {"count": 2, "zone_id": 1}, hours=24
        )
        assert "overflow_incidents" in diff
        assert "estimated_co2_kg" in diff

    def test_twin_state_summary(self):
        engine = _make_engine()
        engine.add_bin(_make_bin(bin_id=1, fill_level=100.0))
        engine.add_bin(_make_bin(bin_id=2, fill_level=10.0))
        summary = engine.get_twin_state_summary()
        assert summary["total_bins"] == 2
        assert "zones" in summary
        assert summary["data_source"] == "simulated"


class TestHaversine:
    def test_same_point_is_zero(self):
        assert _haversine_km(12.82, 77.50, 12.82, 77.50) == 0.0

    def test_known_distance(self):
        # Approximate distance between two points about 1 degree apart
        d = _haversine_km(12.0, 77.0, 13.0, 77.0)
        assert 110 < d < 112


class TestRouteOptimizer:
    def test_empty_route(self):
        engine = _make_engine()
        assert engine._optimize_route([]) == 0.0

    def test_single_bin_route(self):
        engine = _make_engine()
        b = _make_bin()
        distance = engine._optimize_route([b])
        assert distance >= 0.0

    def test_multiple_bins_route(self):
        engine = _make_engine()
        bins = [
            _make_bin(bin_id=1),
            _make_bin(bin_id=2),
            _make_bin(bin_id=3),
        ]
        bins[1].latitude += 0.01
        bins[2].longitude += 0.01
        distance = engine._optimize_route(bins)
        assert distance > 0.0
