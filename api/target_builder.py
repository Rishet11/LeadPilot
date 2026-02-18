"""Target Builder Agent: turns plain-English goals into scrape targets."""

import json
import logging
import os
import re
from typing import Any, Dict, List

from .schemas import sanitize_search_text

logger = logging.getLogger("leadpilot")

DEFAULT_CATEGORIES = [
    "dentist",
    "salon",
    "gym",
    "plumber",
    "electrician",
    "restaurant",
    "cafe",
    "hvac",
    "lawyer",
    "real estate",
    "photographer",
    "chiropractor",
    "clinic",
]

_STOP_TERMS = {
    "with",
    "without",
    "under",
    "over",
    "near",
    "around",
    "where",
    "who",
    "that",
    "for",
    "and",
}


def _clean_text(value: str, max_len: int = 100) -> str:
    cleaned = sanitize_search_text((value or "").strip())
    return cleaned[:max_len].strip()


def _coerce_limit(value: Any, default_limit: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default_limit
    return max(1, min(200, parsed))


def _unique_keep_order(items: List[str]) -> List[str]:
    seen = set()
    out = []
    for item in items:
        k = item.lower().strip()
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(item)
    return out


def _extract_categories(objective: str) -> List[str]:
    lowered = objective.lower()
    found = [c for c in DEFAULT_CATEGORIES if c in lowered]
    return _unique_keep_order(found)


def _extract_cities(objective: str) -> List[str]:
    original = objective.strip()
    cities: List[str] = []

    # Pattern: "in miami" / "in new york, boston"
    for match in re.finditer(r"\bin\s+([a-zA-Z][a-zA-Z\s,/-]{1,80})", original):
        phrase = match.group(1)
        stop_match = re.search(
            r"\b(with|without|under|over|near|around|where|who|that|for)\b",
            phrase,
            flags=re.IGNORECASE,
        )
        if stop_match:
            phrase = phrase[: stop_match.start()]

        parts = re.split(r",|/|\band\b", phrase, flags=re.IGNORECASE)
        for part in parts:
            city = _clean_text(part.title(), max_len=80)
            low = city.lower()
            if len(city) < 3:
                continue
            if low in _STOP_TERMS:
                continue
            cities.append(city)

    return _unique_keep_order(cities)


def _coerce_google_targets(items: Any, max_targets: int, default_limit: int) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not isinstance(items, list):
        return out

    for item in items:
        if not isinstance(item, dict):
            continue
        city = _clean_text(str(item.get("city", "")), max_len=100)
        category = _clean_text(str(item.get("category", "")), max_len=100)
        if not city or not category:
            continue
        out.append(
            {
                "city": city,
                "category": category,
                "limit": _coerce_limit(item.get("limit"), default_limit),
            }
        )
        if len(out) >= max_targets:
            break
    return out


def _coerce_instagram_targets(items: Any, max_targets: int, default_limit: int) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not isinstance(items, list):
        return out

    for item in items:
        if not isinstance(item, dict):
            continue
        keyword = _clean_text(str(item.get("keyword", "")), max_len=200)
        if not keyword:
            continue

        payload: Dict[str, Any] = {
            "keyword": keyword,
            "limit": max(1, min(100, _coerce_limit(item.get("limit"), default_limit))),
        }

        followers_min = item.get("followers_min")
        followers_max = item.get("followers_max")
        score_threshold = item.get("score_threshold")

        if isinstance(followers_min, int):
            payload["followers_min"] = max(0, min(10_000_000, followers_min))
        if isinstance(followers_max, int):
            payload["followers_max"] = max(0, min(10_000_000, followers_max))
        if isinstance(score_threshold, int):
            payload["score_threshold"] = max(0, min(100, score_threshold))

        out.append(payload)
        if len(out) >= max_targets:
            break

    return out


def _build_with_rules(
    objective: str,
    max_targets: int,
    default_limit: int,
    include_instagram: bool,
) -> Dict[str, Any]:
    categories = _extract_categories(objective)
    cities = _extract_cities(objective)
    warnings: List[str] = []

    if not categories:
        categories = ["dentist", "salon", "gym"]
        warnings.append("No clear category detected. Using default high-converting categories.")

    if not cities:
        warnings.append("No city detected. Add 'in <city>' to generate location-specific targets.")

    google_targets: List[Dict[str, Any]] = []
    instagram_targets: List[Dict[str, Any]] = []

    if cities:
        for city in cities:
            for category in categories:
                google_targets.append(
                    {
                        "city": city,
                        "category": category,
                        "limit": default_limit,
                    }
                )
                if len(google_targets) >= max_targets:
                    break
            if len(google_targets) >= max_targets:
                break

        if include_instagram:
            for city in cities:
                for category in categories:
                    instagram_targets.append(
                        {
                            "keyword": f"{category} {city}",
                            "limit": max(10, min(100, default_limit)),
                        }
                    )
                    if len(instagram_targets) >= max_targets:
                        break
                if len(instagram_targets) >= max_targets:
                    break

    return {
        "objective": objective,
        "google_maps_targets": google_targets,
        "instagram_targets": instagram_targets,
        "strategy": "Rule-based target extraction from objective",
        "source": "fallback",
        "warnings": warnings,
    }


def _build_with_gemini(
    objective: str,
    max_targets: int,
    default_limit: int,
    include_instagram: bool,
) -> Dict[str, Any]:
    from google import genai
    from google.genai import types

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY missing")

    model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-2.0-flash")
    client = genai.Client(api_key=api_key)

    prompt = f"""Convert the objective into scraping targets for local lead generation.

OBJECTIVE:
{objective}

RULES:
- Return strict JSON object only.
- Keep targets highly relevant for website/digital-service agencies.
- Prefer local service categories with buyer intent.
- Max {max_targets} google_maps_targets.
- Max {max_targets} instagram_targets.
- Use limit={default_limit} unless objective asks otherwise.
- If city is missing, return empty target lists and add a warning.
- instagram_targets should be empty when include_instagram={str(include_instagram).lower()}.

JSON schema:
{{
  "google_maps_targets": [{{"city": "Miami", "category": "dentist", "limit": 50}}],
  "instagram_targets": [{{"keyword": "dentist miami", "limit": 50}}],
  "strategy": "short explanation",
  "warnings": ["optional warning"]
}}
"""

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    text = (response.text or "").strip()
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in text:
        text = text.split("```", 1)[1].split("```", 1)[0].strip()

    payload = json.loads(text)
    if not isinstance(payload, dict):
        raise ValueError("Unexpected AI response format")

    return {
        "objective": objective,
        "google_maps_targets": _coerce_google_targets(payload.get("google_maps_targets"), max_targets, default_limit),
        "instagram_targets": _coerce_instagram_targets(payload.get("instagram_targets"), max_targets, default_limit)
        if include_instagram
        else [],
        "strategy": str(payload.get("strategy") or "AI-generated target strategy"),
        "source": "ai",
        "warnings": [str(w) for w in (payload.get("warnings") or []) if str(w).strip()],
    }


def build_targets_from_objective(
    objective: str,
    max_targets: int = 6,
    default_limit: int = 50,
    include_instagram: bool = False,
) -> Dict[str, Any]:
    objective = (objective or "").strip()
    if not objective:
        return {
            "objective": objective,
            "google_maps_targets": [],
            "instagram_targets": [],
            "strategy": "No objective provided",
            "source": "fallback",
            "warnings": ["Please provide a target objective."],
        }

    # Keep tests deterministic and avoid network in test env.
    environment = os.getenv("ENVIRONMENT", "").lower()
    is_test_runtime = environment in ("test", "pytest") or "PYTEST_CURRENT_TEST" in os.environ
    ai_enabled = bool(os.getenv("GEMINI_API_KEY")) and not is_test_runtime

    if ai_enabled:
        try:
            result = _build_with_gemini(objective, max_targets, default_limit, include_instagram)
            if result.get("google_maps_targets") or result.get("instagram_targets"):
                return result
            result["warnings"] = list(result.get("warnings", [])) + [
                "AI could not produce targets. Using fallback strategy."
            ]
        except Exception as exc:
            logger.warning("Target Builder AI failed, using fallback: %s", exc)

    return _build_with_rules(objective, max_targets, default_limit, include_instagram)
