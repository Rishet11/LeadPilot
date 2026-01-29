# LeadPilot 🎯

An AI-powered lead generation system that discovers local businesses without websites and generates high-conversion outreach messages.

## Features

- 🔍 **Google Maps Scraping** - Batch scrape local businesses from any city/region via Apify
- 📸 **Instagram Discovery** - Find micro-businesses (configurable follower range, no website)
- 📊 **Smart Lead Scoring** - Rule-based scoring prioritizes no-website, high-review businesses
- 🤖 **AI Outreach Generation** - Personalized WhatsApp/DM messages via Gemini AI
- 🌍 **Any Region Support** - Target any city globally (just specify in config)
- 📁 **CSV Export** - Ready-to-use lead lists with contact info and AI-generated messages

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set up environment
cp .env.example .env
# Add your APIFY_API_TOKEN and GEMINI_API_KEY

# 3. Run single target
python main.py --city "London, UK" --category "Restaurant" --limit 50

# 4. Run batch pipeline (multiple targets)
python batch_processor.py

# 5. Run Instagram pipeline
python instagram_pipeline.py
```

---

## Pipelines

### Single Target (`main.py`)

Quick run for a single city/category combination.

```bash
python main.py --city "Berlin, Germany" --category "Gym" --limit 30
python main.py --dry-run  # Test with demo data
```

### Batch Pipeline (`batch_processor.py`)

Run multiple city/category combinations at once.

```bash
python batch_processor.py
```

**Configure targets in `batch_config.json`:**
```json
{
  "targets": [
    {"city": "Mumbai, India", "category": "Dental Clinic", "limit": 20},
    {"city": "London, UK", "category": "Plumber", "limit": 15},
    {"city": "Sydney, Australia", "category": "Fitness Studio", "limit": 20},
    {"city": "Toronto, Canada", "category": "HVAC Contractor", "limit": 15}
  ]
}
```

### Instagram Pipeline (`instagram_pipeline.py`)

Find micro-businesses on Instagram without proper websites.

```bash
python instagram_pipeline.py
```

**Configure targets in `instagram_batch_config.json`:**
```json
{
  "targets": [
    {"keyword": "home baker london", "limit": 50},
    {"keyword": "makeup artist toronto", "limit": 50},
    {"keyword": "personal trainer sydney", "limit": 30}
  ]
}
```

---

## Scoring Logic

Leads are scored 0-100 based on their potential as website development clients:

| Condition | Points |
|-----------|--------|
| No website | +50 |
| 100+ reviews (high volume) | +30 |
| 30-99 reviews (medium volume) | +15 |
| Rating ≥ 4.5 | +20 |
| Rating ≥ 4.0 | +10 |
| High-value category | +10 |
| Low rating < 3.8 (reputation fix opportunity) | +15 |

**High-value categories:** dental, skin, physio, gym, clinic, hvac, plumber, fitness

**Prime targets:** No website + 100+ reviews + 4.5+ rating = Score 100

---

## Project Structure

```
LeadPilot/
├── main.py                  # Single target CLI
├── batch_processor.py       # Multi-target batch orchestrator
├── instagram_pipeline.py    # Instagram batch orchestrator
├── apify_client.py          # Apify API wrapper (Google Maps + Instagram)
├── cleaner.py               # Data normalization
├── scorer.py                # Lead scoring logic
├── lead_agent.py            # AI message generation (Gemini)
├── exporter.py              # CSV export
├── config.json              # Default configuration
├── batch_config.json        # Google Maps batch targets
├── instagram_batch_config.json  # Instagram batch targets
└── data/
    ├── google_maps_all_leads.csv  # Consolidated Google Maps leads
    └── instagram_all_leads.csv    # Consolidated Instagram leads
```

---

## CLI Options

```bash
python main.py [OPTIONS]

Options:
  --city TEXT          Target city (e.g., "Paris, France")
  --category TEXT      Business category (e.g., "Restaurant")
  --limit INT          Max results (default: 100)
  --dry-run            Use demo data (no API calls)
  --check-websites     Verify website accessibility
  --agent              Enable AI outreach generation (default: on)
  --config PATH        Custom config file path
```

---

## API Keys Required

| Service | Required | Get it here |
|---------|----------|-------------|
| Apify | ✅ Yes | [apify.com](https://apify.com) → Settings → Integrations |
| Gemini | ✅ Yes | [aistudio.google.com](https://aistudio.google.com/apikey) |

---

## Output Format

The exported CSV contains:

| Column | Description |
|--------|-------------|
| `name` | Business name |
| `phone` | Contact number |
| `city` | Location |
| `category` | Business type |
| `rating` | Google/Instagram rating |
| `reviews` | Review count |
| `website` | Website URL (if any) |
| `lead_score` | 0-100 priority score |
| `reason` | Scoring explanation |
| `ai_outreach` | Generated WhatsApp/DM message |
| `source` | "google_maps" or "instagram" |
| `country` | Detected country |

---

## License

MIT
