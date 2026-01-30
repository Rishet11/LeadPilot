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
    <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4">Quick Scrape</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-[var(--foreground-muted)] mb-1">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., London, UK"
            className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--foreground-muted)] mb-1">Industry</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Dentist"
            className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--foreground-muted)] mb-1">Limit</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent)]"
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
          className="w-full py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {isLoading ? "Scraping..." : "Run Scraper →"}
        </button>
      </form>
    </div>
  );
}
