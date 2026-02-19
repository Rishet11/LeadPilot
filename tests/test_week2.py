
from unittest.mock import patch, MagicMock
from scorer import score_lead
from lead_agent import analyze_leads_batch

class TestServiceTypeScoring:
    def test_scores_residential_service(self):
        row = {
            'name': 'Bob\'s Residential Plumbing',
            'category': 'plumber',
            'rating': 4.5,
            'reviews': 50,
            'website': 'example.com'
        }
        score, reason = score_lead(row)
        assert "Residential Service" in reason
        assert score >= 10  # Base logic + 10 boost

    def test_scores_trade_implied_residential(self):
        row = {
            'name': 'Acme HVAC',
            'category': 'hvac',
            'rating': 4.5,
            'reviews': 50,
            'website': 'example.com'
        }
        score, reason = score_lead(row)
        assert "Residential Service" in reason

    def test_no_boost_for_commercial(self):
        row = {
            'name': 'Corporate Office Cleaners',
            'category': 'cleaning',
            'rating': 4.5,
            'reviews': 50,
            'website': 'example.com'
        }
        score, reason = score_lead(row)
        # Should NOT have the Residential boost
        assert "Residential Service" not in reason

class TestAIReviewAnalysis:
    @patch('lead_agent.get_agent')
    @patch('lead_agent._call_with_retry')
    def test_constructs_prompt_with_reviews(self, mock_call, mock_get_agent):
        mock_agent = MagicMock()
        mock_get_agent.return_value = mock_agent
        
        # Mock response to be valid JSON
        mock_call.return_value = '[{"id": 0, "priority": 5, "reasoning": "test", "variants": {"friendly": "msg1", "value": "msg2", "direct": "msg3"}}]'

        leads = [{
            'name': 'Test Lead',
            'category': 'hvac',
            'top_reviews': [
                {'text': 'Great service, fixed my AC fast!'},
                {'text': 'A bit expensive but worth it.'}
            ]
        }]

        analyze_leads_batch(leads)

        # check if prompt contains review text
        args, _ = mock_call.call_args
        prompt = args[1]  # second arg is prompt
        assert "RECENT REVIEWS" in prompt
        assert "fixed my AC fast" in prompt
        assert "expensive but worth it" in prompt
