"""
Batch Processor - Run multiple cities/categories in one go

Useful for scaling lead generation across multiple markets.
"""

import json
import time
from datetime import datetime
from main import run_pipeline


def load_batch_config(config_path: str = "batch_config.json") -> dict:
    """Load batch processing configuration."""
    with open(config_path, "r") as f:
        return json.load(f)


def run_batch(batch_config: dict):
    """
    Run pipeline for multiple city/category combinations.
    
    Args:
        batch_config: Dict with 'targets' list
    """
    targets = batch_config.get("targets", [])
    
    print(f"\n{'='*60}")
    print(f"🔄 BATCH PROCESSING - {len(targets)} targets")
    print(f"{'='*60}\n")
    
    results = []
    import pandas as pd
    
    # Store all dataframes
    all_dfs = []
    
    for i, target in enumerate(targets, 1):
        city = target.get("city")
        category = target.get("category")
        limit = target.get("limit", 50)
        
        print(f"\n[{i}/{len(targets)}] Processing: {category} in {city}")
        print("-" * 60)
        
        try:
            df = run_pipeline(
                city=city,
                category=category,
                limit=limit,
                dry_run=target.get("dry_run", False),
                agent_mode=target.get("agent_mode", True)
            )
            
            if not df.empty:
                all_dfs.append(df)
            
            results.append({
                "city": city,
                "category": category,
                "status": "success",
                "leads": len(df),
                "high_quality": len(df[df['lead_score'] >= 70]) if 'lead_score' in df.columns else 0
            })
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            results.append({
                "city": city,
                "category": category,
                "status": "failed",
                "error": str(e)
            })
    
    # Save Combined CSV
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if all_dfs:
        combined_df = pd.concat(all_dfs, ignore_index=True)
        combined_path = f"data/batch_leads_{timestamp}.csv"
        
        # Use exporter to ensure correct columns
        from exporter import export_csv
        export_csv(combined_df, combined_path)
        export_csv(combined_df, "data/leads.csv") # Update latest
        
        print(f"\n🌎 MERGED OUTPUT SAVED: {combined_path} ({len(combined_df)} total leads)")
    
    # Print summary
    print(f"\n{'='*60}")
    print("📊 BATCH SUMMARY")
    print(f"{'='*60}")
    
    successful = [r for r in results if r['status'] == 'success']
    failed = [r for r in results if r['status'] == 'failed']
    
    print(f"\n✅ Successful: {len(successful)}/{len(targets)}")
    print(f"❌ Failed: {len(failed)}/{len(targets)}")
    
    if successful:
        total_leads = sum(r['leads'] for r in successful)
        total_high_quality = sum(r['high_quality'] for r in successful)
        print(f"\n📈 Total leads: {total_leads}")
        print(f"🏆 High quality: {total_high_quality}")
    
    # Save results json
    results_file = f"data/batch_results_{timestamp}.json"
    
    with open(results_file, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📁 Stats saved to: {results_file}")
    
    return results


if __name__ == "__main__":
    import sys
    
    config_file = sys.argv[1] if len(sys.argv) > 1 else "batch_config.json"
    
    try:
        config = load_batch_config(config_file)
        run_batch(config)
    except FileNotFoundError:
        print(f"❌ Config file not found: {config_file}")
        print("\nCreate a batch_config.json file. See README for format.")

