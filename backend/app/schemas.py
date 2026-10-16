from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class WasteTypeMix(BaseModel):
    wet: float = Field(default=0.0, ge=0.0, le=1.0)
    dry: float = Field(default=0.0, ge=0.0, le=1.0)
    recyclable: float = Field(default=0.0, ge=0.0, le=1.0)
    hazardous: float = Field(default=0.0, ge=0.0, le=1.0)


class BinResponse(BaseModel):
    id: int
    name: str
    zone_id: int
    zone_name: str
    zone_type: str
    latitude: float
    longitude: float
    capacity_liters: float
    fill_level: float
    per_hour_fill_rate: float
    waste_type_mix: WasteTypeMix
    contamination_score: float
    last_collected: datetime
    hours_until_overflow: Optional[float] = None
    overflow_risk: bool = False
    data_source: str = "simulated"

    model_config = {"from_attributes": True}


class DetectionResult(BaseModel):
    waste_class: str
    confidence: float
    raw_label: str
    description: str
    bbox: Optional[list[float]] = None  # [x1, y1, x2, y2]
    data_source: str = "detected"


class DetectionResponse(BaseModel):
    detections: list[DetectionResult]
    bin_updated: bool = False
    bin_id: Optional[int] = None
    message: str = ""


class ScenarioRequest(BaseModel):
    name: str
    description: str = ""
    scenario_type: str = Field(
        description="One of: add_bins, change_frequency, segregation_intervention"
    )
    parameters: dict = Field(default_factory=dict)
    simulation_hours: int = Field(default=72, ge=1, le=720)


class SimulationRequest(BaseModel):
    hours: int = Field(default=24, ge=1, le=720)
    scenario: Optional[ScenarioRequest] = None


class MetricsSnapshot(BaseModel):
    overflow_incidents: int
    total_truck_distance_km: float
    avg_contamination_rate: float
    estimated_co2_kg: float
    bins_at_risk: int
    avg_fill_level: float
    data_source: str = "simulated"


class SimulationResponse(BaseModel):
    baseline: MetricsSnapshot
    scenario: Optional[MetricsSnapshot] = None
    diff: Optional[dict] = None
    hours_simulated: int
    data_source: str = "simulated"


class ScenarioResponse(BaseModel):
    id: int
    name: str
    description: str
    scenario_type: str
    parameters: dict
    baseline_metrics: Optional[MetricsSnapshot] = None
    scenario_metrics: Optional[MetricsSnapshot] = None
    diff_metrics: Optional[dict] = None
    created_at: datetime
    data_source: str = "simulated"

    model_config = {"from_attributes": True}


class RecommendationIssue(BaseModel):
    title: str
    severity: str = Field(description="One of: critical, warning, info")
    description: str
    affected_zones: list[str] = []
    affected_bins: list[int] = []


class RecommendationAction(BaseModel):
    title: str
    description: str
    priority: str = Field(description="One of: high, medium, low")
    scenario_type: Optional[str] = None
    scenario_parameters: Optional[dict] = None
    estimated_impact: str = ""


class RecommendationExpectedImpact(BaseModel):
    overflow_reduction_pct: float = 0.0
    contamination_reduction_pct: float = 0.0
    co2_reduction_pct: float = 0.0
    efficiency_improvement_pct: float = 0.0


class RecommendationResponse(BaseModel):
    issues: list[RecommendationIssue]
    actions: list[RecommendationAction]
    expected_impact: RecommendationExpectedImpact
    assumptions: list[str]
    is_cached: bool = False
    data_source: str = "ai_generated"
    timestamp: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
    database: str = "connected"
    detector: str = "loaded"


class ErrorResponse(BaseModel):
    error: str
    detail: str = ""
    retry: bool = False
