"""
Exporter - Handles CSV and Google Sheets export

Supports:
- CSV export (default)
- Google Sheets upload (optional, requires credentials)
"""

import os
import logging
import pandas as pd

logger = logging.getLogger("leadpilot")


def export_csv(df: pd.DataFrame, path: str = "data/leads.csv", source: str = "google_maps") -> str:
    """
    Export DataFrame to CSV file.

    Args:
        df: DataFrame to export
        path: Output file path
        source: Lead source (google_maps or instagram)

    Returns:
        Path to the saved file
    """
    # Ensure directory exists
    dirname = os.path.dirname(path)
    if dirname:
        os.makedirs(dirname, exist_ok=True)

    # Add source column
    df = df.copy()
    df['source'] = source

    # Add country detection from city
    if 'city' in df.columns:
        usa_indicators = ['USA', 'FL', 'TX', 'AZ', 'CA', 'NY', 'Tampa', 'Orlando', 'Austin', 'Phoenix']
        df['country'] = df['city'].apply(
            lambda x: 'USA' if any(ind in str(x) for ind in usa_indicators) else 'India'
        )

    # Define column order for output (Agency specific)
    output_cols = [
        'name', 'phone', 'whatsapp_link', 'city', 'country', 'email', 'website',
        'lead_score', 'reason',
        'category', 'rating', 'reviews', 'reviews_link',
        'outreach_friendly', 'outreach_value', 'outreach_direct', 'ai_reasoning',
        'opening_hours', 'images_count', 'is_unclaimed',
        'instagram', 'source', 'scraped_at'
    ]

    # Filter for columns that actually exist in the dataframe
    final_cols = [col for col in output_cols if col in df.columns]

    df[final_cols].to_csv(path, index=False)
    logger.info("Exported %d leads to %s", len(df), path)

    return path


def print_summary(df: pd.DataFrame):
    """Print a summary of the leads data."""
    total = len(df)

    if total == 0:
        logger.info("No leads found.")
        return

    logger.info("=" * 50)
    logger.info("LEAD GENERATION SUMMARY")
    logger.info("=" * 50)

    logger.info("Total leads: %d", total)

    if 'lead_score' in df.columns:
        avg_score = df['lead_score'].mean()
        high_quality = len(df[df['lead_score'] >= 70])
        medium_quality = len(df[(df['lead_score'] >= 40) & (df['lead_score'] < 70)])
        low_quality = len(df[df['lead_score'] < 40])

        logger.info("Average score: %.1f", avg_score)
        logger.info("High quality (70+): %d", high_quality)
        logger.info("Medium quality (40-69): %d", medium_quality)
        logger.info("Low quality (<40): %d", low_quality)

    if 'has_website' in df.columns:
        no_website = len(df[~df['has_website']])
        logger.info("Without website: %d (%.0f%%)", no_website, no_website/total*100)

    if 'category' in df.columns:
        logger.info("Categories: %d", df['category'].nunique())
        logger.info("\n%s", df['category'].value_counts().head(5).to_string())

    logger.info("=" * 50)
    logger.info("TOP 5 LEADS")
    logger.info("=" * 50)

    top_cols = ['name', 'lead_score', 'reason'] if 'lead_score' in df.columns else ['name']
    top_cols = [c for c in top_cols if c in df.columns]
    logger.info("\n%s", df.head(5)[top_cols].to_string(index=False))
