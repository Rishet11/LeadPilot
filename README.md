# LeadPilot

**Autonomous B2B Lead Generation Engine**

LeadPilot is an AI-powered lead generation platform that automates prospecting, filtering, and personalized outreach for B2B sales teams. It identifies high-value leads with poor digital presence and generates hyper-personalized messages to maximize conversion rates.

---

## Features

### Multi-Source Prospecting
- **Google Maps Integration** - Find businesses by location and category (e.g., "Dentists in London")
- **Instagram Discovery** - Discover niche businesses via hashtags and keywords (e.g., "interior designer dubai")

### Intelligent Lead Scoring
- Automatically filters out low-value prospects (perfect ratings with established websites)
- Prioritizes "Digital Misfits" - businesses with revenue potential but weak online presence

### AI-Powered Outreach
- Generates personalized direct messages for each lead
- Leverages real business data (ratings, reviews, website status) to craft compelling hooks

### Real-Time Dashboard
- Live progress tracking for scraping jobs
- Lead CRM with status management (New → Contacted → Closed)
- Batch processing queue for bulk operations

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js UI    │────▶│  FastAPI Server  │────▶│    Database     │
│   (Frontend)    │     │    (Backend)     │     │ SQLite/Postgres │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
            ┌──────────────┐      ┌──────────────┐
            │    Apify     │      │ Google Gemini│
            │  (Scraping)  │      │     (AI)     │
            └──────────────┘      └──────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Database | SQLite (development) / PostgreSQL (production) |
| AI Engine | Google Gemini Pro |
| Scraping | Apify Actors |

---

## Installation

### Prerequisites
- Node.js 18+
- Python 3.9+
- Git

### Clone Repository
```bash
git clone https://github.com/Rishet11/LeadPilot.git
cd LeadPilot
```

### Backend Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Add your API keys (APIFY_API_TOKEN, GEMINI_API_KEY)
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
```


### Run Development Server

**Option 1: Docker Compose (Recommended)**
```bash
# One-command startup
make docker-up

# Or manually
docker-compose up --build
```

Access the dashboard at `http://localhost:3000`

**Option 2: Manual (Two terminals)**

**Terminal 1 - Backend:**
```bash
uvicorn api.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Access the dashboard at `http://localhost:3000`

---

## Testing

Run the test suite:

```bash
# Run all tests
make test

# Run with coverage
make test-cov

# Run specific test file
pytest tests/test_api.py -v
```

**Code quality:**
```bash
make lint    # Check code style
make format  # Auto-format code
```

---

## Deployment

### Backend (Railway)
1. Create a new project on [Railway](https://railway.app) from your GitHub repository
2. Configure environment variables:
   - `LEADPILOT_API_KEY` - Secure random string for API authentication
   - `APIFY_API_TOKEN` - Your Apify API key
   - `GEMINI_API_KEY` - Your Google AI API key
   - `ALLOWED_ORIGINS` - Your Vercel frontend URL
3. Railway auto-deploys using `railway.toml`

### Frontend (Vercel)
1. Create a new project on [Vercel](https://vercel.com) from your GitHub repository
2. Set root directory to `frontend`
3. Configure environment variables:
   - `NEXT_PUBLIC_API_URL` - Your Railway backend URL
   - `NEXT_PUBLIC_API_KEY` - Same key as `LEADPILOT_API_KEY`
4. Deploy

---

## Security

- **API Key Authentication** - All backend endpoints require `X-API-Key` header
- **Rate Limiting** - Built-in throttling to prevent abuse
- **CORS Protection** - Strict origin policies in production

---

## Documentation

- **[API Reference](docs/API.md)** - Complete API endpoint documentation
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Author:** [Rishet Mehra](https://github.com/Rishet11)
