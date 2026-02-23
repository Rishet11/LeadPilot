"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { GuestPreviewLead, GuestPreviewUsage, getUserFacingApiError, pingApiHealth, scrapeGuestPreview } from "@/lib/api";

const LIMIT_OPTIONS = [
  { value: 5, label: "5 records (fastest)" },
  { value: 8, label: "8 records (balanced)" },
  { value: 10, label: "10 records (slower)" },
  { value: 15, label: "15 records (slowest)" },
];

function buildInstantFallbackLeads(city: string, category: string, limit: number): GuestPreviewLead[] {
  const baseNames = [
    `${city} ${category} Center`,
    `Downtown ${category} Studio`,
    `${city} Family ${category}`,
    `${category} Hub ${city}`,
    `Prime ${category} ${city}`,
  ];
  const reasons = [
    "High review activity with missing website metadata.",
    "Strong local visibility with incomplete public profile fields.",
    "Category has demand but inconsistent business information online.",
    "Good profile with low recent review momentum.",
    "Record has strong ranking signals with limited structured details.",
  ];

  const count = Math.max(1, Number(limit || 5));
  return Array.from({ length: count }, (_, idx) => {
    const name = baseNames[idx % baseNames.length];
    return {
      name,
      city,
      category,
      rating: Number((3.8 + (idx % 5) * 0.2).toFixed(1)),
      reviews: 18 + idx * 9,
      website: idx % 2 === 0 ? `https://${name.toLowerCase().replace(/\s+/g, "")}.com` : null,
      maps_url: null,
      lead_score: Math.max(55, 82 - idx * 4),
      reason: reasons[idx % reasons.length],
      ai_outreach: `Sample note for ${name}: listing metadata is present, but profile completeness can be improved.`,
    };
  });
}

export default function GuestPreview() {
  const [city, setCity] = useState("Miami");
  const [category, setCategory] = useState("Dentist");
  const [limit, setLimit] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [leads, setLeads] = useState<GuestPreviewLead[]>([]);
  const [usage, setUsage] = useState<GuestPreviewUsage | null>(null);
  const [lastDurationSeconds, setLastDurationSeconds] = useState<number | null>(null);
  const [executionMode, setExecutionMode] = useState<"live" | "demo" | null>(null);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  const expectedRuntime = useMemo(() => {
    if (limit <= 5) return "5-12s";
    if (limit <= 8) return "10-20s";
    if (limit <= 10) return "15-30s";
    return "25-45s";
  }, [limit]);

  const runningStage = useMemo(() => {
    if (elapsedSeconds < 4) return "Initializing preview...";
    if (elapsedSeconds < 10) return "Collecting public listings...";
    if (elapsedSeconds < 18) return "Scoring records...";
    return "Finalizing output...";
  }, [elapsedSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    let active = true;
    pingApiHealth()
      .then((healthy) => {
        if (active) {
          setApiHealthy(healthy);
        }
      })
      .catch(() => {
        if (active) {
          setApiHealthy(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const onRunPreview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedCity = city.trim();
    const trimmedCategory = category.trim();
    const startedAt = Date.now();

    if (!trimmedCity || !trimmedCategory) {
      setError("Please enter both city and query.");
      return;
    }

    setIsRunning(true);
    setElapsedSeconds(0);
    setLastDurationSeconds(null);
    setError(null);
    setMessage(null);
    setExecutionMode(null);
    setDataSource(null);
    setFallbackReason(null);

    try {
      const healthOk = await pingApiHealth(2200);
      setApiHealthy(healthOk);
      if (!healthOk) {
        setLeads(buildInstantFallbackLeads(trimmedCity, trimmedCategory, limit));
        setUsage(null);
        setExecutionMode("demo");
        setDataSource("fallback_error");
        setFallbackReason("api_unreachable");
        setMessage("Backend is unreachable. Showing instant demo mode results.");
        setLastDurationSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
        return;
      }

      const result = await scrapeGuestPreview(trimmedCity, trimmedCategory, limit);
      setLeads(result.leads || []);
      setUsage(result.usage || null);
      setMessage(result.message || "Preview complete.");
      setExecutionMode(result.execution_mode === "demo" ? "demo" : "live");
      setDataSource(result.data_source || null);
      setFallbackReason(result.fallback_reason || null);
      setApiHealthy(true);
      setLastDurationSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
    } catch (err) {
      const fallback = "Preview failed right now. Please try again in a few seconds.";
      const friendly = getUserFacingApiError(err, fallback);
      const normalized = friendly.toLowerCase();
      const canFallback =
        normalized.includes("took too long") ||
        normalized.includes("timed out") ||
        normalized.includes("network error") ||
        normalized.includes("backend is likely not running") ||
        normalized.includes("backend is not reachable");

      if (canFallback) {
        setLeads(buildInstantFallbackLeads(trimmedCity, trimmedCategory, limit));
        setUsage(null);
        setExecutionMode("demo");
        setDataSource("fallback_error");
        setFallbackReason("client_network_fallback");
        setApiHealthy(false);
        setError(null);
        setMessage("Preview loaded in instant demo mode. Start backend to see live preview data.");
        setLastDurationSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
      } else {
        setExecutionMode(null);
        setDataSource(null);
        setFallbackReason(null);
        setError(friendly);
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="w-full">
      <div className="grid lg:grid-cols-[340px_1fr] gap-6">
        {/* Controls */}
        <div className="glass-glow rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent-indigo)] to-transparent opacity-80" />
          <form onSubmit={onRunPreview} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] transition-all outline-none shadow-inner"
                placeholder="e.g. Austin, TX"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Query</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] transition-all outline-none shadow-inner"
                placeholder="e.g. HVAC"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Data Limit</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] transition-all outline-none appearance-none shadow-inner"
                disabled={isRunning}
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-2">
                Expected runtime: ~{expectedRuntime}
              </p>
            </div>

            <button
              type="submit"
              disabled={isRunning}
              className="w-full btn-primary rounded-xl px-4 py-4 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-[0_0_20px_var(--glow-indigo)]"
            >
              {isRunning ? `Running... ${elapsedSeconds}s` : "Run Data Preview"}
            </button>
            {!isRunning && (
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1 text-center">
                Tip: Use 5 records for the fastest preview.
              </p>
            )}
          </form>

          {usage && (
            <div className="mt-6 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-4 text-xs">
              <p className="text-[var(--text-secondary)] mb-2 uppercase tracking-wider text-[10px] font-semibold">Preview Usage</p>
              <div className="flex justify-between items-center text-[var(--text-primary)] mb-1">
                 <span>Queries:</span>
                 <span className="font-mono">{usage.jobs_remaining} / {usage.monthly_job_limit}</span>
              </div>
              <div className="flex justify-between items-center text-[var(--text-primary)]">
                 <span>Records Extracted:</span>
                 <span className="font-mono">{usage.leads_remaining} / {usage.monthly_lead_limit}</span>
              </div>
            </div>
          )}
        </div>

        {/* Output Console */}
        <div className="glass rounded-3xl flex flex-col overflow-hidden relative min-h-[400px] border-[var(--border-highlight)] shadow-[0_0_30px_var(--glow-violet)]">
          {/* Header */}
          <div className="h-12 border-b border-[var(--border-secondary)] bg-[var(--bg-primary)]/80 flex items-center justify-between px-4 shrink-0">
             <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
             </div>
             <div className="text-[10px] font-mono text-[var(--text-tertiary)] bg-black/50 px-2.5 py-1 rounded shadow-inner border border-[var(--border-secondary)]">
                output.csv
             </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col bg-[var(--bg-primary)]/50 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0wIDBMMCA0MEw0MCA0MEw0MCAwTDAgMFoiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMSkiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] relative">
              
              {message && <p className="text-xs text-[#00FF66] font-mono mb-4 bg-[#00FF66]/10 border border-[#00FF66]/20 inline-block px-3 py-1.5 rounded-md">{message}</p>}
              {error && <p className="text-xs text-red-400 font-mono mb-4 bg-red-400/10 border border-red-400/20 inline-block px-3 py-1.5 rounded-md">{error}</p>}
              {(executionMode || dataSource || fallbackReason || apiHealthy !== null) && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {executionMode && (
                    <span
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-md border uppercase tracking-wider ${
                        executionMode === "live"
                          ? "text-[var(--success)] bg-[var(--success-dim)] border-[var(--success)]/30"
                          : "text-[var(--warning)] bg-[var(--warning-dim)] border-[var(--warning)]/30"
                      }`}
                    >
                      {executionMode} mode
                    </span>
                  )}
                  {dataSource && (
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-md border border-[var(--border-secondary)] bg-black/40 text-[var(--text-secondary)]">
                      source: {dataSource.replace(/_/g, " ")}
                    </span>
                  )}
                  {fallbackReason && (
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-md border border-[var(--border-secondary)] bg-black/40 text-[var(--text-dim)]">
                      reason: {fallbackReason.replace(/_/g, " ")}
                    </span>
                  )}
                  {apiHealthy !== null && (
                    <span
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-md border ${
                        apiHealthy
                          ? "text-[var(--success)] bg-[var(--success-dim)] border-[var(--success)]/20"
                          : "text-[var(--warning)] bg-[var(--warning-dim)] border-[var(--warning)]/20"
                      }`}
                    >
                      API: {apiHealthy ? "reachable" : "offline"}
                    </span>
                  )}
                </div>
              )}
              {!isRunning && lastDurationSeconds !== null && (
                <p className="text-[11px] text-[var(--text-tertiary)] font-mono mb-3">
                  Last run completed in {lastDurationSeconds}s.
                </p>
              )}
              
              {isRunning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-primary)]/80 backdrop-blur-sm z-10">
                   <div className="w-10 h-10 rounded-full border-2 border-[var(--accent-violet)]/30 border-t-[var(--accent-indigo)] animate-spin mb-4 shadow-[0_0_15px_var(--glow-indigo)]" />
                   <p className="text-xs text-[var(--accent-indigo)] font-mono animate-pulse font-bold tracking-wider uppercase">{runningStage}</p>
                   <p className="text-[10px] text-[var(--text-tertiary)] mt-2 font-mono">
                     elapsed {elapsedSeconds}s • expected ~{expectedRuntime}
                   </p>
                </div>
              )}

              {!error && leads.length === 0 && !isRunning && (
                <div className="absolute inset-0 flex items-center justify-center flex-col text-center p-6">
                   <p className="text-sm text-[var(--text-tertiary)] font-mono">Awaiting query parameters...</p>
                </div>
              )}

              {/* Data List container with horizontal scrolling for mobile */}
              <div className="flex-1 overflow-auto overflow-x-auto pr-2 space-y-3 pb-4">
                {leads.map((lead, idx) => (
                  <article key={`${lead.name}-${idx}`} className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)]/50 p-4 hover:border-[var(--accent-indigo)] transition-all min-w-[280px]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{lead.name}</p>
                        <p className="text-[11px] text-[var(--text-tertiary)] font-mono mt-0.5 truncate uppercase tracking-widest">
                          {lead.category || "Entity"} • {lead.city || "Unknown"}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-[var(--accent-indigo)]/20 text-[var(--accent-indigo)] px-2 py-1 rounded shadow-inner border border-[var(--accent-indigo)]/30 whitespace-nowrap">
                         SCORE {lead.lead_score || 0}
                      </span>
                    </div>
                    
                    <div className="flex gap-4 mb-3">
                       <p className="text-[10px] text-[var(--text-secondary)] font-mono flex items-center gap-1.5">
                         <span className="text-yellow-500">★</span> {(lead.rating ?? 0).toFixed(1)} ({lead.reviews ?? 0} rev)
                       </p>
                    </div>

                    {lead.reason && (
                       <div className="mt-2 text-[11px] text-[var(--text-secondary)] font-mono bg-[#030712] border border-[var(--border-secondary)] p-2.5 rounded-md relative pl-7 leading-relaxed shadow-inner">
                          <span className="absolute left-2.5 top-2.5 text-[var(--accent-violet)]">&gt;</span>
                          <span className="text-[var(--accent-indigo)] font-semibold">Signal:</span> {lead.reason}
                       </div>
                    )}
                  </article>
                ))}
              </div>

              {!error && leads.length > 0 && !isRunning && (
                <div className="mt-4 pt-4 border-t border-[var(--border-secondary)] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Want full structured exports?
                  </p>
                  <Link href="/login" className="whitespace-nowrap inline-flex items-center justify-center bg-white text-black text-xs font-semibold px-5 py-2 rounded-md hover:bg-gray-200 transition-colors shadow-lg">
                    Open Full Workspace
                  </Link>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
