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
    <div className="card-static p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.02em]">Quick Scrape</h3>
          <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Single target</p>
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
            className="field w-full px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none"
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
            className="field w-full px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none"
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Limit</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            disabled={isLoading}
            className="field w-full px-4 py-3 text-sm focus:outline-none"
          >
            <option value={10}>10 leads</option>
            <option value={20}>20 leads</option>
            <option value={50}>50 leads</option>
            <option value={100}>100 leads</option>
          </select>
        </div>
        {localError && (
          <p className="text-xs text-[var(--error)]">{localError}</p>
        )}
        <button
          type="submit"
          disabled={isLoading || !city.trim() || !category.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 px-5 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Scraping...</span>
            </>
          ) : (
            <>
              <span>Run Scraper</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
