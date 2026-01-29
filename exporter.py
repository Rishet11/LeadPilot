"""
Exporter - Handles CSV and Google Sheets export

Supports:
- CSV export (default)
- Google Sheets upload (optional, requires credentials)
"""

import os
import pandas as pd


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
        'name', 'phone', 'city', 'country', 'category', 'rating', 
        'reviews', 'website', 'lead_score', 'ai_outreach', 'source'
    ]
    
    # Filter for columns that actually exist in the dataframe
    final_cols = [col for col in output_cols if col in df.columns]
    
    df[final_cols].to_csv(path, index=False)
    print(f"✅ Exported {len(df)} leads to {path}")
    
    return path


def print_summary(df: pd.DataFrame):
    """Print a summary of the leads data."""
    total = len(df)
    
    if total == 0:
        print("📊 No leads found.")
        return
    
    print("\n" + "="*50)
    print("📊 LEAD GENERATION SUMMARY")
    print("="*50)
    
    print(f"\n📌 Total leads: {total}")
    
    if 'lead_score' in df.columns:
        avg_score = df['lead_score'].mean()
        high_quality = len(df[df['lead_score'] >= 70])
        medium_quality = len(df[(df['lead_score'] >= 40) & (df['lead_score'] < 70)])
        low_quality = len(df[df['lead_score'] < 40])
        
        print(f"📈 Average score: {avg_score:.1f}")
        print(f"🔥 High quality (70+): {high_quality}")
        print(f"📊 Medium quality (40-69): {medium_quality}")
        print(f"📉 Low quality (<40): {low_quality}")
    
    if 'has_website' in df.columns:
        no_website = len(df[~df['has_website']])
        print(f"🌐 Without website: {no_website} ({no_website/total*100:.0f}%)")
    
    if 'category' in df.columns:
        print(f"\n📂 Categories: {df['category'].nunique()}")
        print(df['category'].value_counts().head(5).to_string())
    
    print("\n" + "="*50)
    print("🏆 TOP 5 LEADS")
    print("="*50)
    
    top_cols = ['name', 'lead_score', 'reason'] if 'lead_score' in df.columns else ['name']
    top_cols = [c for c in top_cols if c in df.columns]
    print(df.head(5)[top_cols].to_string(index=False))
    print()
