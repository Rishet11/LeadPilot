# LeadPilot 🎯

A local-first Python agent that discovers small businesses with poor online presence and exports qualified leads.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Copy env template and add your API keys
cp .env.example .env
# Edit .env with your APIFY_API_TOKEN

# 3. Run with demo data (no API needed)
python main.py --dry-run

# 4. Run with real data
python main.py --city "Mumbai" --category "Bakery" --limit 50
```

## Features

- 🔍 **Google Maps Scraping** via Apify
- 🧹 **Data Cleaning** - Normalizes phones, removes duplicates
- 📊 **Lead Scoring** - Rule-based scoring (0-100)
- 📸 **Instagram Enrichment** - Fetch follower counts
- 📧 **Email Finder** - Scrape/guess contact emails
- 🤖 **Agentic AI Mode** - Autonomous lead evaluation with Gemini
- 📁 **CSV Export** - Ready-to-use lead lists
- 📊 **Google Sheets** - Optional cloud export

## Scoring Logic

| Condition | Points |
|-----------|--------|
| No website | +40 |
| Low Instagram (<5k) | +20 |
| Few reviews (<50) | +15 |
| Low rating (<4.2) | +10 |
| Priority category | +15 |

## CLI Options

```bash
python main.py [OPTIONS]

Options:
  --city TEXT          Target city (default: Delhi)
  --category TEXT      Business category (default: Gym)
  --limit INT          Max results (default: 100)
  --dry-run            Use demo data
  --check-websites     Verify website accessibility
  --enrich-instagram   Fetch Instagram follower counts
  --find-emails        Find contact email addresses
  --agent              Enable agentic AI mode
  --ai-summary         Add Gemini AI summaries
  --google-sheets      Export to Google Sheets
```

## Project Structure

```
LeadPilot/
├── main.py                 # CLI + orchestrator
├── config.json             # Configuration
├── apify_client.py         # Google Maps scraper
├── cleaner.py              # Data normalization
├── scorer.py               # Rule-based scoring
├── instagram_enricher.py   # Instagram follower counts
├── email_finder.py         # Email discovery
├── lead_agent.py           # Agentic AI evaluation
├── exporter.py             # CSV/Sheets export
├── ai_summary.py           # Gemini summaries
├── EXAMPLES.md             # Real-world examples
└── data/
    ├── raw.json            # Raw API response
    └── leads.csv           # Final output
```

## Complete Pipeline

```
1. Scrape        → Google Maps (Apify)
2. Clean         → Normalize phones, dedupe
3. Enrich        → Instagram followers + Emails
4. Score         → Rule-based (0-100)
5. AI Analysis   → Autonomous evaluation (optional)
6. Export        → CSV + Google Sheets
```

## API Keys Required

1. **Apify** (required): [apify.com](https://apify.com) → Settings → Integrations
2. **Gemini** (optional): [aistudio.google.com](https://aistudio.google.com/apikey)
3. **Google Sheets** (optional): Service account credentials

## License

MIT
