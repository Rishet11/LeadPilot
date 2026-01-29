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
- 📁 **CSV Export** - Ready-to-use lead lists
- 📊 **Google Sheets** - Optional cloud export
- 🤖 **AI Summaries** - Gemini-powered insights

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
  --ai-summary         Add Gemini AI summaries
  --google-sheets      Export to Google Sheets
```

## Project Structure

```
LeadPilot/
├── main.py           # CLI + orchestrator
├── config.json       # Configuration
├── apify_client.py   # Apify integration
├── cleaner.py        # Data normalization
├── scorer.py         # Lead scoring
├── exporter.py       # CSV/Sheets export
├── ai_summary.py     # Gemini summaries
└── data/
    ├── raw.json      # Raw API response
    └── leads.csv     # Final output
```

## API Keys Required

1. **Apify** (required): [apify.com](https://apify.com) → Settings → Integrations
2. **Gemini** (optional): [aistudio.google.com](https://aistudio.google.com/apikey)
3. **Google Sheets** (optional): Service account credentials

## License

MIT
