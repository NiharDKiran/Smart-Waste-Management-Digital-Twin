import json
from datetime import datetime, timezone
import httpx
from app.config import get_settings
from app.schemas import (
    RecommendationResponse,
    RecommendationIssue,
    RecommendationAction,
    RecommendationExpectedImpact,
    ErrorResponse,
)

_last_real_inference: RecommendationResponse | None = None
_last_inference_timestamp: str | None = None


async def get_recommendations(twin_state: dict) -> RecommendationResponse | ErrorResponse:
    global _last_real_inference, _last_inference_timestamp
    settings = get_settings()

    if not settings.gemini_api_key:
        if _last_real_inference is not None:
            cached = _last_real_inference.model_copy(deep=True)
            cached.is_cached = True
            cached.data_source = "session-cache"
            cached.timestamp = _last_inference_timestamp
            return cached
        return ErrorResponse(
            error="Gemini API unavailable",
            detail="Gemini API key is not configured and no cached inference exists for this session.",
            retry=False,
        )

    user_message = f"Current twin state:\n{json.dumps(twin_state, indent=2, default=str)}"

    for attempt in range(2):
        try:
            response = await _call_gemini(settings.gemini_api_key, user_message)
            parsed = _parse_response(response)
            if parsed is not None:
                now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                parsed.timestamp = now_str
                parsed.is_cached = False
                parsed.data_source = "ai_generated"
                _last_real_inference = parsed
                _last_inference_timestamp = now_str
                return parsed
        except (httpx.HTTPError, json.JSONDecodeError, ValueError) as exc:
            if attempt == 0:
                continue
            if _last_real_inference is not None:
                cached = _last_real_inference.model_copy(deep=True)
                cached.is_cached = True
                cached.data_source = "session-cache"
                cached.timestamp = _last_inference_timestamp
                return cached
            err_detail = "LLM service communication error." if not settings.debug else str(exc)
            return ErrorResponse(
                error="Failed to get recommendations from Gemini",
                detail=err_detail,
                retry=True,
            )

    if _last_real_inference is not None:
        cached = _last_real_inference.model_copy(deep=True)
        cached.is_cached = True
        cached.data_source = "session-cache"
        cached.timestamp = _last_inference_timestamp
        return cached

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
