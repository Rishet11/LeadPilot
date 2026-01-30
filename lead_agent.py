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

from constants import DEFAULT_AI_SYSTEM_PROMPT

load_dotenv()

logger = logging.getLogger("leadpilot")

MAX_RETRIES = 2
RETRY_DELAY = 3


def get_agent(temperature: float = 0.9):
    """Initialize Gemini agent with generation config."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise ImportError("Please install google-generativeai: pip install google-generativeai")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")

    genai.configure(api_key=api_key)

    generation_config = genai.GenerationConfig(
        temperature=temperature,
        response_mime_type="application/json",
    )

    return genai.GenerativeModel(
        'gemini-2.0-flash',
        system_instruction=DEFAULT_AI_SYSTEM_PROMPT,
        generation_config=generation_config,
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
        parts = [
            f"ID: {i}",
            f"Name: {lead.get('name')}",
            f"Category: {lead.get('category')}",
            f"City: {lead.get('city', 'Unknown')}",
            f"Rating: {lead.get('rating')}/5 ({lead.get('reviews', 0)} reviews)",
            f"Website: {lead.get('website') or 'NONE'}",
            f"Phone: {lead.get('phone') or 'Unknown'}",
        ]
        if lead.get('instagram'):
            parts.append(f"Instagram: @{lead.get('instagram')}")
        if lead.get('address'):
            parts.append(f"Address: {lead.get('address')}")
        leads_context.append("\n".join(parts))

    prompt = f"""Analyze these leads and write a WhatsApp outreach message for each.

LEAD DATA:
{"=" * 30}
{chr(10).join(f"[Lead {i}]{chr(10)}{ctx}" for i, ctx in enumerate(leads_context))}
{"=" * 30}

FOR EACH LEAD, provide:
1. priority (1-5): How likely they are to convert. 5 = hot lead (high ratings, no website, many reviews). 1 = cold (has website, average metrics).
2. reasoning: One sentence on WHY this lead is worth pursuing or not.
3. outreach_angle: A 4-5 line WhatsApp message following this structure:

LINE 1 - PERSONALIZED HOOK: Reference their exact data (name, rating, review count). Make them feel seen.
LINE 2 - THE GAP: Point out their missing or weak website directly.
LINE 3 - THE COST: Make the lost revenue tangible. "People searching '[their category] near me' are finding competitors instead."
LINE 4 - SOFT OFFER: "I can help with that if you're interested" — position as solving their problem, not selling.
LINE 5 - CLOSE: Sound like a friend giving real advice. Reference their specific strength.

RULES:
- Use their ACTUAL business name, rating, and review count in the message.
- Lowercase, conversational tone. No "Dear" or "Hello sir".
- Each message must be UNIQUE — no copy-paste templates with swapped names.
- If a lead already HAS a website, focus on improving it or their online presence instead.

RESPOND WITH A JSON ARRAY:
[
    {{
        "id": <id>,
        "priority": <1-5>,
        "reasoning": "<one sentence>",
        "outreach_angle": "<the 4-5 line message>"
    }}
]
"""

    agent = get_agent(temperature=0.9)
    try:
        text = _call_with_retry(agent, prompt)
        analysis_list = json.loads(text)

        results = []
        analysis_map = {item['id']: item for item in analysis_list if 'id' in item}

        for i, lead in enumerate(batch_leads):
            analysis = analysis_map.get(i, {
                "priority": 0,
                "reasoning": "Analysis failed",
                "outreach_angle": "Check manually"
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

    # Flatten AI analysis for CSV export
    if 'ai_analysis' in result_df.columns:
        result_df['ai_priority'] = result_df['ai_analysis'].apply(
            lambda x: x.get('priority', 0) if isinstance(x, dict) else 0
        )
        result_df['ai_outreach'] = result_df['ai_analysis'].apply(
            lambda x: x.get('outreach_angle', '') if isinstance(x, dict) else ''
        )
        result_df['ai_reasoning'] = result_df['ai_analysis'].apply(
            lambda x: x.get('reasoning', '') if isinstance(x, dict) else ''
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

DM STRUCTURE (4-5 lines max):
LINE 1 - COMPLIMENT: Reference something SPECIFIC from their bio or niche. Show you looked at their page.
LINE 2 - OBSERVATION: Point out missing website/portfolio directly. "noticed you don't have a site linked"
LINE 3 - CONSEQUENCE: Make it tangible. "clients check your site before booking" or "you're losing inquiries to others who have one"
LINE 4 - OFFER: "I can help with that" — solve their problem, don't pitch services.
LINE 5 - CLOSE: Sound like a peer. Reference their specific talent or niche.

RULES:
- Use their actual username and bio details. Each message MUST be unique.
- Lowercase, casual. 1-2 emojis max.
- If their bio mentions a specialty (bridal, fitness, baking), reference it directly.
- If they have a linktree/bio link but no real site, mention upgrading from linktree.
- Sound genuine, not scripted.

RESPOND WITH A JSON ARRAY:
[
    {{
        "id": <id>,
        "dm_message": "<the 4-5 line DM>"
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
