"use client";

import Link from "next/link";
import { useState } from "react";

import { GuestPreviewLead, GuestPreviewUsage, scrapeGuestPreview } from "@/lib/api";

const LIMIT_OPTIONS = [5, 8, 10, 15];

export default function GuestPreview() {
  const [city, setCity] = useState("Miami");
  const [category, setCategory] = useState("Dentist");
  const [limit, setLimit] = useState(8);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [leads, setLeads] = useState<GuestPreviewLead[]>([]);
  const [usage, setUsage] = useState<GuestPreviewUsage | null>(null);

  const onRunPreview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedCity = city.trim();
    const trimmedCategory = category.trim();

    if (!trimmedCity || !trimmedCategory) {
      setError("Please enter both city and industry.");
      return;
    }

    setIsRunning(true);
    setError(null);
    setMessage(null);

    try {
      const result = await scrapeGuestPreview(trimmedCity, trimmedCategory, limit);
      setLeads(result.leads || []);
      setUsage(result.usage || null);
      setMessage(result.message || "Preview complete.");
    } catch (err) {
      const fallback = "Preview failed right now. Please try again or sign in.";
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(fallback);
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-6">
        <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-[0.2em] mb-2">No-Login Preview</p>
        <h2 className="font-display text-3xl tracking-[-0.03em]">Try a real scrape before signing in</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Run a limited Google Maps preview to see output quality. Then use Google login for full workflow.
        </p>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        <div className="card-static p-5">
          <form onSubmit={onRunPreview} className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="field w-full px-3 py-2.5 text-sm"
                placeholder="Miami"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Industry</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="field w-full px-3 py-2.5 text-sm"
                placeholder="Dentist"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Preview size</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="field w-full px-3 py-2.5 text-sm"
                disabled={isRunning}
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} leads
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isRunning}
              className="btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {isRunning ? "Running preview..." : "Run Preview"}
            </button>
          </form>

          {usage && (
            <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3">
              <p className="text-xs text-[var(--text-muted)] mb-1">This month</p>
              <p className="text-xs">Runs left: {usage.jobs_remaining}/{usage.monthly_job_limit}</p>
              <p className="text-xs">Lead credits left: {usage.leads_remaining}/{usage.monthly_lead_limit}</p>
            </div>
          )}

          <div className="mt-4 text-xs text-[var(--text-secondary)]">
            Need full export, saved leads, and agents?{" "}
            <Link href="/login" className="text-[var(--accent)] hover:underline">
              Sign in with Google
            </Link>
            .
          </div>
        </div>

        <div className="card-static p-5">
          {message && <p className="text-xs text-[var(--success)] mb-3">{message}</p>}
          {error && <p className="text-xs text-[var(--error)] mb-3">{error}</p>}
          {!error && leads.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">Run a preview to see sample leads here.</p>
          )}

          <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
            {leads.map((lead, idx) => (
              <article key={`${lead.name}-${idx}`} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3.5">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div>
                    <p className="text-sm font-semibold">{lead.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {lead.category || "Business"} in {lead.city || "Unknown city"}
                    </p>
                  </div>
                  <span className="tag text-[10px] font-mono">Score {lead.lead_score || 0}</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {(lead.rating ?? 0).toFixed(1)} stars · {lead.reviews ?? 0} reviews
                </p>
                {lead.reason && <p className="text-xs text-[var(--accent)] mt-2">{lead.reason}</p>}
                {lead.ai_outreach && <p className="text-xs text-[var(--text-secondary)] mt-2">{lead.ai_outreach}</p>}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
