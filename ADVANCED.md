# LeadPilot - Advanced Usage Guide

## Table of Contents
- [Batch Processing](#batch-processing)
- [Automation](#automation)
- [Advanced Filtering](#advanced-filtering)
- [Custom Scoring](#custom-scoring)
- [Integration Examples](#integration-examples)

## Batch Processing

### Multi-City Campaign

Process multiple cities for the same category:

```bash
# Create batch config
cat > batch_config.json << EOF
{
  "targets": [
    {"city": "Mumbai", "category": "Gym", "limit": 100},
    {"city": "Delhi", "category": "Gym", "limit": 100},
    {"city": "Bangalore", "category": "Gym", "limit": 100},
    {"city": "Pune", "category": "Gym", "limit": 100}
  ],
  "delay_seconds": 120,
  "enrich_instagram": true,
  "find_emails": true
}
EOF

# Run batch
python batch_processor.py batch_config.json
```

### Multi-Category Campaign

Target different business types in one city:

```json
{
  "targets": [
    {"city": "Mumbai", "category": "Gym", "limit": 50},
    {"city": "Mumbai", "category": "Yoga Studio", "limit": 50},
    {"city": "Mumbai", "category": "Fitness Center", "limit": 50},
    {"city": "Mumbai", "category": "CrossFit", "limit": 50}
  ]
}
```

## Automation

### Daily Lead Generation

```bash
# Make script executable
chmod +x run_daily.sh

# Test manually
./run_daily.sh

# Add to crontab (runs daily at 9 AM)
crontab -e
# Add: 0 9 * * * /Users/rishetmehra/Desktop/LeadPilot/run_daily.sh
```

### Weekly Reports

Generate weekly summary every Monday:

```bash
#!/bin/bash
# weekly_report.sh

cd /Users/rishetmehra/Desktop/LeadPilot

# Count leads from last 7 days
echo "📊 Weekly Lead Generation Report"
echo "================================="
echo ""

TOTAL=$(find data/ -name "leads_*.csv" -mtime -7 | xargs wc -l | tail -1 | awk '{print $1}')
echo "Total leads: $TOTAL"

# High quality count
HIGH_QUALITY=$(find data/ -name "leads_*.csv" -mtime -7 -exec awk -F',' 'NR>1 && $9>70 {count++} END {print count}' {} + | awk '{sum+=$1} END {print sum}')
echo "High quality (>70): $HIGH_QUALITY"

# Send email (optional)
# mail -s "Weekly LeadPilot Report" you@email.com < report.txt
```

Add to cron:
```
0 9 * * 1 /Users/rishetmehra/Desktop/LeadPilot/weekly_report.sh
```

## Advanced Filtering

### Post-Processing Filters

Filter leads after generation:

```python
import pandas as pd

# Load leads
df = pd.read_csv('data/leads.csv')

# Filter: Only leads with Instagram AND email
quality_leads = df[
    (df['instagram_followers'] > 0) & 
    (df['email'] != '')
]

# Filter: High score + low reviews (best targets)
prime_targets = df[
    (df['lead_score'] >= 80) & 
    (df['reviews'] < 30)
]

# Filter: Specific rating range
good_but_invisible = df[
    (df['rating'] >= 4.0) & 
    (df['rating'] <= 4.5) & 
    (df['website'] == '')
]

# Save filtered results
prime_targets.to_csv('data/prime_targets.csv', index=False)
```

### Geographic Filtering

```python
# Filter by city
mumbai_leads = df[df['city'].str.contains('Mumbai', case=False, na=False)]

# Filter by area (if address contains)
south_mumbai = df[df['address'].str.contains('Colaba|Churchgate|Fort', case=False, na=False)]
```

## Custom Scoring

### Modify Scoring Rules

Edit `config.json`:

```json
{
  "scoring_rules": {
    "no_website": 50,           // Increase weight
    "low_instagram_followers": 25,
    "low_reviews": 20,
    "low_rating": 5,            // Decrease weight
    "priority_category": 20
  },
  "instagram_follower_threshold": 10000,  // Stricter threshold
  "review_threshold": 100,
  "rating_threshold": 4.5
}
```

### Add Custom Scoring Logic

Edit `scorer.py`:

```python
def score_lead(row: dict, config: dict = None) -> tuple:
    # ... existing code ...
    
    # Add custom rule: Bonus for verified Instagram
    if row.get('instagram_verified'):
        score += 10
        reasons.append("Verified Instagram")
    
    # Penalty for too many reviews (well-established)
    if reviews > 500:
        score -= 20
        reasons.append("Very established (500+ reviews)")
    
    return score, reason
```

## Integration Examples

### Zapier Integration

Export to Google Sheets, then use Zapier to:
1. Send Slack notification for new high-quality leads
2. Create CRM entries automatically
3. Send email campaigns

### CRM Integration (HubSpot)

```python
import requests

def push_to_hubspot(lead: dict, api_key: str):
    """Push lead to HubSpot CRM."""
    url = "https://api.hubapi.com/contacts/v1/contact"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "properties": [
            {"property": "company", "value": lead['name']},
            {"property": "phone", "value": lead['phone']},
            {"property": "email", "value": lead['email']},
            {"property": "city", "value": lead['city']},
            {"property": "lead_score", "value": lead['lead_score']},
            {"property": "lifecyclestage", "value": "lead"}
        ]
    }
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()

# Use in pipeline
for _, lead in df.iterrows():
    if lead['lead_score'] >= 70:
        push_to_hubspot(lead.to_dict(), HUBSPOT_API_KEY)
```

### Airtable Integration

```python
import requests

def push_to_airtable(lead: dict, base_id: str, table_name: str, api_key: str):
    """Push lead to Airtable."""
    url = f"https://api.airtable.com/v0/{base_id}/{table_name}"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "fields": {
            "Name": lead['name'],
            "Category": lead['category'],
            "City": lead['city'],
            "Phone": lead['phone'],
            "Email": lead['email'],
            "Website": lead['website'],
            "Instagram": lead['instagram'],
            "Followers": lead.get('instagram_followers', 0),
            "Rating": lead['rating'],
            "Reviews": lead['reviews'],
            "Lead Score": lead['lead_score'],
            "Reason": lead['reason']
        }
    }
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()
```

### Webhook Integration

Send leads to any webhook endpoint:

```python
import requests

def send_to_webhook(leads: list, webhook_url: str):
    """Send leads to webhook endpoint."""
    for lead in leads:
        if lead['lead_score'] >= 70:
            requests.post(webhook_url, json=lead)
```

## Performance Optimization

### Parallel Processing

```python
from concurrent.futures import ThreadPoolExecutor

def process_lead(lead):
    # Enrich single lead
    return enrich_lead(lead)

# Process 10 leads in parallel
with ThreadPoolExecutor(max_workers=10) as executor:
    enriched_leads = list(executor.map(process_lead, leads))
```

### Caching

```python
import pickle
from functools import lru_cache

# Cache Instagram lookups
@lru_cache(maxsize=1000)
def get_instagram_followers(username):
    return fetch_instagram_followers(username)

# Save/load processed data
def save_cache(data, filename='cache.pkl'):
    with open(filename, 'wb') as f:
        pickle.dump(data, f)

def load_cache(filename='cache.pkl'):
    with open(filename, 'rb') as f:
        return pickle.load(f)
```

## Monitoring & Analytics

### Track Metrics Over Time

```bash
#!/bin/bash
# metrics.sh - Track daily metrics

DATE=$(date +%Y-%m-%d)
LEADS=$(wc -l < data/leads.csv)
HIGH_QUALITY=$(awk -F',' 'NR>1 && $9>70 {count++} END {print count}' data/leads.csv)

echo "$DATE,$LEADS,$HIGH_QUALITY" >> metrics.csv
```

### Visualize with Python

```python
import pandas as pd
import matplotlib.pyplot as plt

# Load metrics
metrics = pd.read_csv('metrics.csv', names=['date', 'total', 'high_quality'])
metrics['date'] = pd.to_datetime(metrics['date'])

# Plot
plt.figure(figsize=(12, 6))
plt.plot(metrics['date'], metrics['total'], label='Total Leads')
plt.plot(metrics['date'], metrics['high_quality'], label='High Quality')
plt.xlabel('Date')
plt.ylabel('Lead Count')
plt.title('Lead Generation Over Time')
plt.legend()
plt.savefig('metrics.png')
```

## Troubleshooting

### Debug Mode

```bash
# Run with verbose logging
python main.py --dry-run --debug

# Check logs
tail -f logs/leadpilot.log
```

### Rate Limit Handling

```python
import time
from functools import wraps

def retry_on_rate_limit(max_retries=3, delay=60):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except RateLimitError:
                    if attempt < max_retries - 1:
                        print(f"Rate limited. Waiting {delay}s...")
                        time.sleep(delay)
                    else:
                        raise
        return wrapper
    return decorator
```
