import pytest
import json
from app.services.llm import _parse_response, get_recommendations, DEFAULT_CACHED_RESPONSE
from app.schemas import RecommendationResponse

@pytest.mark.asyncio
async def test_get_recommendations_fallback(monkeypatch):
    from app.config import get_settings
    settings = get_settings()
    monkeypatch.setattr(settings, "gemini_api_key", "")
    twin_state = {"bins": [], "zones": []}
    result = await get_recommendations(twin_state)
    assert isinstance(result, RecommendationResponse)
    assert len(result.issues) > 0
    assert len(result.actions) > 0
    assert result.expected_impact.overflow_reduction_pct > 0


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
