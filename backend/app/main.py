import os
import sys
import logging
import tempfile
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings, validate_env
from app.middleware import (
    SecurityHeadersMiddleware,
    RequestSanitizationMiddleware,
    RequestLoggingMiddleware,
)
from app.auth import (
    require_admin,
    get_current_user,
    sanitize_string,
)
from app.schemas import (
    BinResponse, WasteTypeMix, DetectionResponse, SimulationRequest,
    SimulationResponse, MetricsSnapshot, ScenarioRequest, ScenarioResponse,
    RecommendationResponse, HealthResponse, ErrorResponse,
)
from app.twin.seed import generate_seed_data
from app.twin.engine import TwinEngine
from app.services.detection import detect_waste, detect_waste_gemini, get_detector
from app.services.llm import get_recommendations
from app.services.report import generate_report

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("ecotwin")

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 5 * 1024 * 1024

engine: TwinEngine = generate_seed_data(seed=get_settings().seed_random)
saved_scenarios: list[dict] = []
last_recommendations: RecommendationResponse | None = None

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    settings = get_settings()

    # ── Validate environment on startup ──
    warnings = validate_env()
    for w in warnings:
        logger.warning("ENV CHECK: %s", w)

    engine = generate_seed_data(seed=settings.seed_random)
    try:
        if os.path.exists("yolov8n.pt") or os.path.exists(os.path.join(os.path.dirname(__file__), "..", "yolov8n.pt")):
            get_detector()
            app.state.detector_loaded = True
        else:
            app.state.detector_loaded = False
    except Exception:
        app.state.detector_loaded = False

    logger.info("EcoTwin started (debug=%s)", settings.debug)
    yield
    logger.info("EcoTwin shutting down")


settings = get_settings()

app = FastAPI(
    title="EcoTwin API",
    version="0.1.0",
    description="Smart Waste Management Digital Twin backend",
    lifespan=lifespan,
    # ── Disable docs in production ──
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

# ── Rate Limiter ──
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Security Middleware Stack (order matters: outermost first) ──
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RequestSanitizationMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# ── CORS configuration: allow configured origins, Vercel deployments, and localhost ──
raw_origins = [o.strip().rstrip("/") for o in settings.frontend_origin.split(",") if o.strip()]
allow_all = "*" in raw_origins
allowed_origins = [o for o in raw_origins if o != "*"]

for p in range(5173, 5182):
    for host in ("localhost", "127.0.0.1"):
        origin = f"http://{host}:{p}"
        if origin not in allowed_origins:
            allowed_origins.append(origin)

if "http://localhost:3000" not in allowed_origins:
    allowed_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else allowed_origins,
    allow_origin_regex=None if allow_all else r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=not allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)


# ═══════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════


@app.get("/api/auth/me")
async def auth_me(current_user: str | None = Depends(get_current_user)):
    """Return the current authenticated user info."""
    if current_user is None:
        return {"authenticated": False}
    return {"authenticated": True, "username": current_user}


# ═══════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS
# ═══════════════════════════════════════════════════════════════

def _bin_to_response(b) -> BinResponse:
    return BinResponse(
        id=b.id,
        name=b.name,
        zone_id=b.zone_id,
        zone_name=b.zone_name,
        zone_type=b.zone_type,
        latitude=b.latitude,
        longitude=b.longitude,
        capacity_liters=b.capacity_liters,
        fill_level=b.fill_level,
        per_hour_fill_rate=b.per_hour_fill_rate,
        waste_type_mix=WasteTypeMix(**b.waste_type_mix),
        contamination_score=b.contamination_score,
        last_collected=b.last_collected,
        hours_until_overflow=b.hours_until_overflow,
        overflow_risk=b.overflow_risk,
        data_source=b.data_source,
    )


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    detector_status = "loaded" if getattr(app.state, "detector_loaded", False) else "not_loaded"
    return HealthResponse(
        status="ok",
        version="0.1.0",
        database="connected",
        detector=detector_status,
    )


@app.get("/api/bins", response_model=list[BinResponse])
@limiter.limit("60/minute")
async def list_bins(request: Request):
    return [_bin_to_response(b) for b in engine.get_all_bins()]


@app.get("/api/bins/{bin_id}", response_model=BinResponse)
@limiter.limit("60/minute")
async def get_bin(request: Request, bin_id: int):
    if bin_id < 0 or bin_id > 10000:
        raise HTTPException(status_code=400, detail="Invalid bin ID")
    b = engine.get_bin(bin_id)
    if b is None:
        raise HTTPException(status_code=404, detail=f"Bin {bin_id} not found")
    return _bin_to_response(b)


@app.post("/api/detect", response_model=DetectionResponse)
@limiter.limit("60/minute")
async def detect(
    request: Request,
    file: UploadFile = File(...),
    bin_id: int | None = Form(None),
    use_gemini: bool = Form(False),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed. Use JPEG, PNG, or WebP.",
        )

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds {MAX_SIZE_BYTES // (1024*1024)} MB limit.",
        )

    # Validate file magic bytes (JPEG, PNG, WebP headers)
    if not _validate_image_magic(contents):
        raise HTTPException(
            status_code=400,
            detail="File content does not match a valid image format.",
        )

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        detections = detect_waste(tmp_path)
    finally:
        os.unlink(tmp_path)

    # If YOLO didn't detect anything or if use_gemini requested, use Gemini Vision
    if (not detections or use_gemini) and get_settings().gemini_api_key:
        try:
            g_detections = await detect_waste_gemini(contents, file.content_type)
            if g_detections:
                detections = g_detections
        except Exception as e:
            logger.warning("Gemini Vision fallback failed: %s", e)

    bin_updated = False
    message = ""

    if bin_id is not None:
        if bin_id < 0 or bin_id > 10000:
            raise HTTPException(status_code=400, detail="Invalid bin ID")
        if detections:
            top_detection = max(detections, key=lambda d: d.confidence)
            result = engine.update_bin_from_detection(bin_id, top_detection.waste_class)
            if result is not None:
                bin_updated = True
                message = (
                    f"Bin {bin_id} updated: +5L fill, waste class '{top_detection.waste_class}' applied."
                )
            else:
                message = f"Bin {bin_id} not found. Detection completed but bin was not updated."

    if not detections:
        message = "No waste objects identified. Try adjusting angle or lighting."

    return DetectionResponse(
        detections=detections,
        bin_updated=bin_updated,
        bin_id=bin_id,
        message=message or f"Detected {len(detections)} object(s).",
    )


@app.post("/api/simulate", response_model=SimulationResponse)
@limiter.limit("20/minute")
async def simulate(request: Request, req: SimulationRequest):
    if req.scenario:
        # Sanitize scenario name if present
        if hasattr(req.scenario, "name"):
            req.scenario.name = sanitize_string(req.scenario.name)
        baseline, scenario_metrics, diff = engine.run_scenario_comparison(
            req.scenario.scenario_type,
            req.scenario.parameters,
            hours=req.hours,
        )
        return SimulationResponse(
            baseline=MetricsSnapshot(
                overflow_incidents=baseline.overflow_incidents,
                total_truck_distance_km=round(baseline.total_truck_distance_km, 2),
                avg_contamination_rate=round(baseline.avg_contamination_rate, 4),
                estimated_co2_kg=round(baseline.estimated_co2_kg, 2),
                bins_at_risk=baseline.bins_at_risk,
                avg_fill_level=round(baseline.avg_fill_level, 2),
            ),
            scenario=MetricsSnapshot(
                overflow_incidents=scenario_metrics.overflow_incidents,
                total_truck_distance_km=round(scenario_metrics.total_truck_distance_km, 2),
                avg_contamination_rate=round(scenario_metrics.avg_contamination_rate, 4),
                estimated_co2_kg=round(scenario_metrics.estimated_co2_kg, 2),
                bins_at_risk=scenario_metrics.bins_at_risk,
                avg_fill_level=round(scenario_metrics.avg_fill_level, 2),
            ),
            diff=diff,
            hours_simulated=req.hours,
        )

    baseline = engine.simulate(hours=req.hours)
    return SimulationResponse(
        baseline=MetricsSnapshot(
            overflow_incidents=baseline.overflow_incidents,
            total_truck_distance_km=round(baseline.total_truck_distance_km, 2),
            avg_contamination_rate=round(baseline.avg_contamination_rate, 4),
            estimated_co2_kg=round(baseline.estimated_co2_kg, 2),
            bins_at_risk=baseline.bins_at_risk,
            avg_fill_level=round(baseline.avg_fill_level, 2),
        ),
        hours_simulated=req.hours,
    )


@app.get("/api/scenarios", response_model=list[ScenarioResponse])
@limiter.limit("30/minute")
async def list_scenarios(request: Request):
    return [
        ScenarioResponse(
            id=i + 1,
            name=s["name"],
            description=s.get("description", ""),
            scenario_type=s["scenario_type"],
            parameters=s["parameters"],
            baseline_metrics=s.get("baseline_metrics"),
            scenario_metrics=s.get("scenario_metrics"),
            diff_metrics=s.get("diff_metrics"),
            created_at=s.get("created_at", datetime.now(timezone.utc)),
        )
        for i, s in enumerate(saved_scenarios)
    ]


@app.post("/api/scenarios", response_model=ScenarioResponse)
@limiter.limit("10/minute")
async def save_scenario(request: Request, req: ScenarioRequest):
    # Sanitize user-provided strings
    req.name = sanitize_string(req.name, max_length=200)
    req.description = sanitize_string(req.description, max_length=1000)

    baseline, scenario_metrics, diff = engine.run_scenario_comparison(
        req.scenario_type, req.parameters, hours=req.simulation_hours
    )

    scenario_data = {
        "name": req.name,
        "description": req.description,
        "scenario_type": req.scenario_type,
        "parameters": req.parameters,
        "baseline_metrics": MetricsSnapshot(
            overflow_incidents=baseline.overflow_incidents,
            total_truck_distance_km=round(baseline.total_truck_distance_km, 2),
            avg_contamination_rate=round(baseline.avg_contamination_rate, 4),
            estimated_co2_kg=round(baseline.estimated_co2_kg, 2),
            bins_at_risk=baseline.bins_at_risk,
            avg_fill_level=round(baseline.avg_fill_level, 2),
        ),
        "scenario_metrics": MetricsSnapshot(
            overflow_incidents=scenario_metrics.overflow_incidents,
            total_truck_distance_km=round(scenario_metrics.total_truck_distance_km, 2),
            avg_contamination_rate=round(scenario_metrics.avg_contamination_rate, 4),
            estimated_co2_kg=round(scenario_metrics.estimated_co2_kg, 2),
            bins_at_risk=scenario_metrics.bins_at_risk,
            avg_fill_level=round(scenario_metrics.avg_fill_level, 2),
        ),
        "diff_metrics": diff,
        "created_at": datetime.now(timezone.utc),
    }
    saved_scenarios.append(scenario_data)

    return ScenarioResponse(
        id=len(saved_scenarios),
        name=scenario_data["name"],
        description=scenario_data["description"],
        scenario_type=scenario_data["scenario_type"],
        parameters=scenario_data["parameters"],
        baseline_metrics=scenario_data["baseline_metrics"],
        scenario_metrics=scenario_data["scenario_metrics"],
        diff_metrics=scenario_data["diff_metrics"],
        created_at=scenario_data["created_at"],
    )


@app.post("/api/recommend")
@limiter.limit("10/minute")
async def recommend(request: Request):
    global last_recommendations
    twin_state = engine.get_twin_state_summary()
    result = await get_recommendations(twin_state)

    if isinstance(result, ErrorResponse):
        return JSONResponse(status_code=503, content=result.model_dump())

    last_recommendations = result
    return result


@app.get("/api/report")
@limiter.limit("5/minute")
async def download_report(request: Request):
    buffer = generate_report(engine, last_recommendations)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=ecotwin_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
        },
    )


# ═══════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS (Protected)
# ═══════════════════════════════════════════════════════════════

@app.post("/api/admin/reset-twin")
@limiter.limit("3/minute")
async def admin_reset_twin(
    request: Request,
    admin_user: str = Depends(require_admin),
):
    """Admin-only: reset the digital twin to seed state."""
    global engine, saved_scenarios, last_recommendations
    engine = generate_seed_data(seed=get_settings().seed_random)
    saved_scenarios = []
    last_recommendations = None
    logger.info("Twin reset by admin: %s", admin_user)
    return {"message": "Digital twin reset to initial state", "admin": admin_user}


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def _validate_image_magic(data: bytes) -> bool:
    """Check file magic bytes to verify actual image content."""
    if len(data) < 4:
        return False
    # JPEG: FF D8 FF
    if data[:3] == b"\xff\xd8\xff":
        return True
    # PNG: 89 50 4E 47
    if data[:4] == b"\x89PNG":
        return True
    # WebP: RIFF....WEBP
    if data[:4] == b"RIFF" and len(data) >= 12 and data[8:12] == b"WEBP":
        return True
    return False
