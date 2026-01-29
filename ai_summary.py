"""
AI Summary - Generate intelligent lead summaries using Gemini

Optional feature that adds AI-powered analysis to each lead.
"""

import os
from dotenv import load_dotenv

load_dotenv()


def get_gemini_client():
    """Initialize Gemini client."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise ImportError("Please install google-generativeai: pip install google-generativeai")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-2.0-flash')


def generate_lead_summary(lead: dict) -> str:
    """
    Generate an AI summary for a single lead.
    
    Args:
        lead: Dictionary with lead data
        
    Returns:
        AI-generated summary string
    """
    model = get_gemini_client()
    
    prompt = f"""Analyze this business as a potential client for digital marketing services.
Be concise (1-2 sentences max).

Business: {lead.get('name', 'Unknown')}
Category: {lead.get('category', 'Unknown')}
Rating: {lead.get('rating', 'N/A')}
Reviews: {lead.get('reviews', 0)}
Has Website: {'Yes' if lead.get('website') else 'No'}
Has Instagram: {'Yes' if lead.get('instagram') else 'No'}
Lead Score: {lead.get('lead_score', 'N/A')}/100

Why is this a good lead? What services would benefit them most?"""

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Summary unavailable: {str(e)}"


def add_ai_summaries(df, max_leads: int = 10):
    """
    Add AI summaries to top leads in DataFrame.
    
    Args:
        df: DataFrame with scored leads
        max_leads: Maximum number of leads to summarize (to save API costs)
        
    Returns:
        DataFrame with ai_summary column added
    """
    import pandas as pd
    
    df = df.copy()
    df['ai_summary'] = ''
    
    # Only summarize top leads
    leads_to_summarize = min(max_leads, len(df))
    
    print(f"🤖 Generating AI summaries for top {leads_to_summarize} leads...")
    
    for i in range(leads_to_summarize):
        lead = df.iloc[i].to_dict()
        try:
            summary = generate_lead_summary(lead)
            df.at[i, 'ai_summary'] = summary
            print(f"  ✅ {i+1}/{leads_to_summarize}: {lead.get('name', 'Unknown')}")
        except Exception as e:
            print(f"  ❌ {i+1}/{leads_to_summarize}: Error - {str(e)}")
            df.at[i, 'ai_summary'] = "Summary unavailable"
    
    return df


def batch_summarize(leads: list) -> list:
    """
    Generate summaries for multiple leads in batch.
    More efficient for large datasets.
    
    Args:
        leads: List of lead dictionaries
        
    Returns:
        List of summary strings
    """
    model = get_gemini_client()
    
    # Build batch prompt
    leads_text = "\n\n".join([
        f"Lead {i+1}:\n"
        f"- Name: {l.get('name', 'Unknown')}\n"
        f"- Category: {l.get('category', 'Unknown')}\n"
        f"- Score: {l.get('lead_score', 'N/A')}/100\n"
        f"- Has Website: {'Yes' if l.get('website') else 'No'}\n"
        f"- Reviews: {l.get('reviews', 0)}"
        for i, l in enumerate(leads)
    ])
    
    prompt = f"""For each business below, write a one-sentence summary explaining 
why they're a good lead for digital marketing services.

{leads_text}

Format your response as:
Lead 1: [summary]
Lead 2: [summary]
...
"""

    try:
        response = model.generate_content(prompt)
        text = response.text
        
        # Parse response
        summaries = []
        for i, line in enumerate(text.strip().split('\n')):
            if line.startswith(f'Lead {i+1}:'):
                summaries.append(line.split(':', 1)[1].strip())
            elif ':' in line:
                summaries.append(line.split(':', 1)[1].strip())
        
        # Pad with empty strings if needed
        while len(summaries) < len(leads):
            summaries.append("Summary unavailable")
            
        return summaries[:len(leads)]
        
    except Exception as e:
        return ["Summary unavailable"] * len(leads)
