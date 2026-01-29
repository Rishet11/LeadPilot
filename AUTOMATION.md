# LeadPilot Automation Guide

## Cron Job Setup

Run LeadPilot automatically every day at 9 AM:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 9 AM)
0 9 * * * /Users/rishetmehra/Desktop/LeadPilot/run_daily.sh

# Or run every Monday at 9 AM
0 9 * * 1 /Users/rishetmehra/Desktop/LeadPilot/run_daily.sh
```

### Cron Schedule Examples

```
# Every day at 9 AM
0 9 * * *

# Every Monday at 9 AM
0 9 * * 1

# Every weekday at 9 AM
0 9 * * 1-5

# Every 6 hours
0 */6 * * *

# First day of month at 9 AM
0 9 1 * *
```

## Batch Processing

Process multiple cities/categories in one run:

```bash
# Create your batch config
cp batch_config.example.json batch_config.json

# Edit with your targets
nano batch_config.json

# Run batch
python batch_processor.py batch_config.json
```

### Example Batch Config

```json
{
  "targets": [
    {"city": "Mumbai", "category": "Gym", "limit": 50},
    {"city": "Delhi", "category": "Bakery", "limit": 50},
    {"city": "Bangalore", "category": "Cafe", "limit": 50}
  ],
  "delay_seconds": 60,
  "enrich_instagram": true,
  "find_emails": true,
  "agent_mode": false
}
```

## Logs

All automated runs are logged to `logs/` directory:

```bash
# View latest log
tail -f logs/run_*.log | tail -1

# View all logs
ls -lh logs/

# Clean old logs (>30 days)
find logs/ -name "run_*.log" -mtime +30 -delete
```

## GitHub Actions (Optional)

Run LeadPilot on GitHub's servers for free:

Create `.github/workflows/daily-leads.yml`:

```yaml
name: Daily Lead Generation

on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM daily
  workflow_dispatch:  # Manual trigger

jobs:
  generate-leads:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      
      - name: Run LeadPilot
        env:
          APIFY_API_TOKEN: ${{ secrets.APIFY_API_TOKEN }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: |
          python main.py --city "Mumbai" --category "Gym" --limit 50
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: leads
          path: data/leads.csv
```

Add secrets in GitHub: Settings → Secrets → Actions

## Email Notifications

Get notified when runs complete:

### Using `mail` command (macOS/Linux)

```bash
# Install mail if needed
brew install mailutils  # macOS

# Add to run_daily.sh
echo "Results attached" | mail -s "LeadPilot Results" -A data/leads.csv you@email.com
```

### Using Python (Gmail)

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

def send_email(subject, body, attachment_path):
    sender = "your@gmail.com"
    password = "your_app_password"  # Use app password, not regular password
    recipient = "recipient@email.com"
    
    msg = MIMEMultipart()
    msg['From'] = sender
    msg['To'] = recipient
    msg['Subject'] = subject
    
    msg.attach(MIMEText(body, 'plain'))
    
    # Attach CSV
    with open(attachment_path, 'rb') as f:
        part = MIMEBase('application', 'octet-stream')
        part.set_payload(f.read())
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f'attachment; filename=leads.csv')
        msg.attach(part)
    
    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login(sender, password)
        server.send_message(msg)
```

## Monitoring

Track your lead generation metrics:

```bash
# Count total leads generated
wc -l data/leads_*.csv

# High-quality leads (score > 70)
awk -F',' '$9 > 70 {count++} END {print count}' data/leads.csv

# Average score
awk -F',' 'NR>1 {sum+=$9; count++} END {print sum/count}' data/leads.csv
```

## Troubleshooting

**Cron job not running?**
```bash
# Check cron logs
tail -f /var/log/syslog | grep CRON  # Linux
log show --predicate 'process == "cron"' --last 1h  # macOS

# Test script manually
./run_daily.sh
```

**Rate limits?**
- Increase `delay_seconds` in batch config
- Reduce `limit` per run
- Spread runs throughout the day

**Out of API credits?**
- Check Apify dashboard
- Upgrade plan or reduce frequency
