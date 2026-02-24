# LeadPilot Frontend

A Next.js dashboard for the LeadPilot lead generation system.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment:
```bash
# Create .env.local with your API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Google sign-in client ID (must match backend GOOGLE_CLIENT_ID)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=

# Optional: Live checkout links
NEXT_PUBLIC_DODO_LAUNCH_URL=
NEXT_PUBLIC_DODO_STARTER_URL=
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Pages

- **Dashboard** - Metrics, recent activity, quick scrape
- **Batch Queue** - Queue multiple city/industry targets + apply niche playbooks
- **Leads CRM** - View, filter, and manage leads
- **Instagram** - Instagram keyword scraper
- **Settings** - AI prompt and scoring configuration

## Build for Production

```bash
npm run build
npm start
```

## Deploy to Vercel

```bash
vercel
```
