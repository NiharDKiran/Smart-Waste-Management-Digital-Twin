import pytest
import json
from app.services import llm
from app.services.llm import _parse_response, get_recommendations
from app.schemas import RecommendationResponse, ErrorResponse


@pytest.mark.asyncio
async def test_get_recommendations_unavailable_without_cache(monkeypatch):
    from app.config import get_settings
    settings = get_settings()
    monkeypatch.setattr(settings, "gemini_api_key", "")
    llm._last_real_inference = None
    llm._last_inference_timestamp = None

    twin_state = {"bins": [], "zones": []}
    result = await get_recommendations(twin_state)
    assert isinstance(result, ErrorResponse)
    assert "unavailable" in result.error.lower()


@pytest.mark.asyncio
async def test_get_recommendations_uses_session_cache_when_available(monkeypatch):
    from app.config import get_settings
    settings = get_settings()
    monkeypatch.setattr(settings, "gemini_api_key", "")

    sample_response = RecommendationResponse(
        issues=[],
        actions=[],
        expected_impact={
            "overflow_reduction_pct": 20,
            "contamination_reduction_pct": 15,
            "co2_reduction_pct": 10,
            "efficiency_improvement_pct": 25,
        },
        assumptions=["Prior real session inference"],
        is_cached=False,
        data_source="ai_generated",
        timestamp="2026-10-16 13:50:00 UTC",
    )
    llm._last_real_inference = sample_response
    llm._last_inference_timestamp = "2026-10-16 13:50:00 UTC"

    twin_state = {"bins": [], "zones": []}
    result = await get_recommendations(twin_state)
    assert isinstance(result, RecommendationResponse)
    assert result.is_cached is True
    assert result.timestamp == "2026-10-16 13:50:00 UTC"
    assert result.data_source == "session-cache"


def test_parse_response_clean_json():
    sample = {
        "issues": [
            {
                "title": "High Overflow in Sector A",
                "severity": "critical",
                "description": "Bins near cafeteria overflowing",
                "affected_zones": ["Sector A"],
                "affected_bins": [1, 2],
            }
        ],
        "actions": [
            {
                "title": "Add 2 Bins",
                "description": "Deploy extra bins",
                "priority": "high",
                "scenario_type": "add_bins",
                "scenario_parameters": {"count": 2},
                "estimated_impact": "-50% overflow",
            }
        ],
        "expected_impact": {
            "overflow_reduction_pct": 50,
            "contamination_reduction_pct": 20,
            "co2_reduction_pct": 15,
            "efficiency_improvement_pct": 30,
        },
        "assumptions": ["Normal operations"],
    }
    parsed = _parse_response(json.dumps(sample))
    assert parsed is not None
    assert parsed.issues[0].title == "High Overflow in Sector A"
    assert parsed.actions[0].scenario_type == "add_bins"


def test_parse_response_with_markdown_fences():
    sample = {
        "issues": [],
        "actions": [],
        "expected_impact": {
            "overflow_reduction_pct": 10,
            "contamination_reduction_pct": 10,
            "co2_reduction_pct": 10,
            "efficiency_improvement_pct": 10,
        },
        "assumptions": [],
    }
    raw = f"```json\n{json.dumps(sample)}\n```"
    parsed = _parse_response(raw)
    assert parsed is not None
    assert parsed.expected_impact.overflow_reduction_pct == 10
