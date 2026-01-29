# LeadPilot - Example Outputs

## Sample Lead Output

Here's what a typical lead looks like after processing:

```csv
Name,Category,City,Phone,Website,Instagram,Rating,Reviews,Email,Instagram Followers,Lead Score,Reason
FitZone Gym,gym,Delhi,+919876543210,,,3.8,25,,0,10 0,No website + No Instagram + Low reviews + Low rating
```

## With All Features Enabled

```bash
python main.py --dry-run --enrich-instagram --find-emails --agent
```

### Output includes:

| Column | Description | Example |
|--------|-------------|---------|
| **name** | Business name | FitZone Gym |
| **category** | Business type | gym |
| **city** | Location | Delhi |
| **phone** | Contact number | +919876543210 |
| **email** | Contact email | info@fitzonegym.com |
| **website** | Website URL | - |
| **instagram** | Instagram profile | @fitzonegym |
| **instagram_followers** | Follower count | 1,250 |
| **rating** | Google rating | 3.8/5 ⭐ |
| **reviews** | Review count | 25 |
| **lead_score** | Quality score (0-100) | 100 |
| **reason** | Why it's a good lead | No website + Low followers |
| **ai_priority** | AI-assigned priority (1-5) | 5 |
| **ai_outreach** | Personalized hook | "Help you get more members with Instagram ads" |
| **ai_services** | Recommended services | ["Instagram Marketing", "Website Design"] |

## Real-World Example

Processing 50 bakeries in Mumbai:

```bash
python main.py --city "Mumbai" --category "Bakery" --limit 50 \
  --enrich-instagram --find-emails --agent
```

**Results:**
- ✅ 50 businesses scraped
- 📸 32 Instagram profiles enriched
- 📧 18 emails found
- 🏆 12 high-quality leads (score >70)
- 🤖 Top 10 analyzed by AI

**Export:**
- `data/leads_TIMESTAMP.csv` - Full dataset
- `data/leads.csv` - Latest results

## Agentic AI Output Example

The AI agent provides:

**For each lead:**
```json
{
  "priority": 4,
  "confidence": 0.85,
  "reasoning": "Small bakery with decent foot traffic but zero online presence. Prime candidate for social media marketing.",
  "pain_points": ["No website", "Low Instagram engagement", "No online ordering"],
  "recommended_services": ["Instagram Business Setup", "Google My Business optimization", "Online ordering system"],
  "outreach_angle": "I noticed you have great reviews but missing 70% of potential customers who search online",
  "next_action": "Cold call Monday morning, reference their 4.3★ rating as conversation starter"
}
```

**Weekly Action Plan:**
```
This Week's Outreach Priority:

1. Sweet Treats Bakery (Priority 5/5)
   - Method: Instagram DM + Email
   - Hook: "Your cakes look amazing but you're missing 1000+ local searches/month"
   - Follow-up: Schedule call for Wed 2PM

2. Artisan Breads (Priority 4/5)
   - Method: Phone call
   - Hook: "Competitors with websites getting 3x more orders"
   - Follow-up: Send proposal Friday

3. Cupcake Corner (Priority 4/5)
   - Method: Email
   - Hook: "Your 4.7★ rating deserves better visibility"
   - Follow-up: Check open rate, call if no response in 48h
```

**Sample Cold Email:**
```
Subject: Quick question about Sweet Treats Bakery

Hi there,

I was searching for bakeries in Mumbai and came across your spot - 
those custom cakes on your Instagram look incredible!

I noticed you don't have a website yet. Based on search data, 
≈800 people/month are looking for "custom cakes Mumbai" and 
going to your competitors with better online presence.

Would you be open to a quick 10-min call this week to discuss 
how we've helped similar bakeries capture those searches?

No pressure - just wanted to reach out!

Best,
Alex from LeadPilot
```
