#!/bin/bash
# LeadPilot - Daily Automation Script
# Run this with cron for automated lead generation

# Configuration
CITY="Delhi"
CATEGORY="Gym"
LIMIT=50
LEADPILOT_DIR="/Users/rishetmehra/Desktop/LeadPilot"

# Navigate to project directory
cd "$LEADPILOT_DIR" || exit 1

# Activate virtual environment
source venv/bin/activate

# Run pipeline with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="logs/run_$TIMESTAMP.log"

# Create logs directory if it doesn't exist
mkdir -p logs

echo "🚀 Starting LeadPilot at $(date)" | tee "$LOG_FILE"

# Run the pipeline
python main.py \
  --city "$CITY" \
  --category "$CATEGORY" \
  --limit "$LIMIT" \
  --enrich-instagram \
  --find-emails \
  2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Pipeline completed successfully at $(date)" | tee -a "$LOG_FILE"
  
  # Optional: Send notification (uncomment if you have mail configured)
  # echo "LeadPilot run completed. Check $LOG_FILE for details." | mail -s "LeadPilot Success" your@email.com
else
  echo "❌ Pipeline failed with exit code $EXIT_CODE at $(date)" | tee -a "$LOG_FILE"
  
  # Optional: Send error notification
  # echo "LeadPilot run failed. Check $LOG_FILE for details." | mail -s "LeadPilot Error" your@email.com
fi

# Cleanup old logs (keep last 30 days)
find logs/ -name "run_*.log" -mtime +30 -delete

echo "📁 Log saved to: $LOG_FILE"

exit $EXIT_CODE
