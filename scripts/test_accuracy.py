
import os
import sys
import logging

# Add parent directory to path so we can import lead_agent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lead_agent import analyze_leads_batch

# Setup logging
logging.basicConfig(level=logging.INFO)

# Test leads for "Missed Opportunities" Logic
test_leads = [
    {
        "id": 0,
        "name": "London Power Gym",
        "category": "Gym",
        "city": "London",
        "rating": 4.9,
        "reviews": 100,
        # Exp: 50 missed members
    },
    {
        "id": 1,
        "name": "Delhi Spicy Cafe",
        "category": "Cafe",
        "city": "New Delhi",
        "rating": 4.3,
        "reviews": 300,
        # Exp: 150 missed diners
    },
    {
        "id": 2,
        "name": "NYC Emergency Plumbing",
        "category": "Plumber",
        "city": "New York",
        "rating": 4.7,
        "reviews": 80,
        # Exp: 40 missed customers
    }
]

print("\n--- TESTING SAFE CALCULATOR (Missed Volumes) ---\n")
results = analyze_leads_batch(test_leads)

for lead in results:
    analysis = lead.get('ai_analysis', {})
    print(f"LEAD: {lead['name']} ({lead['city']})")
    print(f"MESSAGE:\n{analysis.get('outreach_angle')}")
    print("-" * 50)
