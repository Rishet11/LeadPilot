"""
Email Scraper - Finds contact emails on business websites.

Logic:
1. Visit homepage
2. Extract all 'mailto:' links
3. Extract all email text patterns
4. If none found, find 'Contact', 'About', 'Connect' pages and repeat
5. Filter out junk/placeholder emails
6. Return best unique email

Performance:
- Uses ThreadPoolExecutor for concurrent scraping
- Timeouts and User-Agent headers to avoid blocks
"""

import re
import logging
import requests
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger("leadpilot")

# Regex for email extraction
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

# Junk emails to ignore
JUNK_EMAILS = {
    'sentry', 'noreply', 'no-reply', 'donotreply', 'example', 'domain',
    'email', 'name', 'username', 'user', 'contact', 'info' 
    # 'info' is debatable, but often a placeholder. keeping it for now unless found valid.
    # Actually, for small business 'info@' is often valid. Let's allow 'info', 'contact'.
}
JUNK_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.js', '.css'}

# Keywords for contact pages
CONTACT_KEYWORDS = ['contact', 'about', 'connect', 'touch', 'support']


def find_email_on_website(url: str, timeout: int = 10) -> str:
    """
    Scrape a single website for a contact email.
    Returns the first valid email found, or empty string.
    """
    if not url or 'http' not in url:
        return ''

    try:
        # Standard headers to look like a browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }

        # 1. Visit Homepage
        try:
            response = requests.get(url, headers=headers, timeout=timeout)
            response.raise_for_status()
        except Exception:
            # Try adding www if failed
            if 'www.' not in url:
                try:
                    alt_url = url.replace('://', '://www.')
                    response = requests.get(alt_url, headers=headers, timeout=timeout)
                    response.raise_for_status()
                    url = alt_url
                except Exception:
                    return ''
            else:
                return ''

        soup = BeautifulSoup(response.text, 'html.parser')
        emails = _extract_emails_from_html(soup)

        if emails:
            return _pick_best_email(emails, url)

        # 2. Find Contact Page
        contact_link = _find_contact_link(soup, url)
        if contact_link:
            try:
                resp_contact = requests.get(contact_link, headers=headers, timeout=timeout)
                if resp_contact.status_code == 200:
                    soup_contact = BeautifulSoup(resp_contact.text, 'html.parser')
                    contact_emails = _extract_emails_from_html(soup_contact)
                    if contact_emails:
                        return _pick_best_email(contact_emails, url)
            except Exception:
                pass

        return ''

    except Exception:
        # logger.debug(f"Error scraping {url}: {e}")
        return ''


def scrape_emails_concurrently(urls: list, max_workers: int = 10) -> dict:
    """
    Scrape multiple websites concurrently.
    Returns a dict mapping {url: email}.
    """
    results = {}
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_url = {executor.submit(find_email_on_website, url): url for url in urls if url}
        
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                email = future.result()
                if email:
                    results[url] = email
            except Exception as e:
                logger.error(f"Scraper thread failed for {url}: {e}")
                
    return results


def _extract_emails_from_html(soup: BeautifulSoup) -> set:
    """Extract all valid-looking emails from a BeautifulSoup object."""
    emails = set()

    # 1. Mailto links
    for a in soup.find_all('a', href=True):
        href = a['href'].lower()
        if href.startswith('mailto:'):
            email = href.replace('mailto:', '').split('?')[0].strip()
            if _is_valid_email(email):
                emails.add(email)

    # 2. Text patterns (less reliable but catches hidden ones)
    text = soup.get_text()
    matches = EMAIL_REGEX.findall(text)
    for email in matches:
        if _is_valid_email(email):
            emails.add(email)

    return emails


def _is_valid_email(email: str) -> bool:
    """Filter out junk emails."""
    if not email or len(email) > 100:
        return False
    
    email = email.lower()
    
    # Filter image files mistaken as emails (e.g. image@2x.png)
    if any(email.endswith(ext) for ext in JUNK_EXTENSIONS):
        return False
        
    # Filter common placeholder/junk terms (but allow info/contact)
    local_part = email.split('@')[0]
    if local_part in {'sentry', 'noreply', 'no-reply', 'example', 'domain', 'user', 'name'}:
        return False
        
    return True


def _pick_best_email(emails: set, domain_url: str) -> str:
    """Pick the most relevant email from a set."""
    if not emails:
        return ''
        
    # Priority: info@, contact@, hello@, support@
    priorities = ['info@', 'contact@', 'hello@', 'support@', 'sales@', 'booking@']
    
    # Try to match domain
    try:
        domain = urlparse(domain_url).netloc.replace('www.', '')
    except Exception:
        domain = ''

    sorted_emails = sorted(list(emails))
    
    # 1. Look for priority prefixes on the same domain
    if domain:
        for p in priorities:
            for email in sorted_emails:
                if p in email and domain in email:
                    return email

    # 2. Look for priority prefixes anywhere
    for p in priorities:
        for email in sorted_emails:
            if p in email:
                return email
                
    # 3. Look for same domain
    if domain:
        for email in sorted_emails:
            if domain in email:
                return email

    # 4. Return first one
    return sorted_emails[0]


def _find_contact_link(soup: BeautifulSoup, base_url: str) -> str:
    """Find the most likely contact page URL."""
    for a in soup.find_all('a', href=True):
        text = a.get_text().lower()
        href = a['href']
        
        # Check if text contains keywords
        if any(k in text for k in CONTACT_KEYWORDS):
            return urljoin(base_url, href)
            
        # Check if URL itself contains keywords
        if any(k in href.lower() for k in CONTACT_KEYWORDS):
            return urljoin(base_url, href)
            
    return ''
