"""
Lead Agent - Agentic AI layer for autonomous lead evaluation

This module adds "agentic" capabilities where Gemini:
1. Autonomously evaluates a BATCH of leads (10 at a time) for cost efficiency.
2. Generates "Kill Lines" (Sales Hooks) for direct outreach.
3. Prioritizes leads based on potential value.

Unlike the rule-based scorer, this agent THINKS about each lead.
"""

import os
import json
import traceback
from dotenv import load_dotenv

load_dotenv()


def get_agent():
    """Initialize Gemini agent."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise ImportError("Please install google-generativeai: pip install google-generativeai")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    
    genai.configure(api_key=api_key)
    
    # Use a capable model for reasoning
    return genai.GenerativeModel(
        'gemini-2.0-flash',
        system_instruction="""You are LeadPilot AI, a cynical B2B Sales Sniper. 
Your goal is to find high-ROI clients for a digital agency.

TARGETS:
1. "Digital Misfit": High Ratings (4.5+) but NO Website. (Easy sell: "Showcase your reputation")
2. "Busy but Broken": Huge Reviews (100+) but bad rating or no site. (Easy sell: "Fix your leaks")

YOUR JOB:
- Analyze leads in BATCHES.
- Ignore "average" businesses. Focus on the ones bleeding money.
- Generate a "Kill Line": A single, direct WhatsApp/SMS hook that mentions SPECIFIC data (e.g. "Saw you have 288 reviews but no site").
- NO FLUFF. NO "Hello sir". NO "We can help". Just the hook.
"""
    )


def analyze_leads_batch(leads: list, max_leads: int = 10) -> list:
    """
    Analyze multiple leads in a SINGLE API call for cost efficiency.
    
    Args:
        leads: List of lead dictionaries
        max_leads: Limit to process
        
    Returns:
        List of leads with 'ai_analysis' attached
    """
    # 1. Prepare Batch
    batch_leads = leads[:max_leads]
    if not batch_leads:
        return []
        
    print(f"\n🤖 AI Agent analyzing {len(batch_leads)} leads in ONE batch...")
    
    # 2. Construct Prompt
    leads_context = []
    for i, lead in enumerate(batch_leads):
        info = (
            f"ID: {i}\n"
            f"Name: {lead.get('name')}\n"
            f"Category: {lead.get('category')}\n"
            f"Rating: {lead.get('rating')}/5 ({lead.get('reviews')} reviews)\n"
            f"Website: {lead.get('website') or 'None'}\n"
            f"Instagram: {lead.get('instagram') or 'None'}\n"
        )
        leads_context.append(info)
    
    prompt = f"""You are a freelance website developer doing cold outreach.
Your goal: Get them to reply. NOT to sell on the first message.

LEAD DATA:
{'-' * 20}
{chr(10).join(leads_context)}
{'-' * 20}

WRITE A WHATSAPP MESSAGE FOR EACH LEAD. Follow this structure:

LINE 1 - PERSONALIZED HOOK (Use their actual data)
- Use their business NAME and something specific (rating, reviews, category)
- Make them feel seen: "4.8 stars with 200+ reviews is impressive"

LINE 2 - THE PROBLEM (Direct)
- Point out the missing/weak website
- Be direct: "no website" or "your site looks outdated"

LINE 3 - THE COST (Make it tangible)
- "People searching '[category] near me' are going to competitors"
- "That's probably 10-20 lost customers every month"

LINE 4 - YOUR OFFER (Indirect, helpful)
- Don't say "I make websites" - say "I can help you with that"
- Position yourself as someone who can solve THEIR problem

LINE 5 - KILLER CLOSE (FOMO + Genuine Advice)
- Make them feel they're leaving money on the table RIGHT NOW
- Sound like a friend giving honest advice, not a pitch
- Options:
  * "tbh you're too good to not have a website - let me know if you want to fix that"
  * "with reviews like yours, you're leaving money on the table - i can sort this out for you"
  * "your competitors with worse ratings have sites and are getting those customers - just saying"
  * "honestly a website would 10x your reach - hmu if you want to get this done"

EXAMPLE OUTPUT:
hey! just saw [Business Name] - 4.9 stars from 300+ reviews, that's impressive 🔥
noticed you don't have a website though
people searching "dentist near me" are going straight to competitors - that's easily 20+ lost customers/month
i can help you with that if you're interested
tbh you're too good to not have a site - lmk if you want to get this sorted

RESPOND WITH JSON:
[
    {{
        "id": <id>,
        "priority": <1-5>,
        "reasoning": "<Why they're a good lead>",
        "outreach_angle": "<The 5-line WhatsApp message>"
    }}
]
"""

    # 3. Call API
    agent = get_agent()
    try:
        response = agent.generate_content(prompt)
        text = response.text.strip()
        
        # Clean JSON
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0]
        elif '```' in text:
            text = text.split('```')[1].split('```')[0]
            
        analysis_list = json.loads(text)
        
        # 4. Map Results back to Leads
        results = []
        analysis_map = {item['id']: item for item in analysis_list if 'id' in item}
        
        for i, lead in enumerate(batch_leads):
            analysis = analysis_map.get(i, {
                "priority": 0, 
                "reasoning": "Analysis failed", 
                "outreach_angle": "Check manually"
            })
            
            # Print Kill Line
            print(f"  🎯 {lead.get('name')[:20]}: {analysis.get('outreach_angle')}")
            
            enriched = {**lead, 'ai_analysis': analysis}
            results.append(enriched)

        # Sort by priority
        results.sort(key=lambda x: x.get('ai_analysis', {}).get('priority', 0), reverse=True)
        return results

    except Exception as e:
        print(f"❌ Batch analysis failed: {e}")
        traceback.print_exc()
        return batch_leads  # Return original leads if failure


def run_agent_pipeline(df, max_leads: int = 10):
    """
    Run the full agentic pipeline on a DataFrame.
    """
    import pandas as pd
    
    leads = df.to_dict('records')
    
    # Run Batch Analysis
    enriched_leads = analyze_leads_batch(leads, max_leads)
    
    # Convert back to DataFrame
    result_df = pd.DataFrame(enriched_leads)
    
    # Flatten AI analysis for CSV export
    if 'ai_analysis' in result_df.columns:
        result_df['ai_priority'] = result_df['ai_analysis'].apply(lambda x: x.get('priority', 0) if isinstance(x, dict) else 0)
        # result_df['ai_reasoning'] = result_df['ai_analysis'].apply(lambda x: x.get('reasoning', '') if isinstance(x, dict) else '')
        result_df['ai_outreach'] = result_df['ai_analysis'].apply(lambda x: x.get('outreach_angle', '') if isinstance(x, dict) else '')
        
        # Drop complex column, keep flat ones
        result_df = result_df.drop(columns=['ai_analysis'])
    
    return result_df


def generate_instagram_dms_batch(profiles: list) -> list:
    """
    Generate Instagram DM scripts for a BATCH of profiles (Cost efficient).
    """
    if not profiles:
        return []
        
    print(f"\n🤖 AI Agent generating DMs for {len(profiles)} profiles...")
    
    # Context Builder
    profiles_context = []
    for i, p in enumerate(profiles):
        info = (
            f"ID: {i}\n"
            f"Username: {p.get('username')}\n"
            f"Bio: {p.get('bio', '')[:200]}\n"
        )
        profiles_context.append(info)

    prompt = f"""You are a freelance web designer sliding into DMs to offer help.
Your goal: Get a reply. NOT to close a sale in the first message.

PROFILE DATA:
{'-' * 20}
{chr(10).join(profiles_context)}
{'-' * 20}

WRITE AN INSTAGRAM DM FOR EACH PROFILE. Follow this structure:

LINE 1 - PERSONALIZED COMPLIMENT
- Reference something SPECIFIC from their bio or work
- "your bridal looks are 🔥" or "love the aesthetic"
- Make them feel like you actually looked at their page

LINE 2 - THE OBSERVATION (Direct)
- "noticed you don't have a website linked"
- "saw you're just using linktree"
- Be direct, not apologetic

LINE 3 - THE CONSEQUENCE
- "clients want to see a portfolio before booking"
- "you're losing inquiries to artists who have proper sites"

LINE 4 - YOUR OFFER (Indirect, helpful)
- Don't say "I make portfolios" - say "I can help you with that"
- Position yourself as someone who solves THEIR problem

LINE 5 - KILLER CLOSE (FOMO + Genuine Advice)
- Make them feel they're leaving bookings on the table RIGHT NOW
- Sound like a friend giving honest advice
- Options:
  * "tbh you're too talented to not have a portfolio - let me know if you want to fix that"
  * "with work like yours, you're leaving bookings on the table - i can sort this for you"
  * "other artists with half your skill have portfolios and are getting those clients - just saying"
  * "honestly a proper site would change your game - hmu if you want to get this done"

TONE RULES:
- lowercase everything
- 1-2 emojis max
- sound like a peer giving real advice
- 4-5 short lines max

EXAMPLE OUTPUT:
hey! your bridal work is 🔥
noticed you don't have a portfolio site linked
clients want to see more before booking - you're losing some to artists who do have sites
i can help you with that if you want
tbh you're too talented to not have a portfolio - lmk if you want to get this sorted

RESPOND WITH JSON:
[
    {{
        "id": <id>,
        "dm_message": "<The casual 4-5 line DM>"
    }}
]
"""
    agent = get_agent()
    try:
        response = agent.generate_content(prompt)
        text = response.text.strip()
        
        # Clean JSON
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0]
        elif '```' in text:
            text = text.split('```')[1].split('```')[0]
            
        return json.loads(text)
        
    except Exception as e:
        print(f"❌ Batch DM gen failed: {e}")
        return []
