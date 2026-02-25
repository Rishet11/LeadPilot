#!/usr/bin/env python3
"""
LeadPilot - AI Lead Generation Agent

A local-first Python agent that discovers small businesses
with poor online presence and exports qualified leads.

Usage:
    python main.py                          # Use config.json defaults
    python main.py --city Mumbai --category Bakery --limit 50
    python main.py --dry-run                # Test with demo data
    python main.py --check-websites         # Verify website accessibility
    python main.py --ai-summary             # Add Gemini AI summaries
    python main.py --agent                  # Enable agentic AI mode
    python main.py --enrich-instagram       # Fetch Instagram follower counts
    python main.py --find-emails            # Find contact emails
"""

import sys
import json
import argparse
from datetime import datetime

from dotenv import load_dotenv
from logger import setup_logger

# Load environment variables
load_dotenv()

logger = setup_logger()


def load_config(config_path: str = "config.json") -> dict:
    """Load configuration from JSON file."""
    default_config = {
        "city": "Delhi",
        "category": "Gym",
        "limit": 100,
        "export": {"csv": True, "google_sheets": False},
        "ai_summary": {"enabled": False}
    }

    try:
        with open(config_path, "r") as f:
            config = json.load(f)
            # Merge with defaults
            for key, value in default_config.items():
                if key not in config:
                    config[key] = value
            return config
    except FileNotFoundError:
        logger.warning("Config file not found, using defaults")
        return default_config


def run_pipeline(city: str, category: str, limit: int,
                 dry_run: bool = False, check_websites: bool = False,
                 agent_mode: bool = True, find_emails: bool = False,
                 progress_callback = None):
    """
    Run the complete lead generation pipeline.

    Args:
        city: Target city
        category: Business category
        limit: Maximum results
        dry_run: Use demo data instead of API
        check_websites: Verify website accessibility
        agent_mode: Use agentic AI for autonomous lead evaluation
        find_emails: Use free email scraper on websites
    """
    from apify_client import (
        run_google_maps_scraper, poll_run_status,
        fetch_dataset, save_raw_data, get_demo_data
    )
    from cleaner import clean_dataframe, add_derived_columns
    from scorer import score_dataframe, load_config as load_scoring_config
    from exporter import export_csv, print_summary

    logger.info("=" * 50)
    logger.info("LEADPILOT - Lead Generation Agent")
    logger.info("=" * 50)
    logger.info("City: %s", city)
    logger.info("Category: %s", category)
    logger.info("Limit: %d", limit)
    logger.info("Mode: %s", "Demo" if dry_run else "Live API")
    if find_emails:
        logger.info("Email Scraper: ENABLED")
    logger.info("=" * 50)

    # Step 1: Fetch data
    if dry_run:
        logger.info("Using demo data (dry run mode)")
        raw_data = get_demo_data()
    else:
        logger.info("Fetching data from Apify...")
        try:
            result = run_google_maps_scraper(city, category, limit)
            logger.info("Run ID: %s", result['run_id'])
            logger.info("Dataset ID: %s", result['dataset_id'])

            logger.info("Waiting for scraper to complete...")
            status = poll_run_status(result['run_id'], dataset_id=result.get('dataset_id'), progress_callback=progress_callback)

            if status != "SUCCEEDED":
                logger.error("Scraping failed with status: %s", status)
                sys.exit(1)

            logger.info("Fetching results...")
            raw_data = fetch_dataset(result['dataset_id'])

            # Save raw data
            save_raw_data(raw_data)

        except Exception as e:
            logger.error("Error fetching data: %s", e)
            logger.info("Tip: Run with --dry-run to test without API")
            sys.exit(1)

    logger.info("Retrieved %d results", len(raw_data))

    # Step 2: Clean data
    logger.info("Cleaning and normalizing data...")
    df = clean_dataframe(raw_data)
    df = add_derived_columns(df)
    logger.info("Cleaned data: %d unique leads", len(df))

    # Step 3: Find Emails (Free Scraper)
    if find_emails:
        logger.info("Running free email scraper on websites...")
        # Filter leads that have website but no email
        needs_email = df[
            (df['has_website']) & 
            (df['email'] == '') & 
            (df['website'] != '')
        ]
        
        if not needs_email.empty:
            logger.info("Scraping %d websites for emails...", len(needs_email))
            from email_scraper import scrape_emails_concurrently
            
            # Run concurrent scraper
            urls = needs_email['website'].tolist()
            found_emails = scrape_emails_concurrently(urls, max_workers=10)
            
            # Update dataframe
            match_count = 0
            # Convert dictionary to match specific rows
            for url, email in found_emails.items():
                if email:
                    mask = df['website'] == url
                    df.loc[mask, 'email'] = email
                    match_count += 1
            
            logger.info("Found %d new emails!", match_count)
        else:
            logger.info("No leads require email scraping (all have emails or no website).")

    # Step 4: Score leads
    logger.info("Scoring leads...")
    scoring_config = load_scoring_config()
    df = score_dataframe(df, scoring_config, check_websites=check_websites)
    logger.info("Scored %d leads", len(df))

    # Step 5: Agentic AI mode (autonomous evaluation)
    if agent_mode:
        logger.info("Running Agentic AI pipeline...")
        try:
            from lead_agent import run_agent_pipeline
            df = run_agent_pipeline(df, max_leads=10)
        except Exception as e:
            logger.error("Agent mode failed: %s", e, exc_info=True)

    # Step 6: Export
    logger.info("Exporting leads...")

    # Always export CSV
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = f"data/leads_{timestamp}.csv"
    export_csv(df, csv_path)

    # Also save as latest
    export_csv(df, "data/leads.csv")

    # Print summary
    print_summary(df)

    logger.info("Pipeline complete!")
    logger.info("Output: %s", csv_path)

    return df


def main():
    """Main entry point with CLI argument parsing."""
    parser = argparse.ArgumentParser(
        description="LeadPilot - AI Lead Generation Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                                  # Use config.json
  python main.py --city Mumbai --category Bakery  # Override city/category
  python main.py --dry-run                        # Test with demo data
  python main.py --agent                          # Enable agentic AI mode
  python main.py --find-emails                    # Enable free email scraping
        """
    )

    parser.add_argument("--city", type=str, help="Target city")
    parser.add_argument("--category", type=str, help="Business category")
    parser.add_argument("--limit", type=int, help="Maximum results")
    parser.add_argument("--dry-run", action="store_true",
                        help="Use demo data instead of API")
    parser.add_argument("--check-websites", action="store_true",
                        help="Verify website accessibility (slower)")
    parser.add_argument("--agent", action="store_true", default=True,
                        help="Enable agentic AI mode (autonomous lead evaluation)")
    parser.add_argument("--find-emails", action="store_true",
                        help="Enable free email scraper (crawls websites)")
    parser.add_argument("--config", type=str, default="config.json",
                        help="Path to config file")

    args = parser.parse_args()

    # Load config
    config = load_config(args.config)

    # Override with CLI args
    city = args.city or config.get("city", "Delhi")
    category = args.category or config.get("category", "Gym")
    limit = args.limit or config.get("limit", 100)

    # Run pipeline
    run_pipeline(
        city=city,
        category=category,
        limit=limit,
        dry_run=args.dry_run,
        check_websites=args.check_websites,
        agent_mode=args.agent,
        find_emails=args.find_emails
    )


if __name__ == "__main__":
    main()
