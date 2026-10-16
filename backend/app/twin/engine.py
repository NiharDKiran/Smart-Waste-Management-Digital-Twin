from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from copy import deepcopy
import math


@dataclass
class Bin:
    id: int
    name: str
    zone_id: int
    zone_name: str
    zone_type: str
    latitude: float
    longitude: float
    capacity_liters: float = 120.0
    fill_level: float = 0.0
    per_hour_fill_rate: float = 2.0
    waste_type_mix: dict = field(default_factory=lambda: {
        "wet": 0.25, "dry": 0.25, "recyclable": 0.25, "hazardous": 0.25
    })
    contamination_score: float = 0.0
    last_collected: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    data_source: str = "simulated"

    @property
    def fill_percentage(self) -> float:
        if self.capacity_liters <= 0:
            return 100.0
        return min(100.0, (self.fill_level / self.capacity_liters) * 100.0)

    @property
    def hours_until_overflow(self) -> float | None:
        if self.per_hour_fill_rate <= 0:
            return None
        remaining = self.capacity_liters - self.fill_level
        if remaining <= 0:
            return 0.0
        return remaining / self.per_hour_fill_rate

    @property
    def overflow_risk(self) -> bool:
        huo = self.hours_until_overflow
        if huo is None:
            return False
        return huo <= 12.0


@dataclass
class Zone:
    id: int
    name: str
    zone_type: str
    bins: list[int] = field(default_factory=list)
    pickup_frequency_hours: float = 24.0


@dataclass
class Truck:
    id: int
    name: str
    capacity_liters: float = 2000.0
    current_load: float = 0.0
    speed_kmh: float = 20.0
    base_latitude: float = 0.0
    base_longitude: float = 0.0


@dataclass
class SimulationMetrics:
    overflow_incidents: int = 0
    total_truck_distance_km: float = 0.0
    avg_contamination_rate: float = 0.0
    estimated_co2_kg: float = 0.0
    bins_at_risk: int = 0
    avg_fill_level: float = 0.0


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two lat/lng points using the haversine formula."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class TwinEngine:
    """
    Core digital twin simulation engine.
    Holds bins, zones, and trucks. Provides simulation stepping,
    scenario evaluation, and route optimization.
    """

    def __init__(self, emission_factors: dict | None = None):
        self.bins: dict[int, Bin] = {}
        self.zones: dict[int, Zone] = {}
        self.trucks: dict[int, Truck] = {}
        self._emission_factors = emission_factors or {}

    def _ef(self, key: str) -> float:
        """Retrieve an emission factor value by key."""
        factors = self._emission_factors.get("emission_factors", {})
        factor = factors.get(key, {})
        return float(factor.get("value", 0.0))

    def add_bin(self, bin_obj: Bin) -> None:
        self.bins[bin_obj.id] = bin_obj
        if bin_obj.zone_id in self.zones:
            if bin_obj.id not in self.zones[bin_obj.zone_id].bins:
                self.zones[bin_obj.zone_id].bins.append(bin_obj.id)

    def add_zone(self, zone: Zone) -> None:
        self.zones[zone.id] = zone

    def add_truck(self, truck: Truck) -> None:
        self.trucks[truck.id] = truck

    def get_bin(self, bin_id: int) -> Bin | None:
        return self.bins.get(bin_id)

    def get_all_bins(self) -> list[Bin]:
        return list(self.bins.values())

    def update_bin_from_detection(
        self, bin_id: int, waste_class: str, fill_increment: float = 5.0
    ) -> Bin | None:
        """Apply a detection result to a bin: increment fill and adjust waste mix."""
        b = self.bins.get(bin_id)
        if b is None:
            return None
        b.fill_level = min(b.capacity_liters, b.fill_level + fill_increment)
        total_detections = sum(b.waste_type_mix.values()) + 1
        for k in b.waste_type_mix:
            b.waste_type_mix[k] = b.waste_type_mix[k] * (total_detections - 1) / total_detections
        b.waste_type_mix[waste_class] = b.waste_type_mix.get(waste_class, 0) + 1.0 / total_detections

        primary = max(b.waste_type_mix, key=b.waste_type_mix.get)
        non_primary = sum(v for k, v in b.waste_type_mix.items() if k != primary)
        b.contamination_score = min(1.0, non_primary)
        b.data_source = "detected"
        return b

    def simulate(self, hours: int, snapshot: dict[int, Bin] | None = None) -> SimulationMetrics:
        """
        Run the simulation for N hours.
        Uses the provided snapshot of bins or the current state.
        Returns computed metrics.
        """
        bins = snapshot or {bid: deepcopy(b) for bid, b in self.bins.items()}
        zones = {zid: deepcopy(z) for zid, z in self.zones.items()}

        metrics = SimulationMetrics()
        now = datetime.now(timezone.utc)

        for hour in range(hours):
            current_time = now + timedelta(hours=hour)
            for b in bins.values():
                b.fill_level = min(b.capacity_liters, b.fill_level + b.per_hour_fill_rate)
                if b.fill_level >= b.capacity_liters:
                    metrics.overflow_incidents += 1

            for zone in zones.values():
                hours_since_collection = zone.pickup_frequency_hours
                if hour > 0 and hour % int(zone.pickup_frequency_hours) == 0:
                    zone_bins = [bins[bid] for bid in zone.bins if bid in bins]
                    route_distance = self._optimize_route(zone_bins)
                    metrics.total_truck_distance_km += route_distance
                    for b in zone_bins:
                        b.fill_level = 0.0
                        b.last_collected = current_time

        at_risk = 0
        total_fill = 0.0
        total_contamination = 0.0
        for b in bins.values():
            total_fill += b.fill_percentage
            total_contamination += b.contamination_score
            if b.overflow_risk:
                at_risk += 1

        n = len(bins) or 1
        metrics.bins_at_risk = at_risk
        metrics.avg_fill_level = total_fill / n
        metrics.avg_contamination_rate = total_contamination / n

        metrics.estimated_co2_kg = (
            metrics.total_truck_distance_km * self._ef("truck_per_km")
            + metrics.overflow_incidents * self._ef("overflow_cleanup")
            + metrics.avg_contamination_rate * n * self._ef("contamination_penalty")
        )

        return metrics

    def apply_scenario(self, scenario_type: str, params: dict) -> dict[int, Bin]:
        """
        Create a modified snapshot of bins based on a scenario.
        The snapshot is used for simulation comparison.
        """
        snapshot = {bid: deepcopy(b) for bid, b in self.bins.items()}

        if scenario_type == "add_bins":
            count = params.get("count", 1)
            zone_id = params.get("zone_id", 1)
            zone = self.zones.get(zone_id)
            if zone is None:
                return snapshot

            max_id = max(snapshot.keys()) if snapshot else 0
            for i in range(count):
                new_id = max_id + i + 1
                ref_bin = next(
                    (snapshot[bid] for bid in zone.bins if bid in snapshot), None
                )
                lat = params.get("latitude", ref_bin.latitude + 0.001 * (i + 1) if ref_bin else 12.8 + 0.001 * i)
                lng = params.get("longitude", ref_bin.longitude + 0.001 * (i + 1) if ref_bin else 77.5 + 0.001 * i)
                new_bin = Bin(
                    id=new_id,
                    name=f"New Bin {new_id}",
                    zone_id=zone_id,
                    zone_name=zone.name,
                    zone_type=zone.zone_type,
                    latitude=lat,
                    longitude=lng,
                    capacity_liters=params.get("capacity", 120.0),
                    per_hour_fill_rate=params.get("fill_rate", 2.0),
                    data_source="simulated",
                )
                snapshot[new_id] = new_bin

        elif scenario_type == "change_frequency":
            zone_id = params.get("zone_id")
            new_frequency = params.get("frequency_hours", 12.0)
            if zone_id and zone_id in self.zones:
                zone_copy = deepcopy(self.zones[zone_id])
                zone_copy.pickup_frequency_hours = new_frequency
                self.zones[zone_id] = zone_copy

        elif scenario_type == "segregation_intervention":
            zone_id = params.get("zone_id")
            factor = params.get("reduction_factor", self._ef("segregation_intervention_factor") or 0.3)
            target_bins = (
                [snapshot[bid] for bid in self.zones[zone_id].bins if bid in snapshot]
                if zone_id and zone_id in self.zones
                else list(snapshot.values())
            )
            for b in target_bins:
                b.contamination_score = max(0.0, b.contamination_score * (1.0 - factor))

        return snapshot

    def run_scenario_comparison(
        self, scenario_type: str, params: dict, hours: int = 72
    ) -> tuple[SimulationMetrics, SimulationMetrics, dict]:
        """Run simulation on baseline and scenario, return both metrics and the diff."""
        baseline_snapshot = {bid: deepcopy(b) for bid, b in self.bins.items()}
        scenario_snapshot = self.apply_scenario(scenario_type, params)

        baseline = self.simulate(hours, baseline_snapshot)
        scenario = self.simulate(hours, scenario_snapshot)

        diff = {
            "overflow_incidents": scenario.overflow_incidents - baseline.overflow_incidents,
            "total_truck_distance_km": round(
                scenario.total_truck_distance_km - baseline.total_truck_distance_km, 2
            ),
            "avg_contamination_rate": round(
                scenario.avg_contamination_rate - baseline.avg_contamination_rate, 4
            ),
            "estimated_co2_kg": round(
                scenario.estimated_co2_kg - baseline.estimated_co2_kg, 2
            ),
            "bins_at_risk": scenario.bins_at_risk - baseline.bins_at_risk,
            "avg_fill_level": round(
                scenario.avg_fill_level - baseline.avg_fill_level, 2
            ),
        }
        return baseline, scenario, diff

    def _optimize_route(self, bins: list[Bin]) -> float:
        """
        Nearest-neighbour route optimizer.
        Starts from the first truck's base location (or origin),
        visits all bins that need collection, returns to base.
        """
        if not bins:
            return 0.0

        truck = next(iter(self.trucks.values()), None)
        base_lat = truck.base_latitude if truck else 0.0
        base_lon = truck.base_longitude if truck else 0.0

        unvisited = list(bins)
        total_distance = 0.0
        current_lat, current_lon = base_lat, base_lon

        while unvisited:
            nearest = min(
                unvisited,
                key=lambda b: _haversine_km(current_lat, current_lon, b.latitude, b.longitude),
            )
            total_distance += _haversine_km(
                current_lat, current_lon, nearest.latitude, nearest.longitude
            )
            current_lat, current_lon = nearest.latitude, nearest.longitude
            unvisited.remove(nearest)

        total_distance += _haversine_km(current_lat, current_lon, base_lat, base_lon)
        return round(total_distance, 3)

    def get_twin_state_summary(self) -> dict:
        """
        Build a summary of current twin state for the LLM context.
        Contains aggregated metrics, not raw data.
        """
        bins_list = list(self.bins.values())
        n = len(bins_list) or 1

        at_risk = [b for b in bins_list if b.overflow_risk]
        overflowing = [b for b in bins_list if b.fill_percentage >= 100.0]
        high_contamination = [b for b in bins_list if b.contamination_score > 0.5]

        zone_summaries = {}
        for zone in self.zones.values():
            zone_bins = [self.bins[bid] for bid in zone.bins if bid in self.bins]
            zn = len(zone_bins) or 1
            zone_summaries[zone.name] = {
                "type": zone.zone_type,
                "bin_count": len(zone_bins),
                "avg_fill_pct": round(sum(b.fill_percentage for b in zone_bins) / zn, 1),
                "avg_contamination": round(
                    sum(b.contamination_score for b in zone_bins) / zn, 3
                ),
                "bins_at_risk": sum(1 for b in zone_bins if b.overflow_risk),
                "pickup_frequency_hours": zone.pickup_frequency_hours,
            }

        return {
            "total_bins": n,
            "avg_fill_level_pct": round(
                sum(b.fill_percentage for b in bins_list) / n, 1
            ),
            "bins_at_overflow_risk": len(at_risk),
            "bins_currently_overflowing": len(overflowing),
            "bins_high_contamination": len(high_contamination),
            "avg_contamination_score": round(
                sum(b.contamination_score for b in bins_list) / n, 3
            ),
            "zones": zone_summaries,
            "at_risk_bins": [
                {
                    "id": b.id,
                    "name": b.name,
                    "zone": b.zone_name,
                    "fill_pct": round(b.fill_percentage, 1),
                    "hours_until_overflow": round(b.hours_until_overflow or 0, 1),
                    "contamination": round(b.contamination_score, 3),
                }
                for b in at_risk
            ],
            "data_source": "simulated",
        }
