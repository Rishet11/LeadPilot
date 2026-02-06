
import os
import sys
import logging

# Add parent directory to path so we can import lead_agent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lead_agent import analyze_leads_batch, generate_instagram_dms_batch

# Setup logging
logging.basicConfig(level=logging.INFO)

dummy_leads = [
    {
        "id": 0,
        "name": "Iron Paradise Gym",
        "category": "Gym",
        "city": "London",
        "rating": 4.8,
        "reviews": 120,
        "website": "",
        "phone": "+44 123 456 7890"
    },
    {
        "id": 1,
        "name": "Bella Italia Pizza",
        "category": "Restaurant",
        "city": "Manchester",
        "rating": 4.2,
        "reviews": 450,
        "website": "",
        "phone": "+44 987 654 3210"
    },
    {
        "id": 2,
        "name": "Sparkle Cleaners",
        "category": "Cleaning Service",
        "city": "Leeds",
        "rating": 5.0,
        "reviews": 15,
        "website": "linktr.ee/sparkle",
        "phone": "+44 555 123 4567"
    }
]

dummy_insta_profiles = [
    {
        "username": "glam_by_sarah",
        "bio": "Makeup Artist | Bridal specialist | DM to book",
        "followers": 5200,
        "external_url": "",
        "has_real_website": False
    },
    {
        "username": "fit_with_mike",
        "bio": "Online Coach | helping dads get shredded",
        "followers": 12000,
        "external_url": "linktr.ee/mikefit",
        "has_real_website": False
    }
]

print("\n--- TESTING WHATSAPP OUTREACH (Should be No Emojis, 3 Patterns) ---\n")
results = analyze_leads_batch(dummy_leads)
for lead in results:
    analysis = lead.get('ai_analysis', {})
    print(f"LEAD: {lead['name']}")
    print(f"PRIORITY: {analysis.get('priority')}")
    print(f"MESSAGE:\n{analysis.get('outreach_angle')}")
    print("-" * 50)

print("\n\n--- TESTING INSTAGRAM DMs (Should have Emojis, Short) ---\n")
dm_results = generate_instagram_dms_batch(dummy_insta_profiles)
for res in dm_results:
    print(f"PROFILE ID: {res.get('id')}")
    print(f"DM:\n{res.get('dm_message')}")
    print("-" * 50)
