"""
Lead Agent - Agentic AI layer for autonomous lead evaluation

This module adds "agentic" capabilities where Gemini:
1. Autonomously evaluates each lead with reasoning
2. Prioritizes leads based on potential value
3. Generates personalized outreach strategies
4. Recommends next actions

Unlike the rule-based scorer, this agent THINKS about each lead.
"""

import os
import json
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
        system_instruction="""You are LeadPilot AI, an expert at evaluating small business leads 
for digital marketing agencies. You analyze businesses and determine:
1. How likely they are to need marketing services
2. What specific services would benefit them
3. The best approach to reach out to them
4. Priority level (1-5, where 5 is highest)

Be concise but insightful. Focus on actionable recommendations."""
    )


def analyze_lead(lead: dict) -> dict:
    """
    Have the AI agent autonomously analyze a single lead.
    
    Returns structured analysis with reasoning.
    """
    agent = get_agent()
    
    prompt = f"""Analyze this business as a potential client for a digital marketing agency.

BUSINESS DATA:
- Name: {lead.get('name', 'Unknown')}
- Category: {lead.get('category', 'Unknown')}
- City: {lead.get('city', 'Unknown')}
- Rating: {lead.get('rating', 'N/A')}/5 ({lead.get('reviews', 0)} reviews)
- Has Website: {'Yes' if lead.get('website') else 'No'}
- Website URL: {lead.get('website', 'None')}
- Has Instagram: {'Yes' if lead.get('instagram') else 'No'}
- Rule-based Score: {lead.get('lead_score', 'N/A')}/100

Respond in this exact JSON format:
{{
    "priority": <1-5>,
    "confidence": <0.0-1.0>,
    "reasoning": "<2-3 sentences explaining your analysis>",
    "pain_points": ["<pain point 1>", "<pain point 2>"],
    "recommended_services": ["<service 1>", "<service 2>"],
    "outreach_angle": "<one sentence hook for outreach>",
    "next_action": "<specific recommended action>"
}}"""

    try:
        response = agent.generate_content(prompt)
        text = response.text.strip()
        
        # Extract JSON from response
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0]
        elif '```' in text:
            text = text.split('```')[1].split('```')[0]
        
        return json.loads(text)
    except Exception as e:
        return {
            "priority": 3,
            "confidence": 0.5,
            "reasoning": f"Analysis failed: {str(e)}",
            "pain_points": ["Unknown"],
            "recommended_services": ["General marketing audit"],
            "outreach_angle": "Offer free consultation",
            "next_action": "Manual review required"
        }


def analyze_leads_batch(leads: list, max_leads: int = 10) -> list:
    """
    Analyze multiple leads with the AI agent.
    
    Returns list of leads with AI analysis attached.
    """
    print(f"\n🤖 AI Agent analyzing {min(len(leads), max_leads)} leads...")
    
    results = []
    for i, lead in enumerate(leads[:max_leads]):
        print(f"  Analyzing {i+1}/{min(len(leads), max_leads)}: {lead.get('name', 'Unknown')}...")
        
        analysis = analyze_lead(lead)
        
        # Merge lead data with AI analysis
        enriched_lead = {**lead, 'ai_analysis': analysis}
        results.append(enriched_lead)
        
        # Show quick preview
        priority = analysis.get('priority', '?')
        print(f"    → Priority: {priority}/5 | {analysis.get('outreach_angle', '')[:50]}...")
    
    # Sort by AI priority (descending)
    results.sort(key=lambda x: x.get('ai_analysis', {}).get('priority', 0), reverse=True)
    
    return results


def generate_outreach_plan(leads: list) -> str:
    """
    Have the agent create a prioritized outreach plan.
    """
    agent = get_agent()
    
    # Prepare leads summary
    leads_summary = "\n".join([
        f"- {l.get('name')}: Priority {l.get('ai_analysis', {}).get('priority', '?')}/5, "
        f"Services: {', '.join(l.get('ai_analysis', {}).get('recommended_services', []))}"
        for l in leads[:10]
    ])
    
    prompt = f"""Based on these analyzed leads, create a prioritized outreach plan for this week.

LEADS:
{leads_summary}

Create a brief action plan with:
1. Which 3 leads to contact first and why
2. Best outreach method for each (call, email, DM)
3. Key talking points for each
4. Suggested follow-up schedule

Keep it actionable and concise."""

    try:
        response = agent.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Failed to generate plan: {str(e)}"


def generate_cold_email(lead: dict) -> str:
    """
    Generate a personalized cold email for a specific lead.
    """
    agent = get_agent()
    
    analysis = lead.get('ai_analysis', {})
    
    prompt = f"""Write a short, personalized cold email for this business.

BUSINESS:
- Name: {lead.get('name')}
- Category: {lead.get('category')}
- Pain Points: {', '.join(analysis.get('pain_points', ['online presence']))}
- Recommended Services: {', '.join(analysis.get('recommended_services', ['marketing']))}
- Outreach Angle: {analysis.get('outreach_angle', 'Help grow their business')}

Rules:
- Keep it under 100 words
- Be conversational, not salesy
- Include ONE specific observation about their business
- End with a soft CTA (coffee chat, quick call)
- Sign as "Alex from LeadPilot"

Just write the email body, no subject line."""

    try:
        response = agent.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Failed to generate email: {str(e)}"


def run_agent_pipeline(df, max_leads: int = 10):
    """
    Run the full agentic pipeline on a DataFrame.
    
    Returns enriched DataFrame with AI analysis.
    """
    import pandas as pd
    
    # Convert to list of dicts
    leads = df.to_dict('records')
    
    # Analyze with AI agent
    enriched_leads = analyze_leads_batch(leads, max_leads)
    
    # Print outreach plan
    print("\n" + "="*50)
    print("📋 AI-GENERATED OUTREACH PLAN")
    print("="*50)
    plan = generate_outreach_plan(enriched_leads)
    print(plan)
    
    # Generate sample email for top lead
    if enriched_leads:
        print("\n" + "="*50)
        print(f"✉️  SAMPLE EMAIL FOR: {enriched_leads[0].get('name')}")
        print("="*50)
        email = generate_cold_email(enriched_leads[0])
        print(email)
    
    # Convert back to DataFrame
    result_df = pd.DataFrame(enriched_leads)
    
    # Flatten AI analysis for CSV export
    if 'ai_analysis' in result_df.columns:
        result_df['ai_priority'] = result_df['ai_analysis'].apply(lambda x: x.get('priority', 0) if isinstance(x, dict) else 0)
        result_df['ai_reasoning'] = result_df['ai_analysis'].apply(lambda x: x.get('reasoning', '') if isinstance(x, dict) else '')
        result_df['ai_outreach'] = result_df['ai_analysis'].apply(lambda x: x.get('outreach_angle', '') if isinstance(x, dict) else '')
        result_df['ai_services'] = result_df['ai_analysis'].apply(lambda x: ', '.join(x.get('recommended_services', [])) if isinstance(x, dict) else '')
        result_df = result_df.drop(columns=['ai_analysis'])
    
    return result_df


if __name__ == "__main__":
    # Test with demo data
    from apify_client import get_demo_data
    from cleaner import clean_dataframe, add_derived_columns
    from scorer import score_dataframe
    
    print("🧪 Testing Lead Agent with demo data...\n")
    
    # Prepare test data
    raw_data = get_demo_data()
    df = clean_dataframe(raw_data)
    df = add_derived_columns(df)
    df = score_dataframe(df)
    
    # Run agent
    result = run_agent_pipeline(df, max_leads=3)
    
    print("\n✅ Agent pipeline complete!")
    print(f"Analyzed {len(result)} leads with AI insights.")
