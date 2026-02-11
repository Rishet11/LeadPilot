# LeadPilot 🚀

**Autonomous B2B Lead Generation Engine for Agencies**

LeadPilot is an AI-powered lead generation platform that automates prospecting, filtering, and personalized outreach for B2B sales teams. It identifies high-value leads with poor digital presence and generates hyper-personalized messages to maximize conversion rates.

---

## ⚡ Features

### 🔍 Multi-Source Discovery
- **Google Maps**: Scrapes businesses by city and category (e.g., "Dentists in London") via Apify.
- **Instagram**: Finds niche businesses via hashtag/keyword search (e.g., "home baker dubai").
- **Email Finder**: Built-in crawler visits business websites to extract contact emails.

### 🧠 AI Intelligence (Powered by Gemini)
- **Smart Scoring**: Filters out low-value prospects. Prioritizes businesses with high review counts but no website or poor social presence.
- **Auto-Personalization**: Reads customer reviews to generate "Human-like" outreach messages (e.g., "Saw your customers love the pastry but hate the wait times...").
- **Configurable Models**: Switch between Gemini models (e.g., `gemini-2.0-flash`, `gemini-3-flash`) via environment variables.

### ⚙️ Automation & Scale
- **Batch Processing**: Run scraping jobs for multiple cities and categories in one go.
- **Daily Cron**: Automated script (`run_daily.sh`) for recurring lead generation.
- **API-First**: Full FastAPI backend for integration.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4 |
| **Backend API** | FastAPI, Uvicorn |
| **Core Logic** | Python 3.9+, Pandas |
| **AI Engine** | Google Gemini (via `google-genai`) |
| **Scraping** | Apify Client, BeautifulSoup4 |
| **Container** | Docker |

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- Python 3.9+
- Apify Account (for scraping)
- Google AI Studio Key (for Gemini)

### 1. Clone Repository
```bash
git clone https://github.com/Rishet11/LeadPilot.git
cd LeadPilot
```

### 2. Backend Setup
```bash
# Create and activate virtual env
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```
**Edit `.env`** with your keys:
- `APIFY_API_TOKEN`
- `GEMINI_API_KEY`
- `GEMINI_MODEL_NAME` (optional, defaults to `gemini-2.0-flash`)

### 3. Frontend Setup
```bash
cd frontend
npm install

# Configure environment
cp .env.example .env.local
```

---

## 🏃 Usage

### Option 1: CLI (Quick Start)
Run the pipeline directly from your terminal:

```bash
# Basic run
python main.py --city "London" --category "Gym" --limit 20

# Full power (AI + Email Finding)
python main.py --city "Austin" --category "Plumber" --agent --find-emails
```

### Option 2: Full Application (Server + UI)

**Terminal 1 (Backend):**
```bash
uvicorn api.main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
Access the dashboard at `http://localhost:3000`.

### Option 3: Docker
```bash
docker-compose up --build
```

---

## 📁 Project Structure

```
LeadPilot/
├── api/                 # FastAPI backend routers and logic
│   ├── routers/         # Endpoints for leads, scraping, jobs
│   └── main.py          # App entry point
├── frontend/            # Next.js 16 Application
├── data/                # Generated CSVs and JSONs
├── logs/                # Runtime logs
├── scripts/             # Helper scripts (verification, tests)
├── main.py              # CLI entry point
├── lead_agent.py        # Gemini AI Logic
├── instagram_pipeline.py# Instagram specific logic
├── email_scraper.py     # Website crawler
└── run_daily.sh         # Automation script
```

---

## 🧪 Testing

Run the test suite to ensure everything is working:

```bash
pytest tests/
```

To verify the Gemini model configuration specifically:
```bash
PYTHONPATH=. python3 scripts/verify_model_refactor.py
```

---

## 📜 License

MIT License. Built by [Rishet Mehra](https://github.com/Rishet11).
