"""
Data Cleaner - Normalizes and cleans raw scraped data

Handles:
- Column standardization
- Duplicate removal
- Phone number formatting
- Missing value handling
"""

import re
import pandas as pd


def clean_dataframe(data: list) -> pd.DataFrame:
    """
    Clean and normalize raw data into a pandas DataFrame.
    
    Args:
        data: List of raw scraped items
        
    Returns:
        Cleaned pandas DataFrame
    """
    if not data:
        return pd.DataFrame()
    
    df = pd.DataFrame(data)
    
    # Standardize column names (lowercase, snake_case)
    df.columns = df.columns.str.lower().str.replace(' ', '_')
    
    # Map Apify column names to our standard names
    column_mapping = {
        'title': 'name',
        'totalscore': 'rating',
        'reviewscount': 'reviews',
        'categoryname': 'category'
    }
    df = df.rename(columns=column_mapping)
    
    # Handle 'emails' list if present (common in Apify results)
    if 'emails' in df.columns:
        # If 'email' column exists, fill missing with first item from 'emails'
        if 'email' in df.columns:
            df['email'] = df.apply(
                lambda row: row['email'] if row['email'] else (
                    row['emails'][0] if isinstance(row['emails'], list) and row['emails'] else ''
                ), axis=1
            )
        else:
            # Create 'email' from 'emails'
            df['email'] = df['emails'].apply(
                lambda x: x[0] if isinstance(x, list) and x else ''
            )

    # Select and order columns we care about
    required_columns = [
        'name', 'category', 'address', 'phone', 'website', 
        'instagram', 'email', 'rating', 'reviews', 'url'
    ]
    
    # Add missing columns with empty values
    for col in required_columns:
        if col not in df.columns:
            df[col] = ''
    
    df = df[required_columns]
    
    # Clean string columns
    string_cols = ['name', 'category', 'address', 'phone', 'website', 'instagram', 'email', 'url']
    for col in string_cols:
        df[col] = df[col].fillna('').astype(str).str.strip()
    
    # Clean numeric columns
    df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0.0)
    df['reviews'] = pd.to_numeric(df['reviews'], errors='coerce').fillna(0).astype(int)
    
    # Standardize phone numbers
    df['phone'] = df['phone'].apply(standardize_phone)
    
    # Lowercase category for matching
    df['category'] = df['category'].str.lower()
    
    # Remove duplicates based on name and phone
    df = df.drop_duplicates(subset=['name', 'phone'], keep='first')
    
    # Rename url to maps_url for database consistency
    df = df.rename(columns={'url': 'maps_url'})
    
    # Reset index
    df = df.reset_index(drop=True)
    
    return df


def standardize_phone(phone: str) -> str:
    """
    Standardize phone number format.
    
    Preserves original country code from source.
    Only removes spaces, dashes, and parentheses.
    """
    if not phone or phone == 'nan':
        return ''
    
    # Remove only spaces, dashes, and parentheses, but keep + and digits
    cleaned = re.sub(r'[\s\-()]', '', str(phone))
    
    # Ensure it starts with + for international format
    if cleaned and not cleaned.startswith('+'):
        # If it's a 10-digit number without country code, assume it's Indian
        if len(cleaned) == 10 and cleaned.isdigit():
            cleaned = '+91' + cleaned
    
    return cleaned


def extract_city(address: str) -> str:
    """
    Extract city name from address string.
    Simple heuristic: last comma-separated part before postal code.
    """
    if not address:
        return ''
    
    # Remove postal code (6 digits for India)
    address = re.sub(r'\b\d{6}\b', '', address)
    
    # Split by comma and get relevant part
    parts = [p.strip() for p in address.split(',') if p.strip()]
    
    if len(parts) >= 2:
        # Usually city is the second-to-last part
        return parts[-2] if len(parts) > 2 else parts[-1]
    
    return parts[0] if parts else ''


def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add derived columns useful for analysis.
    """
    # Has website flag
    df['has_website'] = df['website'].apply(lambda x: bool(x and x.strip()))
    
    # Has Instagram flag  
    df['has_instagram'] = df['instagram'].apply(lambda x: bool(x and x.strip()))
    
    # City extraction
    df['city'] = df['address'].apply(extract_city)
    
    return df
