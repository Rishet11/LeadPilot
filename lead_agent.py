"""
Lead Agent - Agentic AI layer for autonomous lead evaluation

This module adds "agentic" capabilities where Gemini:
1. Autonomously evaluates a BATCH of leads for cost efficiency.
2. Generates personalized outreach messages for direct contact.
3. Prioritizes leads based on potential value.
"""

import os
import json
import time
import logging
from dotenv import load_dotenv

from constants import DEFAULT_AI_SYSTEM_PROMPT, CATEGORY_HOOKS

load_dotenv()

logger = logging.getLogger("leadpilot")

MAX_RETRIES = 2
RETRY_DELAY = 3


def get_agent(temperature: float = 0.9):
    """Initialize Gemini agent with generation config."""
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise ImportError("Please install google-genai: pip install google-genai")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")

    client = genai.Client(api_key=api_key)
    
    # Return a wrapper that matches the old API pattern
    class GeminiAgent:
        def __init__(self, client, model_name, system_instruction, temperature):
            self.client = client
            self.model_name = model_name
            self.system_instruction = system_instruction
            self.temperature = temperature
        
        def generate_content(self, prompt: str):
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_instruction,
                    temperature=self.temperature,
                    response_mime_type="application/json",
                )
            )
            return response
    
    model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-2.0-flash")
    
    return GeminiAgent(
        client=client,
        model_name=model_name,
        system_instruction=DEFAULT_AI_SYSTEM_PROMPT,
        temperature=temperature,
    )


def _call_with_retry(agent, prompt: str) -> str:
    """Call Gemini with retry logic for transient failures."""
    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = agent.generate_content(prompt)
            text = response.text.strip()
            # Clean JSON markdown wrappers if present
            if '```json' in text:
                text = text.split('```json')[1].split('```')[0]
            elif '```' in text:
                text = text.split('```')[1].split('```')[0]
            return text.strip()
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                logger.warning("API call failed (attempt %d/%d): %s", attempt + 1, MAX_RETRIES + 1, e)
                time.sleep(RETRY_DELAY * (attempt + 1))
            else:
                raise last_error


def get_currency_symbol(city: str) -> str:
    """Infer currency symbol from city name."""
    city = (city or "").lower()
    if any(c in city for c in ['london', 'manchester', 'leeds', 'liverpool', 'birmingham', 'uk', 'england']):
        return "£"
    if any(c in city for c in ['delhi', 'mumbai', 'bangalore', 'pune', 'chennai', 'india']):
        return "₹"
    return "$"


def analyze_leads_batch(leads: list, max_leads: int = 25) -> list:
    """
    Analyze multiple leads in a SINGLE API call for cost efficiency.

    Args:
        leads: List of lead dictionaries
        max_leads: Limit to process per batch

    Returns:
        List of leads with 'ai_analysis' attached
    """
    batch_leads = leads[:max_leads]
    if not batch_leads:
        return []

    logger.info("AI Agent analyzing %d leads...", len(batch_leads))

    # Build rich context for each lead
    leads_context = []
    for i, lead in enumerate(batch_leads):
        category = (lead.get('category') or '').lower()
        city = lead.get('city', 'Unknown')
        
        # Find matching hooks
        hooks = {}

        for cat_key, cat_data in CATEGORY_HOOKS.items():
            if cat_key in category:
                hooks = cat_data
                break

        parts = [
            f"ID: {i}",
            f"Name: {lead.get('name')}",
            f"Category: {lead.get('category')}",
            f"City: {city}",
            f"Rating: {lead.get('rating')}/5 ({lead.get('reviews', 0)} reviews)",
            f"Website: {lead.get('website') or 'NONE'}",
            f"Phone: {lead.get('phone') or 'Unknown'}",
        ]
        
        # Calculate Potential Missed Opportunities (Phase 3 - Safe Version)
        # Rule of thumb: Reviews * 0.5 = Est. monthly missed searches. 
        # Focus on VOLUME of people, not $ value, to avoid being wrong about pricing.
        reviews = lead.get('reviews', 0) or 0
        est_missed_customers = int(reviews * 0.5)
        
        if est_missed_customers > 5:
            # Use specific term per category
            customer_term = "customers"
            if 'gym' in category or 'fitness' in category:
                customer_term = "members"
            elif 'restaurant' in category or 'cafe' in category:
                customer_term = "diners"
            elif 'salon' in category:
                customer_term = "clients"
            elif 'dentist' in category:
                customer_term = "patients"

            parts.append(f"Est. Monthly Missed: {est_missed_customers} {customer_term} (conservative est.)")

        if hooks:
            parts.append("--- CATEGORY INSIGHTS ---")
            parts.append(f"Pain Point: {hooks['pain_point']}")
            parts.append(f"Quick Win: {hooks['quick_win']}")
            parts.append(f"Urgency Trigger: {hooks['urgency']}")
            parts.append("-------------------------")

        # Add recent reviews for sentiment analysis (Week 2 Feature)
        top_reviews = lead.get('top_reviews')
        if top_reviews and isinstance(top_reviews, list):
            review_texts = []
            for r in top_reviews[:3]:  # Top 3 reviews
                text = r.get('text')
                if text:
                    review_texts.append(f"- \"{text[:150]}...\"")
            if review_texts:
                parts.append("--- RECENT REVIEWS (Use for context) ---")
                parts.extend(review_texts)
                parts.append("----------------------------------------")

        if lead.get('instagram'):
            parts.append(f"Instagram: @{lead.get('instagram')}")
        if lead.get('address'):
            parts.append(f"Address: {lead.get('address')}")
        leads_context.append("\n".join(parts))

    prompt = f"""Analyze these leads and write personalized WhatsApp outreach messages.

LEAD DATA:
{"=" * 30}
{chr(10).join(f"[Lead {i}]{chr(10)}{ctx}" for i, ctx in enumerate(leads_context))}
{"=" * 30}

FOR EACH LEAD, provide:
1. priority (1-5): 5 = hot lead (high ratings, no website, specific review complaints).
2. reasoning: Why this lead is worth pursuing.
3. variants: THREE distinct WhatsApp messages.

VARIANTS TO GENERATE:
A. "FRIENDLY / HELP" (Soft approach)
   - "Saw your great reviews..."
   - "Noticed you don't have a site..."
   - "Happy to send a mockup?"

B. "VALUE FIRST" (ROI focus)
   - "You're likely missing X customers/month without a site..."
   - "I build sites that convert traffic..."
   - "Worth a 5-min chat?"

C. "DIRECT / PROBLEM SOLVER" (Short & punchy)
   - "Quick question about your Google Maps profile..."
   - "Fixing the missing website link would boost your ranking."
   - "Want to see how?"

CRITICAL RULES:
- If RECENT REVIEWS are provided, reference specific praise or complaints (e.g. "Saw customers love your [product] but complain about [issue]").
- NO EMOJIS in messages.
- Use actual business name.
- Sentence case capitalization.

RESPOND WITH A JSON ARRAY:
[
    {{
        "id": <id>,
        "priority": <1-5>,
        "reasoning": "<text>",
        "variants": {{
            "friendly": "<msg>",
            "value": "<msg>",
            "direct": "<msg>"
        }}
    }}
]
"""

    agent = get_agent(temperature=0.9)
    try:
        text = _call_with_retry(agent, prompt)
        analysis_list = json.loads(text)

        results = []
        # Support both old and new format (if unexpected fields appear)
        analysis_map = {item.get('id', -1): item for item in analysis_list}

        for i, lead in enumerate(batch_leads):
            analysis = analysis_map.get(i, {
                "priority": 0,
                "reasoning": "Analysis failed",
                "variants": {}
            })

            logger.info("Lead %s → Priority %s",
                        lead.get('name', '')[:25],
                        analysis.get('priority', '?'))

            enriched = {**lead, 'ai_analysis': analysis}
            results.append(enriched)

        results.sort(key=lambda x: x.get('ai_analysis', {}).get('priority', 0), reverse=True)
        return results

    except Exception as e:
        logger.error("Batch analysis failed: %s", e, exc_info=True)
        return batch_leads


def run_agent_pipeline(df, max_leads: int = 25):
    """
    Run the full agentic pipeline on a DataFrame.
    Processes leads in batches of 25 for API efficiency.
    """
    import pandas as pd

    leads = df.to_dict('records')

    # Process in batches
    batch_size = 25
    all_enriched = []

    for i in range(0, min(len(leads), max_leads), batch_size):
        chunk = leads[i:i + batch_size]
        enriched = analyze_leads_batch(chunk, max_leads=batch_size)
        all_enriched.extend(enriched)

    if not all_enriched:
        return df

    result_df = pd.DataFrame(all_enriched)

    # Flatten AI analysis for CSV export (Week 2 Update)
    if 'ai_analysis' in result_df.columns:
        result_df['ai_priority'] = result_df['ai_analysis'].apply(
            lambda x: x.get('priority', 0) if isinstance(x, dict) else 0
        )
        result_df['ai_reasoning'] = result_df['ai_analysis'].apply(
            lambda x: x.get('reasoning', '') if isinstance(x, dict) else ''
        )
        
        # Flatten variants
        result_df['outreach_friendly'] = result_df['ai_analysis'].apply(
            lambda x: x.get('variants', {}).get('friendly', '') if isinstance(x, dict) else ''
        )
        result_df['outreach_value'] = result_df['ai_analysis'].apply(
            lambda x: x.get('variants', {}).get('value', '') if isinstance(x, dict) else ''
        )
        result_df['outreach_direct'] = result_df['ai_analysis'].apply(
            lambda x: x.get('variants', {}).get('direct', '') if isinstance(x, dict) else ''
        )
         
        result_df = result_df.drop(columns=['ai_analysis'])

    # Re-sort by AI priority
    if 'ai_priority' in result_df.columns:
        result_df = result_df.sort_values('ai_priority', ascending=False)

    return result_df


def generate_instagram_dms_batch(profiles: list) -> list:
    """
    Generate Instagram DM scripts for a BATCH of profiles.
    """
    if not profiles:
        return []

    logger.info("AI Agent generating DMs for %d profiles...", len(profiles))

    profiles_context = []
    for i, p in enumerate(profiles):
        parts = [
            f"ID: {i}",
            f"Username: @{p.get('username')}",
            f"Bio: {p.get('bio', '')[:300]}",
        ]
        if p.get('followers'):
            parts.append(f"Followers: {p.get('followers')}")
        if p.get('external_url'):
            parts.append(f"Link: {p.get('external_url')}")
        elif p.get('has_real_website') is False:
            parts.append("Website: NONE (or linktree only)")
        profiles_context.append("\n".join(parts))

    prompt = f"""Write an Instagram DM for each profile below. Goal: get a reply, not close a sale.

PROFILE DATA:
{"=" * 30}
{chr(10).join(f"[Profile {i}]{chr(10)}{ctx}" for i, ctx in enumerate(profiles_context))}
{"=" * 30}

DM STRUCTURE (3-4 lines max, Instagram is shorter):
LINE 1 - SPECIFIC COMPLIMENT: Reference something from their bio, posts, or niche. Show you looked.
LINE 2 - OBSERVATION: Point out missing site/portfolio. "Noticed you don't have a site" or "Saw you're using Linktree"
LINE 3 - TANGIBLE CONSEQUENCE: Make it real for their niche. "Clients check sites before booking" or "Losing inquiries to others with portfolios"
LINE 4 - LOW-FRICTION CTA: "Want to see what I built for [similar niche]?" or "Can I show you examples?"

RULES:
- Use their actual username and bio details. Each message MUST be unique.
- Casual but PROFESSIONAL GRAMMAR (Sentence case). 1-2 emojis MAX.
- **STRICTLY CAPITALIZE the first letter of sentences.** Do not use all lowercase.
- If bio mentions specialty (bridal, fitness, baking, etc.), reference it directly.
- If they have linktree but no real site: "Upgrading from Linktree to a real site would change your game"
- Sound genuine, like a peer who works in digital. Not salesy.
- Better CTAs: "Want examples?", "Can I send you what I built for [niche]?", "DM me if curious" — specific and easy
- Add credibility if natural: "Work with a lot of [niche] creators", "Helped 5+ [niche] accounts with this"

RESPOND WITH A JSON ARRAY:
[
    {{
        "id": <id>,
        "dm_message": "<the 3-4 line DM>"
    }}
]
"""
    agent = get_agent(temperature=1.0)
    try:
        text = _call_with_retry(agent, prompt)
        return json.loads(text)

    except Exception as e:
        logger.error("Batch DM gen failed: %s", e)
        return []
