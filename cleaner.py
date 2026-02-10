"""
Data Cleaner - Normalizes and cleans raw scraped data

Handles:
- Column standardization
- Closed business filtering
- Category normalization
- Phone number formatting
- Email/URL normalization
- Duplicate removal
- WhatsApp deep link generation
"""

import re
import logging
import pandas as pd

logger = logging.getLogger("leadpilot")


# Standard category mapping — normalizes common variants
CATEGORY_MAP = {
    # Dental
    "dental clinic": "dentist", "dental": "dentist", "dental office": "dentist",
    "dental surgery": "dentist", "cosmetic dentist": "dentist",
    "pediatric dentist": "dentist", "orthodontist": "dentist",
    "oral surgeon": "dentist", "endodontist": "dentist",
    "periodontist": "dentist", "prosthodontist": "dentist",
    # Fitness
    "fitness center": "gym", "fitness studio": "gym", "fitness club": "gym",
    "health club": "gym", "yoga studio": "gym", "pilates studio": "gym",
    "crossfit box": "gym", "personal trainer": "gym",
    # Beauty
    "beauty salon": "salon", "hair salon": "salon", "barbershop": "salon",
    "barber shop": "salon", "hair stylist": "salon",
    "beauty parlor": "salon", "beauty parlour": "salon",
    "nail salon": "salon", "day spa": "spa",
    # Medical
    "medical clinic": "clinic", "health clinic": "clinic",
    "doctor": "clinic", "general practitioner": "clinic",
    "skin clinic": "dermatologist", "skin care clinic": "dermatologist",
    "physiotherapy clinic": "physiotherapy", "physical therapy": "physiotherapy",
    "physical therapist": "physiotherapy", "physio": "physiotherapy",
    "chiropractic": "chiropractor", "chiropractic clinic": "chiropractor",
    "veterinary clinic": "veterinary", "vet": "veterinary",
    "veterinarian": "veterinary", "animal hospital": "veterinary",
    # Food
    "coffee shop": "cafe", "coffeehouse": "cafe", "tea house": "cafe",
    "bakery": "bakery", "pastry shop": "bakery",
    "catering service": "catering", "caterer": "catering",
    # Home services
    "plumbing service": "plumber", "plumbing": "plumber",
    "plumbing supply store": "plumber",
    "electrical contractor": "electrician", "electrical service": "electrician",
    "hvac contractor": "hvac", "hvac repair": "hvac",
    "hvac service": "hvac", "air conditioning contractor": "hvac",
    "heating contractor": "hvac",
    "pest control service": "pest control",
    "roofing contractor": "roofing", "roofer": "roofing",
    "landscaping": "landscaper", "lawn care service": "landscaper",
    "cleaning service": "cleaning", "house cleaning": "cleaning",
    "carpet cleaning service": "cleaning",
    "interior designer": "interior design", "interior decorator": "interior design",
    # Professional
    "law firm": "lawyer", "attorney": "lawyer", "legal services": "lawyer",
    "real estate agency": "real estate", "real estate agent": "real estate",
    "realtor": "real estate",
    "accounting firm": "accountant", "tax consultant": "accountant",
    "cpa": "accountant",
    # Auto
    "auto repair shop": "auto repair", "car repair": "auto repair",
    "mechanic": "auto repair", "auto mechanic": "auto repair",
    "car dealer": "auto dealer", "car dealership": "auto dealer",
    # Education
    "coaching center": "coaching", "coaching institute": "coaching",
    "tutoring service": "tutor", "tutor": "tutor",
    "driving school": "driving school",
    # Events
    "wedding planner": "wedding", "wedding venue": "wedding",
    "event planner": "event planning", "event venue": "event planning",
    "photographer": "photography", "photo studio": "photography",
    "wedding photographer": "photography",
}


def clean_dataframe(data: list) -> pd.DataFrame:
    """
    Clean and normalize raw data into a pandas DataFrame.

    Extracts additional fields from Apify data, filters closed businesses,
    normalizes categories, and cleans all field formats.

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

    # --- Filter closed businesses BEFORE any processing ---
    closed_count = 0
    if 'permanentlyclosed' in df.columns:
        mask = df['permanentlyclosed'].fillna(False).astype(bool)
        closed_count += mask.sum()
        df = df[~mask]
    if 'temporarilyclosed' in df.columns:
        mask = df['temporarilyclosed'].fillna(False).astype(bool)
        closed_count += mask.sum()
        df = df[~mask]
    if closed_count > 0:
        logger.info("Filtered out %d closed businesses", closed_count)

    if df.empty:
        return pd.DataFrame()

    # Map Apify column names to our standard names
    # NOTE: Apify returns 'reviews' (array of objects) & 'reviewsCount' (int).
    # We rename 'reviews' -> 'top_reviews' to preserve the text for AI,
    # and map 'reviewsCount' -> 'reviews' for our internal count.
    if 'reviews' in df.columns:
        df.rename(columns={'reviews': 'top_reviews'}, inplace=True)
    
    column_mapping = {
        'title': 'name',
        'totalscore': 'rating',
        'reviewscount': 'reviews',
        'categoryname': 'category',
        'imagescount': 'images_count',
        'countrycode': 'country_code',
        'scrapedat': 'scraped_at',
        'claimthisbusiness': 'is_unclaimed',
    }
    df = df.rename(columns=column_mapping)

    # Handle 'emails' list if present (common in Apify results)
    if 'emails' in df.columns:
        if 'email' in df.columns:
            df['email'] = df.apply(
                lambda row: row['email'] if row['email'] else (
                    row['emails'][0] if isinstance(row['emails'], list) and row['emails'] else ''
                ), axis=1
            )
        else:
            df['email'] = df['emails'].apply(
                lambda x: x[0] if isinstance(x, list) and x else ''
            )

    # Extract opening hours summary
    if 'openinghours' in df.columns:
        df['opening_hours'] = df['openinghours'].apply(_format_opening_hours)
    else:
        df['opening_hours'] = ''

    # Extract price level
    if 'price' not in df.columns:
        df['price'] = ''

    # Select and order columns we care about
    required_columns = [
        'name', 'category', 'address', 'phone', 'website',
        'instagram', 'email', 'rating', 'reviews', 'url',
        'images_count', 'country_code', 'scraped_at',
        'is_unclaimed', 'opening_hours', 'price'
    ]

    # Add missing columns with empty/default values
    for col in required_columns:
        if col not in df.columns:
            df[col] = '' if col not in ('images_count', 'is_unclaimed') else 0

    df = df[required_columns]

    # --- Clean string columns ---
    string_cols = ['name', 'category', 'address', 'phone', 'website',
                   'instagram', 'email', 'url', 'country_code',
                   'opening_hours', 'price']
    for col in string_cols:
        df[col] = df[col].fillna('').astype(str).str.strip()

    # --- Clean numeric columns ---
    df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0.0)
    df['reviews'] = pd.to_numeric(df['reviews'], errors='coerce').fillna(0).astype(int)
    df['images_count'] = pd.to_numeric(df['images_count'], errors='coerce').fillna(0).astype(int)

    # --- Boolean columns ---
    df['is_unclaimed'] = df['is_unclaimed'].apply(
        lambda x: True if x is True or str(x).lower() == 'true' else False
    )

    # --- Clean business names ---
    df['name'] = df['name'].apply(_clean_business_name)

    # --- Standardize phone numbers ---
    df['phone'] = df['phone'].apply(standardize_phone)

    # --- Normalize emails ---
    df['email'] = df['email'].apply(_normalize_email)

    # --- Normalize URLs ---
    df['website'] = df['website'].apply(_normalize_url)

    # --- Normalize categories ---
    df['category'] = df['category'].str.lower()
    df['category'] = df['category'].apply(_normalize_category)

    # Remove duplicates based on name and phone
    df = df.drop_duplicates(subset=['name', 'phone'], keep='first')

    # Rename url to maps_url for database consistency
    df = df.rename(columns={'url': 'maps_url'})

    # Reset index
    df = df.reset_index(drop=True)

    logger.info("Cleaned data: %d leads (%d closed filtered)", len(df), closed_count)

    return df


def _clean_business_name(name: str) -> str:
    """Remove 'Permanently Closed' suffixes and clean up business names."""
    if not name:
        return ''
    # Remove common closure indicators
    patterns = [
        r'\s*[-–—]\s*permanently\s+closed\s*$',
        r'\s*[-–—]\s*temporarily\s+closed\s*$',
        r'\s*\(permanently\s+closed\)\s*$',
        r'\s*\(temporarily\s+closed\)\s*$',
        r'\s*\[permanently\s+closed\]\s*$',
    ]
    for pattern in patterns:
        name = re.sub(pattern, '', name, flags=re.IGNORECASE)
    # Remove excess whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def _normalize_category(category: str) -> str:
    """Map category variants to standard names."""
    if not category:
        return ''
    category = category.strip().lower()
    return CATEGORY_MAP.get(category, category)


def _normalize_email(email: str) -> str:
    """Normalize email: lowercase, strip whitespace, validate format."""
    if not email or email == 'nan':
        return ''
    email = email.strip().lower()
    # Basic format validation
    if re.match(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$', email):
        return email
    return ''


def _normalize_url(url: str) -> str:
    """Normalize URL: ensure protocol, strip tracking params."""
    if not url or url == 'nan':
        return ''
    url = url.strip()
    if not url:
        return ''
    # Ensure protocol
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    # Strip common tracking parameters
    url = re.sub(r'[?&](utm_\w+|ref|fbclid|gclid|source)=[^&]*', '', url)
    # Clean up leftover ? or &
    url = re.sub(r'\?$', '', url)
    url = re.sub(r'\?&', '?', url)
    # Remove trailing slash for consistency
    url = url.rstrip('/')
    return url


def _format_opening_hours(hours_data) -> str:
    """Convert Apify opening hours array to a readable summary."""
    if not hours_data or not isinstance(hours_data, list):
        return ''
    try:
        parts = []
        for entry in hours_data:
            if isinstance(entry, dict):
                day = entry.get('day', '')
                hours = entry.get('hours', '')
                if day and hours:
                    parts.append(f"{day}: {hours}")
        return ' | '.join(parts) if parts else ''
    except Exception:
        return ''


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

    # Remove postal code (6 digits for India, 5 for USA, alphanumeric for UK)
    address = re.sub(r'\b\d{5,6}\b', '', address)
    address = re.sub(r'\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b', '', address)

    # Split by comma and get relevant part
    parts = [p.strip() for p in address.split(',') if p.strip()]

    if len(parts) >= 2:
        return parts[-2] if len(parts) > 2 else parts[-1]

    return parts[0] if parts else ''


def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add derived columns useful for analysis and outreach.
    """
    # Has website flag
    df['has_website'] = df['website'].apply(lambda x: bool(x and x.strip()))

    # Has Instagram flag
    df['has_instagram'] = df['instagram'].apply(lambda x: bool(x and x.strip()))

    # City extraction
    df['city'] = df['address'].apply(extract_city)

    # WhatsApp deep links (one-click outreach)
    df['whatsapp_link'] = df['phone'].apply(_generate_whatsapp_link)

    return df


def _generate_whatsapp_link(phone: str) -> str:
    """Generate a wa.me deep link for one-click WhatsApp outreach."""
    if not phone:
        return ''
    # Strip the + for wa.me format
    digits = phone.lstrip('+')
    if not digits:
        return ''
    return f"https://wa.me/{digits}"
