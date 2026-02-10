"""
Tests for email scraper module.
"""

import unittest
from unittest.mock import patch, MagicMock
from bs4 import BeautifulSoup
from email_scraper import (
    find_email_on_website, _extract_emails_from_html, 
    _is_valid_email, _pick_best_email
)


class TestEmailScraper(unittest.TestCase):

    def test_is_valid_email(self):
        # Valid
        self.assertTrue(_is_valid_email("test@example.com"))
        self.assertTrue(_is_valid_email("info@business.co.uk"))
        self.assertTrue(_is_valid_email("contact.us+tag@site.org"))
        
        # Invalid / Junk
        self.assertFalse(_is_valid_email("image@2x.png"))
        self.assertFalse(_is_valid_email("script.js"))
        self.assertFalse(_is_valid_email("noreply@example.com"))
        self.assertFalse(_is_valid_email("sentry@sentry.io"))
        self.assertFalse(_is_valid_email("example@example.com"))
        self.assertFalse(_is_valid_email("user@domain.com"))
        self.assertFalse(_is_valid_email(""))
        self.assertFalse(_is_valid_email(None))

    def test_extract_emails_from_html(self):
        html = """
        <html>
            <body>
                <a href="mailto:contact@test.com">Email Us</a>
                <p>For support contact support@test.com or call us.</p>
                <img src="logo@2x.png">
                <!-- hidden: admin@test.com -->
            </body>
        </html>
        """
        soup = BeautifulSoup(html, "html.parser")
        emails = _extract_emails_from_html(soup)
        
        self.assertIn("contact@test.com", emails)
        self.assertIn("support@test.com", emails)
        self.assertNotIn("logo@2x.png", emails)

    def test_pick_best_email(self):
        emails = {"admin@test.com", "info@test.com", "random@gmail.com"}
        best = _pick_best_email(emails, "https://test.com")
        self.assertEqual(best, "info@test.com")
        
        # Priority check
        emails = {"support@test.com", "hello@test.com"}
        best = _pick_best_email(emails, "https://test.com")
        self.assertIn(best, ["support@test.com", "hello@test.com"])

    @patch('requests.get')
    def test_find_email_on_website_homepage(self, mock_get):
        # Mock successful homepage response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '<html><body><a href="mailto:found@test.com">Contact</a></body></html>'
        mock_get.return_value = mock_response
        
        email = find_email_on_website("https://test.com")
        self.assertEqual(email, "found@test.com")

    @patch('requests.get')
    def test_find_email_follows_contact_link(self, mock_get):
        # Mock homepage with no email but a contact link
        mock_home = MagicMock()
        mock_home.status_code = 200
        mock_home.text = '<html><body><a href="/contact-us">Contact Us</a></body></html>'
        
        # Mock contact page with email
        mock_contact = MagicMock()
        mock_contact.status_code = 200
        mock_contact.text = '<html><body>Email: support@test.com</body></html>'
        
        # Side effect: first call returns home, second returns contact page
        mock_get.side_effect = [mock_home, mock_contact]
        
        email = find_email_on_website("https://test.com")
        self.assertEqual(email, "support@test.com")


if __name__ == '__main__':
    unittest.main()
