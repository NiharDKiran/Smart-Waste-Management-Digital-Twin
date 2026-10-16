import json
import httpx
from app.config import get_settings
from app.schemas import (
    RecommendationResponse,
    RecommendationIssue,
    RecommendationAction,
    RecommendationExpectedImpact,
    ErrorResponse,
)

DEFAULT_CACHED_RESPONSE = RecommendationResponse(
    issues=[
        RecommendationIssue(
            title="Accelerated Fill Volatility in Food Court",
            severity="warning",
            description="Cafeteria and Food Court bins exhibit 3.4x peak fill rates during peak hours, triggering early overflow risk and cross-contamination.",
            affected_zones=["Food Court"],
            affected_bins=[9, 10, 11, 12],
        ),
        RecommendationIssue(
            title="Medical Center Stream Cross-Contamination",
            severity="critical",
            description="Telemetry reports high hazardous waste proportion mixed with dry recyclables in clinic disposal nodes, requiring immediate segregation.",
            affected_zones=["Medical Center"],
            affected_bins=[13, 14, 15],
        ),
        RecommendationIssue(
            title="Suboptimal Collection Route Mileage",
            severity="info",
            description="Outdoor gate and pathway bins have slow fill rates but consume 38% of total truck distance on fixed daily collection runs.",
            affected_zones=["Outdoor Area"],
            affected_bins=[17, 18, 19, 20],
        ),
    ],
    actions=[
        RecommendationAction(
            title="Deploy 3 High-Capacity Receptacles in Food Court",
            description="Install supplementary 120L segregated wet & recyclable bins to eliminate peak dining overflows.",
            priority="high",
            scenario_type="add_bins",
            scenario_parameters={"zone_name": "Food Court", "count": 3, "capacity_liters": 120},
            estimated_impact="Reduces food court overflow risk by 78% and stabilizes capacity.",
        ),
        RecommendationAction(
            title="Dynamic Route Tuning: Boost High-Density Pickups",
            description="Increase pickup frequency multiplier for Medical Center and Food Court to prevent container saturation.",
            priority="medium",
            scenario_type="change_frequency",
            scenario_parameters={"zone_name": "Medical Center", "frequency_multiplier": 2.0},
            estimated_impact="Eliminates acute overflow incidents while reducing total route miles.",
        ),
        RecommendationAction(
            title="Facility-Wide Segregation Awareness Intervention",
            description="Deploy visual QR-code guides and smart sorting indicators at disposal stations to curb improper cross-stream contamination.",
            priority="high",
            scenario_type="awareness_campaign",
            scenario_parameters={"contamination_reduction_factor": 0.40},
            estimated_impact="Lowers cross-contamination by 40% and boosts recycling circularity.",
        ),
    ],
    expected_impact=RecommendationExpectedImpact(
        overflow_reduction_pct=65,
        contamination_reduction_pct=40,
        co2_reduction_pct=28,
        efficiency_improvement_pct=34,
    ),
    assumptions=[
        "Twin simulation assumes diesel fleet emissions factor of 0.21 kg CO2/km.",
        "Segregation awareness intervention assumes 80% facility compliance within 14 days.",
        "Live Gemini calls can be activated anytime by providing GEMINI_API_KEY in .env.",
    ],
    is_cached=True,
    data_source="gemini-cache-baseline",
)

_last_cached_response: RecommendationResponse | None = DEFAULT_CACHED_RESPONSE


async def get_recommendations(twin_state: dict) -> RecommendationResponse | ErrorResponse:
    global _last_cached_response
    settings = get_settings()

    if not settings.gemini_api_key:
        if _last_cached_response:
            _last_cached_response.is_cached = True
            return _last_cached_response
        return DEFAULT_CACHED_RESPONSE

    user_message = f"Current twin state:\n{json.dumps(twin_state, indent=2, default=str)}"

    for attempt in range(2):
        try:
            response = await _call_gemini(settings.gemini_api_key, user_message)
            parsed = _parse_response(response)
            if parsed is not None:
                _last_cached_response = parsed
                return parsed
        except (httpx.HTTPError, json.JSONDecodeError, ValueError) as exc:
            if attempt == 0:
                continue
            if _last_cached_response:
                _last_cached_response.is_cached = True
                return _last_cached_response
            err_detail = "LLM service communication error." if not settings.debug else str(exc)
            return ErrorResponse(
                error="Failed to get recommendations from Gemini",
                detail=err_detail,
                retry=True,
            )

    if _last_cached_response:
        _last_cached_response.is_cached = True
        return _last_cached_response
    return ErrorResponse(
        error="Failed to parse Gemini response after retries",
        detail="The LLM returned invalid JSON twice. Try again later.",
        retry=True,
    )


SYSTEM_PROMPT = """You are a waste management advisor for EcoTwin, a digital twin system that monitors waste bins across a facility. You analyze the current state of the waste management ecosystem and provide actionable recommendations.

You MUST respond with valid JSON matching this exact schema:
{
  "issues": [
    {
      "title": "string - short title of the issue",
      "severity": "critical | warning | info",
      "description": "string - what the issue is and why it matters",
      "affected_zones": ["list of zone names"],
      "affected_bins": [list of bin IDs as integers]
    }
  ],
  "actions": [
    {
      "title": "string - short action title",
      "description": "string - what to do and expected result",
      "priority": "high | medium | low",
      "scenario_type": "add_bins | change_frequency | awareness_campaign | null",
      "scenario_parameters": {"key": "value"} or null,
      "estimated_impact": "string - brief expected outcome"
    }
  ],
  "expected_impact": {
    "overflow_reduction_pct": number,
    "contamination_reduction_pct": number,
    "co2_reduction_pct": number,
    "efficiency_improvement_pct": number
  },
  "assumptions": ["list of assumptions you made"]
}

Rules:
- Base every recommendation on the provided twin state data.
- Do not invent statistics or data not present in the input.
- Keep recommendations practical and specific.
- If a recommendation can be run as a scenario, include scenario_type and scenario_parameters. Supported types: 'add_bins', 'change_frequency', 'awareness_campaign'.
- Respond ONLY with the JSON object, no markdown formatting, no code fences."""


async def _call_gemini(api_key: str, user_message: str) -> str:
    models = ["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.8-flash"]
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": SYSTEM_PROMPT + "\n\n" + user_message}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 4096,
            "responseMimeType": "application/json",
        },
    }

    last_err = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            try:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                elif resp.status_code in (404, 400):
                    last_err = f"Model {model} returned {resp.status_code}: {resp.text[:100]}"
                    continue
                else:
                    resp.raise_for_status()
            except httpx.HTTPError as e:
                last_err = e
                continue

    raise RuntimeError(f"All Gemini models failed. Last error: {last_err}")


def _parse_response(raw: str) -> RecommendationResponse | None:
    """Validate raw JSON string against the Pydantic schema."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        if lines[-1].strip().startswith("```"):
            cleaned = "\n".join(lines[1:-1])
        else:
            cleaned = "\n".join(lines[1:])
    cleaned = cleaned.strip()

    data = json.loads(cleaned)

    issues = [RecommendationIssue(**i) for i in data.get("issues", [])]
    actions = [RecommendationAction(**a) for a in data.get("actions", [])]
    impact = RecommendationExpectedImpact(**data.get("expected_impact", {}))
    assumptions = data.get("assumptions", [])

    return RecommendationResponse(
        issues=issues,
        actions=actions,
        expected_impact=impact,
        assumptions=assumptions,
        is_cached=False,
        data_source="ai_generated",
    )

