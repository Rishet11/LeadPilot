"""Curated niche campaign templates for local outbound teams."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

TEMPLATE_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "id": "dentist_growth",
        "name": "Dentist Website Upgrade Sprint",
        "vertical": "dental",
        "ideal_for": "web design and local SEO agencies",
        "objective": "Find dentists with strong reviews but weak website funnel and no booking flow.",
        "expected_outcome": "20-40 qualified dental prospects in about 15 minutes.",
        "google_maps_targets": [
            {"city": "Miami", "category": "dentist", "limit": 45},
            {"city": "Fort Lauderdale", "category": "dentist", "limit": 35},
            {"city": "Orlando", "category": "cosmetic dentist", "limit": 30},
        ],
        "instagram_targets": [
            {"keyword": "dentist miami", "limit": 35},
            {"keyword": "cosmetic dentist florida", "limit": 30},
        ],
    },
    {
        "id": "medspa_followup",
        "name": "Med Spa Retention Booster",
        "vertical": "med_spa",
        "ideal_for": "growth agencies selling paid ads + landing pages",
        "objective": "Find med spas with high intent signals but outdated site and weak follow-up.",
        "expected_outcome": "15-30 high-ticket med spa leads with strong outreach angles.",
        "google_maps_targets": [
            {"city": "Austin", "category": "med spa", "limit": 45},
            {"city": "Dallas", "category": "med spa", "limit": 40},
            {"city": "Houston", "category": "medical spa", "limit": 35},
        ],
        "instagram_targets": [
            {"keyword": "med spa austin", "limit": 30},
            {"keyword": "botox clinic dallas", "limit": 30},
        ],
    },
    {
        "id": "hvac_local",
        "name": "HVAC Local Service Expansion",
        "vertical": "hvac",
        "ideal_for": "local lead-gen teams and freelancers",
        "objective": "Find HVAC businesses with reviews but poor conversion-focused web presence.",
        "expected_outcome": "30-60 service-business prospects for recurring monthly retainers.",
        "google_maps_targets": [
            {"city": "Phoenix", "category": "hvac", "limit": 50},
            {"city": "Mesa", "category": "air conditioning contractor", "limit": 40},
            {"city": "Scottsdale", "category": "heating contractor", "limit": 35},
        ],
        "instagram_targets": [
            {"keyword": "hvac phoenix", "limit": 30},
        ],
    },
    {
        "id": "salon_reactivation",
        "name": "Salon Reactivation Campaign",
        "vertical": "salon",
        "ideal_for": "social media and booking funnel specialists",
        "objective": "Find salons with good ratings but weak digital booking and retention systems.",
        "expected_outcome": "25-50 local salon prospects for booking optimization offers.",
        "google_maps_targets": [
            {"city": "Los Angeles", "category": "hair salon", "limit": 45},
            {"city": "San Diego", "category": "beauty salon", "limit": 40},
            {"city": "Irvine", "category": "hair salon", "limit": 35},
        ],
        "instagram_targets": [
            {"keyword": "hair salon los angeles", "limit": 35},
            {"keyword": "beauty salon san diego", "limit": 30},
        ],
    },
]


def _normalize_vertical(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (value or "").strip().lower())


def list_agent_templates(include_instagram: bool, vertical: Optional[str] = None) -> List[Dict[str, Any]]:
    requested_vertical = _normalize_vertical(vertical or "")

    templates: List[Dict[str, Any]] = []
    for raw in TEMPLATE_DEFINITIONS:
        if requested_vertical and _normalize_vertical(raw["vertical"]) != requested_vertical:
            continue

        item = {
            "id": raw["id"],
            "name": raw["name"],
            "vertical": raw["vertical"],
            "ideal_for": raw["ideal_for"],
            "objective": raw["objective"],
            "expected_outcome": raw["expected_outcome"],
            "google_maps_targets": list(raw.get("google_maps_targets") or []),
            "instagram_targets": list(raw.get("instagram_targets") or []) if include_instagram else [],
        }
        templates.append(item)

    return templates
