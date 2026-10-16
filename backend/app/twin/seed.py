import random
from datetime import datetime, timezone, timedelta
from app.twin.engine import Bin, Zone, Truck, TwinEngine
from app.config import get_emission_factors


ZONES = [
    Zone(id=1, name="Main Building", zone_type="admin", pickup_frequency_hours=24.0),
    Zone(id=2, name="Residential Wing", zone_type="residential", pickup_frequency_hours=18.0),
    Zone(id=3, name="Food Court", zone_type="cafeteria", pickup_frequency_hours=12.0),
    Zone(id=4, name="Medical Center", zone_type="medical", pickup_frequency_hours=8.0),
    Zone(id=5, name="Outdoor Area", zone_type="outdoor", pickup_frequency_hours=24.0),
]

# Approximate coordinates centered around a generic facility location.
# These are not real surveyed positions.
BASE_LAT = 12.82
BASE_LNG = 77.50

ZONE_OFFSETS = {
    1: (0.000, 0.000),
    2: (0.003, 0.001),
    3: (-0.001, 0.003),
    4: (0.002, -0.002),
    5: (-0.003, -0.001),
}

BIN_CONFIGS = {
    "admin": {"capacity_range": (100, 150), "fill_rate_range": (1.0, 3.0), "contamination_range": (0.05, 0.2)},
    "residential": {"capacity_range": (80, 120), "fill_rate_range": (2.0, 5.0), "contamination_range": (0.1, 0.35)},
    "cafeteria": {"capacity_range": (120, 200), "fill_rate_range": (4.0, 8.0), "contamination_range": (0.15, 0.4)},
    "medical": {"capacity_range": (60, 100), "fill_rate_range": (1.5, 4.0), "contamination_range": (0.05, 0.15)},
    "outdoor": {"capacity_range": (150, 250), "fill_rate_range": (0.5, 2.0), "contamination_range": (0.2, 0.5)},
}

WASTE_MIX_PROFILES = {
    "admin": {"wet": 0.15, "dry": 0.55, "recyclable": 0.25, "hazardous": 0.05},
    "residential": {"wet": 0.35, "dry": 0.30, "recyclable": 0.30, "hazardous": 0.05},
    "cafeteria": {"wet": 0.55, "dry": 0.15, "recyclable": 0.25, "hazardous": 0.05},
    "medical": {"wet": 0.20, "dry": 0.20, "recyclable": 0.15, "hazardous": 0.45},
    "outdoor": {"wet": 0.10, "dry": 0.40, "recyclable": 0.35, "hazardous": 0.15},
}

BIN_NAMES_BY_ZONE = {
    1: ["Lobby Bin", "Reception Bin", "Conference Room Bin", "Office Floor Bin"],
    2: ["Block A Bin", "Block B Bin", "Block C Bin", "Common Room Bin"],
    3: ["Dining Hall Bin", "Kitchen Bin", "Counter Bin", "Seating Area Bin"],
    4: ["Ward Bin", "Lab Bin", "Pharmacy Bin", "Waiting Room Bin"],
    5: ["Garden Bin", "Parking Lot Bin", "Pathway Bin", "Gate Bin"],
}


def generate_seed_data(seed: int = 42) -> TwinEngine:
    """
    Create a TwinEngine populated with 20 bins across 5 zones using
    a seeded random generator for reproducibility.
    """
    rng = random.Random(seed)
    emission_factors = get_emission_factors()
    engine = TwinEngine(emission_factors=emission_factors)

    for zone in ZONES:
        engine.add_zone(Zone(
            id=zone.id,
            name=zone.name,
            zone_type=zone.zone_type,
            bins=[],
            pickup_frequency_hours=zone.pickup_frequency_hours,
        ))

    truck = Truck(
        id=1,
        name="Truck Alpha",
        capacity_liters=2000.0,
        speed_kmh=20.0,
        base_latitude=BASE_LAT,
        base_longitude=BASE_LNG,
    )
    engine.add_truck(truck)

    bin_id = 1
    for zone in ZONES:
        config = BIN_CONFIGS[zone.zone_type]
        mix_profile = WASTE_MIX_PROFILES[zone.zone_type]
        zone_offset = ZONE_OFFSETS[zone.id]
        names = BIN_NAMES_BY_ZONE[zone.id]

        for i in range(4):
            capacity = rng.uniform(*config["capacity_range"])
            fill_rate = rng.uniform(*config["fill_rate_range"])
            contamination = rng.uniform(*config["contamination_range"])
            fill_level = rng.uniform(0, capacity * 0.8)
            hours_ago = rng.uniform(2, 48)

            lat = BASE_LAT + zone_offset[0] + rng.uniform(-0.001, 0.001)
            lng = BASE_LNG + zone_offset[1] + rng.uniform(-0.001, 0.001)

            mix = {k: v + rng.uniform(-0.05, 0.05) for k, v in mix_profile.items()}
            total = sum(mix.values())
            mix = {k: round(v / total, 3) for k, v in mix.items()}

            b = Bin(
                id=bin_id,
                name=names[i],
                zone_id=zone.id,
                zone_name=zone.name,
                zone_type=zone.zone_type,
                latitude=round(lat, 6),
                longitude=round(lng, 6),
                capacity_liters=round(capacity, 1),
                fill_level=round(fill_level, 1),
                per_hour_fill_rate=round(fill_rate, 2),
                waste_type_mix=mix,
                contamination_score=round(contamination, 3),
                last_collected=datetime.now(timezone.utc) - timedelta(hours=hours_ago),
                data_source="simulated",
            )
            engine.add_bin(b)
            bin_id += 1

    return engine
