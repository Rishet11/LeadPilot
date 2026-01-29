"""
Email Finder - Find contact emails for leads

Uses multiple strategies:
1. Website scraping (look for contact/about pages)
2. Common email patterns (info@, contact@, hello@)
3. Hunter.io API (optional, requires API key)
"""

import re
import requests
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import pandas as pd


def extract_emails_from_text(text: str) -> list:
    """Extract email addresses from text using regex."""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    return list(set(re.findall(email_pattern, text)))


def scrape_website_for_emails(url: str, timeout: int = 10) -> list:
    """
    Scrape a website's contact/about pages for email addresses.
    
    Returns:
        List of email addresses found
    """
    if not url or not url.strip():
        return []
    
    # Ensure URL has protocol
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    emails = set()
    
    # Pages to check
    pages_to_check = [
        url,
        urljoin(url, '/contact'),
        urljoin(url, '/about'),
        urljoin(url, '/contact-us'),
        urljoin(url, '/about-us')
    ]
    
    for page_url in pages_to_check:
        try:
            response = requests.get(page_url, timeout=timeout, allow_redirects=True)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for mailto links
            for link in soup.find_all('a', href=True):
                href = link['href']
                if href.startswith('mailto:'):
                    email = href.replace('mailto:', '').split('?')[0]
                    emails.add(email)
            
            # Extract from page text
            page_text = soup.get_text()
            found_emails = extract_emails_from_text(page_text)
            emails.update(found_emails)
            
            # If we found emails, no need to check more pages
            if emails:
                break
                
        except Exception:
            continue
    
    # Filter out common non-useful emails
    filtered = [e for e in emails if not any(x in e.lower() for x in 
                ['example.com', 'test.com', 'domain.com', 'noreply', 'no-reply'])]
    
    return list(filtered)[:3]  # Return max 3 emails


def guess_email_patterns(business_name: str, website: str) -> list:
    """
    Generate likely email patterns based on business name and website.
    
    Returns:
        List of probable email addresses
    """
    if not website or not website.strip():
        return []
    
    # Extract domain from website
    domain_match = re.search(r'(?:https?://)?(?:www\.)?([^/]+)', website)
    if not domain_match:
        return []
    
    domain = domain_match.group(1)
    
    # Common email prefixes
    patterns = [
        f"info@{domain}",
        f"contact@{domain}",
        f"hello@{domain}",
        f"support@{domain}",
        f"admin@{domain}"
    ]
    
    return patterns


def find_email_for_lead(lead: dict, guess_only: bool = False) -> str:
    """
    Find email for a single lead.
    
    Args:
        lead: Dictionary with business data
        guess_only: If True, only guess patterns (faster, no scraping)
        
    Returns:
        Best email address or empty string
    """
    website = lead.get('website', '')
    name = lead.get('name', '')
    
    if not website:
        return ''
    
    # Try scraping website
    if not guess_only:
        scraped_emails = scrape_website_for_emails(website)
        if scraped_emails:
            return scraped_emails[0]  # Return first found email
    
    # Fallback to guessing
    guessed = guess_email_patterns(name, website)
    if guessed:
        return guessed[0]  # Return most likely pattern
    
    return ''


def enrich_dataframe_with_emails(df: pd.DataFrame, max_leads: int = 20, 
                                  guess_only: bool = True) -> pd.DataFrame:
    """
    Add email addresses to DataFrame.
    
    Args:
        df: DataFrame with leads
        max_leads: Maximum leads to process
        guess_only: If True, only guess patterns (much faster)
        
    Returns:
        DataFrame with email column added
    """
    df = df.copy()
    df['email'] = ''
    
    # Only process leads with websites
    has_website = df['website'].notna() & (df['website'] != '')
    website_leads = df[has_website].head(max_leads)
    
    if len(website_leads) == 0:
        print("📧 No websites found to extract emails from")
        return df
    
    mode = "Guessing" if guess_only else "Scraping"
    print(f"\n📧 {mode} emails for {len(website_leads)} leads...")
    
    for idx, row in website_leads.iterrows():
        lead_dict = row.to_dict()
        
        try:
            email = find_email_for_lead(lead_dict, guess_only=guess_only)
            if email:
                df.at[idx, 'email'] = email
                print(f"  ✅ {row['name']}: {email}")
            else:
                print(f"  ❌ {row['name']}: No email found")
        except Exception as e:
            print(f"  ⚠️ {row['name']}: Error - {str(e)}")
    
    return df
