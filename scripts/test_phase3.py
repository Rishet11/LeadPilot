
import os
import sys
import logging

# Add parent directory to path so we can import lead_agent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lead_agent import analyze_leads_batch, generate_instagram_dms_batch

# Setup logging
logging.basicConfig(level=logging.INFO)

# Test leads for Phase 3 Verification
test_leads = [
    {
        "id": 0,
        "name": "Elite Fitness Gym",
        "category": "Gym",
        "city": "London",
        "rating": 4.9,
        "reviews": 300,  # Should trigger high revenue loss: 300*0.5*50 = $7500
        "website": "",
        "phone": "+44 777 888 9999"
    },
    {
        "id": 1,
        "name": "Mama Mia Pizzeria",
        "category": "Restaurant",
        "city": "Manchester",
        "rating": 4.5,
        "reviews": 800, # Should trigger massive revenue loss: 800*0.5*50 = $20000
        "website": "",
        "phone": "+44 222 333 4444"
    }
]

test_insta = [
    {
        "username": "london_stylist_jane",
        "bio": "Hair Stylist | Balayage Expert | DM for appts",
        "followers": 8500,
        "external_url": "",
        "has_real_website": False
    }
]

print("\n--- TESTING PHASE 3: GRAMMAR + REVENUE CALC + A/B METADATA ---\n")
results = analyze_leads_batch(test_leads)

for lead in results:
    analysis = lead.get('ai_analysis', {})
    pattern = lead.get('pattern_used', 'N/A')
    
    print(f"LEAD: {lead['name']}")
    print(f"PATTERN USED: {pattern}")
    print(f"MESSAGE:\n{analysis.get('outreach_angle')}")
    print("-" * 50)

print("\n--- TESTING INSTAGRAM (Checking Capitalization) ---\n")
insta_results = generate_instagram_dms_batch(test_insta)
for res in insta_results:
    print(f"DM MESSAGE:\n{res.get('dm_message')}")
    print("-" * 50)
