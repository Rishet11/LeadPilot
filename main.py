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

import os
import sys
import json
import argparse
from datetime import datetime

from dotenv import load_dotenv

# Load environment variables
load_dotenv()


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
        print(f"⚠️  Config file not found, using defaults")
        return default_config


def run_pipeline(city: str, category: str, limit: int, 
                 dry_run: bool = False, check_websites: bool = False,
                 agent_mode: bool = True):
    """
    Run the complete lead generation pipeline.
    
    Args:
        city: Target city
        category: Business category
        limit: Maximum results
        dry_run: Use demo data instead of API
        check_websites: Verify website accessibility
        agent_mode: Use agentic AI for autonomous lead evaluation
    """
    from apify_client import (
        run_google_maps_scraper, poll_run_status, 
        fetch_dataset, save_raw_data, get_demo_data
    )
    from cleaner import clean_dataframe, add_derived_columns
    from scorer import score_dataframe, load_config as load_scoring_config
    from exporter import export_csv, print_summary
    
    print("\n" + "="*50)
    print("🚀 LEADPILOT - Lead Generation Agent")
    print("="*50)
    print(f"📍 City: {city}")
    print(f"📂 Category: {category}")
    print(f"📊 Limit: {limit}")
    print(f"🔧 Mode: {'Demo' if dry_run else 'Live API'}")
    print("="*50 + "\n")
    
    # Step 1: Fetch data
    if dry_run:
        print("📥 Using demo data (dry run mode)...")
        raw_data = get_demo_data()
    else:
        print("📥 Fetching data from Apify...")
        try:
            result = run_google_maps_scraper(city, category, limit)
            print(f"  Run ID: {result['run_id']}")
            print(f"  Dataset ID: {result['dataset_id']}")
            
            print("⏳ Waiting for scraper to complete...")
            status = poll_run_status(result['run_id'])
            
            if status != "SUCCEEDED":
                print(f"❌ Scraping failed with status: {status}")
                sys.exit(1)
            
            print("📦 Fetching results...")
            raw_data = fetch_dataset(result['dataset_id'])
            
            # Save raw data
            save_raw_data(raw_data)
            
        except Exception as e:
            print(f"❌ Error fetching data: {e}")
            print("💡 Tip: Run with --dry-run to test without API")
            sys.exit(1)
    
    print(f"✅ Retrieved {len(raw_data)} results")
    
    # Step 2: Clean data
    print("\n🧹 Cleaning and normalizing data...")
    df = clean_dataframe(raw_data)
    df = add_derived_columns(df)
    print(f"✅ Cleaned data: {len(df)} unique leads")
    
    # Step 4: Score leads
    print("\n📊 Scoring leads...")
    scoring_config = load_scoring_config()
    df = score_dataframe(df, scoring_config, check_websites=check_websites)
    print(f"✅ Scored {len(df)} leads")
    
    # Step 5: Agentic AI mode (autonomous evaluation)
    if agent_mode:
        print("\n🤖 Running Agentic AI pipeline...")
        try:
            from lead_agent import run_agent_pipeline
            df = run_agent_pipeline(df, max_leads=10)
        except Exception as e:
            print(f"⚠️  Agent mode failed: {e}")
            import traceback
            traceback.print_exc()
    
    # Step 6: Export
    print("\n💾 Exporting leads...")
    
    # Always export CSV
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = f"data/leads_{timestamp}.csv"
    export_csv(df, csv_path)
    
    # Also save as latest
    export_csv(df, "data/leads.csv")
    
    # Print summary
    print_summary(df)
    
    print("\n✅ Pipeline complete!")
    print(f"📁 Output: {csv_path}")
    
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
        agent_mode=args.agent
    )


if __name__ == "__main__":
    main()
