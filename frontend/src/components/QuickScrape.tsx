"use client";

import { useState } from "react";

interface QuickScrapeProps {
  onScrape: (city: string, category: string, limit: number) => Promise<boolean | void> | boolean | void;
  isLoading?: boolean;
}

export default function QuickScrape({ onScrape, isLoading }: QuickScrapeProps) {
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState(50);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const trimmedCity = city.trim();
    const trimmedCategory = category.trim();

    if (!trimmedCity || !trimmedCategory) {
      setLocalError("Please add both city and industry.");
      return;
    }

    try {
      const result = await onScrape(trimmedCity, trimmedCategory, limit);
      if (result !== false) {
        setCity("");
        setCategory("");
      }
    } catch {
      setLocalError("Unable to queue scrape right now.");
    }
  };

  return (
    <div className="glass-glow rounded-2xl p-7 relative overflow-hidden transition-all hover:-translate-y-1 group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent-indigo)] to-[var(--accent-violet)] opacity-50" />
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--accent-indigo)]/20 to-[var(--accent-violet)]/20 border border-[var(--border-highlight)] shadow-[0_0_15px_var(--glow-indigo)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_white]">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Quick Scrape</h3>
          <p className="font-mono text-[10px] text-[var(--accent-indigo)] font-bold uppercase tracking-widest mt-0.5 drop-shadow-[0_0_8px_var(--glow-indigo)]">Single target</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., London, UK"
            disabled={isLoading}
            className="w-full px-4 py-3 text-sm bg-black/40 border border-[var(--border-secondary)] rounded-xl text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all"
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Industry</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Dentist"
            disabled={isLoading}
            className="w-full px-4 py-3 text-sm bg-black/40 border border-[var(--border-secondary)] rounded-xl text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all"
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Limit</label>
          <div className="relative">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm bg-black/40 border border-[var(--border-secondary)] rounded-xl text-white focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all appearance-none"
            >
              <option value={10}>10 leads</option>
              <option value={20}>20 leads</option>
              <option value={50}>50 leads</option>
              <option value={100}>100 leads</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
        {localError && (
          <p className="text-xs text-[var(--error)]">{localError}</p>
        )}
        <button
          type="submit"
          disabled={isLoading || !city.trim() || !category.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 px-5 mt-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_var(--glow-indigo)] hover:shadow-[0_0_30px_var(--glow-violet)]"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 drop-shadow-[0_0_8px_white]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Scraping...</span>
            </>
          ) : (
            <>
              <span>Run Scraper</span>
              <svg className="w-5 h-5 drop-shadow-[0_0_8px_white]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
