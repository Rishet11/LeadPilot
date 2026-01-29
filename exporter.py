"""
Exporter - Handles CSV and Google Sheets export

Supports:
- CSV export (default)
- Google Sheets upload (optional, requires credentials)
"""

import os
import pandas as pd


def export_csv(df: pd.DataFrame, path: str = "data/leads.csv") -> str:
    """
    Export DataFrame to CSV file.
    
    Args:
        df: DataFrame to export
        path: Output file path
        
    Returns:
        Path to the saved file
    """
    # Ensure directory exists
    os.makedirs(os.path.dirname(path), exist_ok=True)
    
    # Define column order for output
    column_order = [
        'name', 'category', 'city', 'phone', 'website', 
        'instagram', 'rating', 'reviews', 'lead_score', 'reason'
    ]
    
    # Only include columns that exist
    output_cols = [col for col in column_order if col in df.columns]
    
    # Add any remaining columns
    for col in df.columns:
        if col not in output_cols:
            output_cols.append(col)
    
    df[output_cols].to_csv(path, index=False)
    print(f"✅ Exported {len(df)} leads to {path}")
    
    return path


def export_google_sheets(df: pd.DataFrame, sheet_name: str = "LeadPilot Leads", 
                         credentials_path: str = None) -> str:
    """
    Export DataFrame to Google Sheets.
    
    Args:
        df: DataFrame to export
        sheet_name: Name of the sheet/spreadsheet
        credentials_path: Path to service account credentials JSON
        
    Returns:
        URL of the created/updated sheet
    """
    try:
        import gspread
        from google.oauth2.service_account import Credentials
    except ImportError:
        raise ImportError("Please install gspread and google-auth: pip install gspread google-auth")
    
    # Get credentials path from env if not provided
    if credentials_path is None:
        credentials_path = os.getenv("GOOGLE_SHEETS_CREDENTIALS_PATH", "credentials.json")
    
    if not os.path.exists(credentials_path):
        raise FileNotFoundError(
            f"Google Sheets credentials not found at {credentials_path}. "
            "Please set GOOGLE_SHEETS_CREDENTIALS_PATH or provide credentials.json"
        )
    
    # Define scopes
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    
    # Authenticate
    creds = Credentials.from_service_account_file(credentials_path, scopes=scopes)
    client = gspread.authorize(creds)
    
    try:
        # Try to open existing spreadsheet
        spreadsheet = client.open(sheet_name)
        worksheet = spreadsheet.sheet1
        print(f"📊 Updating existing sheet: {sheet_name}")
    except gspread.SpreadsheetNotFound:
        # Create new spreadsheet
        spreadsheet = client.create(sheet_name)
        worksheet = spreadsheet.sheet1
        print(f"📊 Created new sheet: {sheet_name}")
    
    # Clear existing content
    worksheet.clear()
    
    # Convert DataFrame to list of lists
    headers = df.columns.tolist()
    values = [headers] + df.values.tolist()
    
    # Update sheet
    worksheet.update(values, 'A1')
    
    # Format header row
    worksheet.format('1:1', {'textFormat': {'bold': True}})
    
    url = spreadsheet.url
    print(f"✅ Exported {len(df)} leads to Google Sheets: {url}")
    
    return url


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
