
import os
import sys
import logging

# Add parent directory to path so we can import lead_agent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lead_agent import analyze_leads_batch

# Setup logging
logging.basicConfig(level=logging.INFO)

# Test leads specifically created to trigger CATEGORY_HOOKS
targeted_leads = [
    {
        "id": 0,
        "name": "BodyWorks Gym",
        "category": "Gym",
        "city": "London",
        "rating": 4.9,
        "reviews": 200,
        "website": "",
        "phone": "+44 123 456 7890"
    },
    {
        "id": 1,
        "name": "Tony's Pizza",
        "category": "Restaurant",
        "city": "Leeds",
        "rating": 4.3,
        "reviews": 500,
        "website": "",
        "phone": "+44 111 222 3333"
    },
    {
        "id": 2,
        "name": "Emergency Plumber 24/7",
        "category": "Plumber",
        "city": "Manchester",
        "rating": 4.7,
        "reviews": 45,
        "website": "",
        "phone": "+44 555 666 7777"
    }
]

print("\n--- TESTING CATEGORY SPECIFIC HOOKS (Phase 2) ---\n")
results = analyze_leads_batch(targeted_leads)
for lead in results:
    analysis = lead.get('ai_analysis', {})
    print(f"CATEGORY: {lead['category']}")
    print(f"MESSAGE:\n{analysis.get('outreach_angle')}")
    print("-" * 50)
