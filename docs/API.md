# LeadPilot API Documentation

## Overview
REST API for the LeadPilot lead generation system. Provides endpoints for managing leads, triggering scrapes, and viewing job status.

**Base URL:** `http://localhost:8000` (development)

---

## Authentication

All endpoints require an API key in the header:

```http
X-API-Key: your_api_key_here
```

**Development mode:** Set `REQUIRE_AUTH=false` in `.env` to disable auth locally.

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
curl -H "X-API-Key: your_key" \
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

- **Read operations:** 60 requests/minute
- **Write operations:** 20 requests/minute

Rate limits are per IP address.

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
- `401` - Missing API key
- `403` - Invalid API key
- `404` - Resource not found
- `429` - Rate limit exceeded
- `500` - Server error
