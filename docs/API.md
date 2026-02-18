# LeadPilot API Documentation

## Overview
REST API for the LeadPilot lead generation system. Provides endpoints for managing leads, triggering scrapes, and viewing job status.

**Base URL:** `http://localhost:8000` (development)

---

## Authentication

All endpoints require a bearer token in the header:

```http
Authorization: Bearer your_access_token_here
```

**Development mode:** Set `REQUIRE_AUTH=false` in `.env` to disable auth locally.

Google login is available via `POST /api/auth/google`. This endpoint exchanges a Google ID token for a LeadPilot bearer session token.

---

## Endpoints

### Health Check

#### `GET /api/health`
Check API health status.

**Response:**
```json
{
  "status": "healthy"
}
```

---

### Auth

#### `POST /api/auth/google`
Exchange a Google ID token for a LeadPilot bearer token.

**Request Body:**
```json
{
  "id_token": "google_id_token_here"
}
```

**Response:**
```json
{
  "access_token": "lps_...",
  "token_type": "bearer",
  "customer_id": 12,
  "email": "owner@example.com",
  "name": "Owner Name",
  "plan_tier": "free",
  "is_new_customer": true
}
```

**Required env:** `GOOGLE_CLIENT_ID` must be set on the backend.

---

### Leads

#### `GET /api/leads/`
Get list of leads with optional filters.

**Query Parameters:**
- `skip` (int): Pagination offset (default: 0)
- `limit` (int): Results per page (default: 100, max: 500)
- `status` (string): Filter by status (`new`, `contacted`, `replied`, etc.)
- `source` (string): Filter by source (`google_maps`, `instagram`)
- `min_score` (int): Minimum lead score (0-100)
- `city` (string): Filter by city name
- `category` (string): Filter by category
- `no_website` (bool): Only leads without websites

**Example:**
```bash
curl -H "Authorization: Bearer your_access_token" \
  "http://localhost:8000/api/leads/?min_score=80&no_website=true&limit=50"
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Joe's Pizza",
    "phone": "+12125551234",
    "city": "New York",
    "category": "Restaurant",
    "rating": 4.5,
    "reviews": 120,
    "website": null,
    "email": "contact@joespizza.com",
    "lead_score": 85,
    "ai_outreach": "Hi Joe! Your 4.5★ rating shows...",
    "status": "new",
    "source": "google_maps",
    "created_at": "2026-02-06T10:30:00Z",
    "updated_at": "2026-02-06T10:30:00Z"
  }
]
```

---

#### `GET /api/leads/stats`
Get lead statistics.

**Response:**
```json
{
  "total_leads": 450,
  "high_priority_leads": 120,
  "leads_by_status": {
    "new": 300,
    "contacted": 100,
    "replied": 30,
    "closed": 20
  },
  "leads_by_source": {
    "google_maps": 380,
    "instagram": 70
  }
}
```

---

#### `GET /api/leads/{lead_id}`
Get a specific lead by ID.

**Response:** Single lead object (see above)

---

#### `PATCH /api/leads/{lead_id}/status`
Update lead status.

**Request Body:**
```json
{
  "status": "contacted"
}
```

**Valid statuses:** `new`, `contacted`, `replied`, `meeting`, `closed`, `not_interested`

---

#### `DELETE /api/leads/{lead_id}`
Delete a single lead.

**Response:**
```json
{
  "message": "Lead deleted successfully"
}
```

---

#### `POST /api/leads/batch-delete`
Delete multiple leads at once.

**Request Body:**
```json
{
  "lead_ids": [1, 2, 3, 45, 67]
}
```

**Response:**
```json
{
  "message": "Successfully deleted 5 leads",
  "count": 5
}
```

---

### Scraping

#### `POST /api/scrape/single`
Trigger a single Google Maps scrape.

**Request Body:**
```json
{
  "city": "Los Angeles",
  "category": "dental clinic",
  "limit": 50
}
```

**Response:**
```json
{
  "job_id": 42,
  "status": "pending",
  "message": "Scrape job queued"
}
```

Note: scrape jobs are queued and processed by the worker process (`python worker.py`).

---

#### `POST /api/scrape/google-maps`
Trigger batch Google Maps scrape.

**Request Body:**
```json
{
  "targets": [
    {"city": "New York", "category": "bakery", "limit": 50},
    {"city": "Chicago", "category": "gym", "limit": 30}
  ]
}
```

---

#### `POST /api/scrape/instagram`
Trigger Instagram scrape.

**Request Body:**
```json
{
  "targets": [
    {
      "keyword": "coffee shop dubai",
      "limit": 50,
      "followers_min": 1000,
      "followers_max": 10000
    }
  ]
}
```

---

### Jobs

#### `GET /api/jobs/`
Get recent scraping jobs.

**Query Parameters:**
- `limit` (int): Number of jobs to return (default: 20)

**Response:**
```json
[
  {
    "id": 42,
    "job_type": "google_maps",
    "targets": "{\"city\": \"Los Angeles\", \"category\": \"dental clinic\"}",
    "status": "completed",
    "leads_found": 48,
    "error_message": null,
    "started_at": "2026-02-06T10:00:00Z",
    "completed_at": "2026-02-06T10:05:30Z",
    "created_at": "2026-02-06T10:00:00Z"
  }
]
```

---

### Agents

#### `POST /api/agents/target-builder`
Generate scrape targets from a plain-English objective.

**Request Body:**
```json
{
  "objective": "find dentists and salons in miami and austin with weak digital presence",
  "max_targets": 6,
  "default_limit": 50,
  "include_instagram": false
}
```

**Response:**
```json
{
  "objective": "find dentists and salons in miami and austin with weak digital presence",
  "google_maps_targets": [
    {"city": "Miami", "category": "dentist", "limit": 50},
    {"city": "Austin", "category": "salon", "limit": 50}
  ],
  "instagram_targets": [],
  "strategy": "AI-generated target strategy",
  "source": "ai",
  "warnings": []
}
```

---

#### `GET /api/agents/templates`
Get curated niche playbooks for fast campaign launch.

**Query Parameters:**
- `vertical` (optional): Filter by template vertical (e.g. `dental`, `hvac`, `salon`).

**Behavior:**
- Templates are plan-aware.
- `instagram_targets` are automatically removed for plans without Instagram entitlement.

**Response:**
```json
[
  {
    "id": "dentist_growth",
    "name": "Dentist Website Upgrade Sprint",
    "vertical": "dental",
    "ideal_for": "web design and local SEO agencies",
    "objective": "Find dentists with strong reviews but weak website funnel and no booking flow.",
    "expected_outcome": "20-40 qualified dental prospects in about 15 minutes.",
    "google_maps_targets": [
      {"city": "Miami", "category": "dentist", "limit": 45}
    ],
    "instagram_targets": []
  }
]
```

---

### Usage & Plans

#### `GET /api/usage/current`
Get current monthly usage for the authenticated customer.

#### `GET /api/plans/current`
Get active plan entitlements (quota, instagram access, concurrency).

---

#### `GET /api/jobs/{job_id}`
Get specific job details.

**Response:** Single job object (see above)

---

### Settings

#### `GET /api/settings`
Get all settings (AI prompts, etc.).

**Response:**
```json
[
  {
    "key": "ai_system_prompt",
    "value": "You are a lead generation assistant...",
    "updated_at": "2026-02-06T09:00:00Z"
  }
]
```

---

#### `PUT /api/settings/{key}`
Update a setting value.

**Request Body:**
```json
{
  "key": "ai_system_prompt",
  "value": "Updated prompt text here"
}
```

---

#### `POST /api/settings/reset`
Reset all settings to defaults.

---

## Rate Limits

- **Read operations:** 100 requests/minute
- **Write operations:** 30 requests/minute
- **Scrape operations:** 10 requests/hour

Rate limits are tenant-aware: keyed by bearer token when present, fallback to IP address.

---

## Error Responses

All errors return standard format:

```json
{
  "detail": "Error message here"
}
```

**Common status codes:**
- `400` - Bad request (invalid parameters)
- `401` - Missing bearer token
- `403` - Invalid/expired bearer token
- `404` - Resource not found
- `429` - Rate limit exceeded
- `500` - Server error
