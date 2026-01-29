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
    
    prompt = f"""ANALYZE THESE {len(batch_leads)} LEADS.

DATA:
{'-' * 20}
{chr(10).join(leads_context)}
{'-' * 20}

Respond with a JSON LIST of objects (one for each lead), in this format:
[
    {{
        "id": <id from above>,
        "priority": <1-5, where 5 is 'Easy Sale'>,
        "reasoning": "<Why they need us>",
        "outreach_angle": "<THE KILL LINE: A direct, specific hook using their data>"
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


if __name__ == "__main__":
    # Test with demo data
    from apify_client import get_demo_data
    from cleaner import clean_dataframe, add_derived_columns
    from scorer import score_dataframe
    
    print("🧪 Testing Lead Agent (Batch Mode)...\n")
    
    raw_data = get_demo_data()
    df = clean_dataframe(raw_data)
    df = add_derived_columns(df)
    df = score_dataframe(df)
    
    result = run_agent_pipeline(df, max_leads=5)
    
    print("\n✅ Batch Analysis complete!")
