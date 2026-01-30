"use client";

import { useState } from "react";

interface QuickScrapeProps {
  onScrape: (city: string, category: string, limit: number) => void;
  isLoading?: boolean;
}

export default function QuickScrape({ onScrape, isLoading }: QuickScrapeProps) {
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState(50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city && category) {
      onScrape(city, category, limit);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--fg-primary)] tracking-[-0.025em]">Quick Scrape</h3>
          <p className="text-[11px] text-[var(--fg-muted)]">Single target scan</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., London, UK"
            className="field-inset w-full px-4 py-2.5 text-sm text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Industry</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Dentist"
            className="field-inset w-full px-4 py-2.5 text-sm text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Limit</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="field-inset w-full px-4 py-2.5 text-sm text-[var(--fg-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
          >
            <option value={10}>10 leads</option>
            <option value={20}>20 leads</option>
            <option value={50}>50 leads</option>
            <option value={100}>100 leads</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isLoading || !city || !category}
          className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] hover:-translate-y-px hover:shadow-[0_0_20px_var(--accent-glow)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all duration-150"
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
