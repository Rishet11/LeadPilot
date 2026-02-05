"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { scrapeInstagram, getSettings, getJobs, getLeads, Setting, Job, Lead } from "@/lib/api";

const NICHES = [
  "Dentist", "Salon", "Gym", "Restaurant", "Cafe", "Bakery",
  "Photographer", "Yoga", "Plumber", "Electrician", "Mechanic", "Lawyer",
  "Spa", "Veterinary", "Interior Designer", "Academy",
];

const SUGGESTED_NICHES = ["Dentist", "Salon", "Gym", "Restaurant", "Cafe", "Bakery"];

// Bio-optimized keywords — terms small businesses actually put in their IG bios
const BIO_KEYWORDS: Record<string, string[]> = {
  Dentist: ["dental clinic", "family dentist", "cosmetic dentistry", "teeth whitening", "orthodontist"],
  Salon: ["hair stylist", "bridal makeup", "unisex salon", "beauty parlour", "hairdresser"],
  Gym: ["fitness studio", "personal trainer", "crossfit box", "strength training", "fitness coach"],
  Restaurant: ["family restaurant", "fine dining", "cloud kitchen", "food delivery", "catering service"],
  Cafe: ["coffee shop", "specialty coffee", "brunch spot", "artisan cafe", "tea house"],
  Bakery: ["home baker", "custom cakes", "artisan bread", "cake artist", "pastry chef"],
  Photographer: ["wedding photographer", "portrait photographer", "newborn photography", "event photographer", "product photographer"],
  Yoga: ["yoga studio", "yoga instructor", "meditation center", "wellness coach", "yoga teacher"],
  Plumber: ["plumbing service", "emergency plumber", "pipe fitting", "water heater repair", "leak repair"],
  Electrician: ["electrical contractor", "home electrician", "wiring specialist", "electrical repair", "solar installer"],
  Mechanic: ["auto repair", "car mechanic", "garage service", "mobile mechanic", "car detailing"],
  Lawyer: ["law firm", "legal advisor", "family lawyer", "criminal lawyer", "immigration consultant"],
  Spa: ["wellness spa", "massage therapist", "skin clinic", "beauty spa", "ayurvedic spa"],
  Veterinary: ["vet clinic", "animal hospital", "pet care", "dog grooming", "pet boarding"],
  "Interior Designer": ["home decor", "interior stylist", "space planner", "home renovation", "modular kitchen"],
  Academy: ["coaching center", "tuition classes", "skill academy", "training institute", "online classes"],
};

const POLL_INTERVAL_MS = 5000;

interface Target {
  keyword: string;
  limit: number;
  followers_min?: number;
  followers_max?: number;
  score_threshold?: number;
}

export default function InstagramPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("");
  const [limit, setLimit] = useState(50);
  const [followersMin, setFollowersMin] = useState<number | undefined>(undefined);
  const [followersMax, setFollowersMax] = useState<number | undefined>(undefined);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeNiche, setActiveNiche] = useState<string | null>(null);

  const [globalDefaults, setGlobalDefaults] = useState({ min: 500, max: 5000 });

  // Job tracking state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  // Results preview state
  const [previewLeads, setPreviewLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<"jobs" | "results">("jobs");
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    getSettings().then((settings: Setting[]) => {
      const minSetting = settings.find(s => s.key === "instagram_followers_min");
      const maxSetting = settings.find(s => s.key === "instagram_followers_max");
      setGlobalDefaults({
        min: minSetting ? parseInt(minSetting.value) : 500,
        max: maxSetting ? parseInt(maxSetting.value) : 5000,
      });
    }).catch(() => {});
  }, []);

  // Poll jobs
  const loadJobs = useCallback(async () => {
    try {
      const allJobs = await getJobs(20);
      setJobs(allJobs.filter(j => j.job_type === "instagram"));
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadJobs]);

  // Load results on-demand
  useEffect(() => {
    if (activeTab === "results" && previewLeads.length === 0) {
      setResultsLoading(true);
      getLeads({ source: "instagram", limit: 10 })
        .then(setPreviewLeads)
        .catch(() => setPreviewLeads([]))
        .finally(() => setResultsLoading(false));
    }
  }, [activeTab, previewLeads.length]);

  const hasRunningJob = jobs.some(j => j.status === "running");

  const combinedKeyword = city ? `${keyword} ${city}`.trim() : keyword.trim();

  const addTarget = () => {
    if (!keyword.trim()) return;
    const newTarget: Target = { keyword: combinedKeyword, limit };
    if (useCustomRange) {
      newTarget.followers_min = followersMin;
      newTarget.followers_max = followersMax;
    }
    setTargets([...targets, newTarget]);
    setKeyword("");
    setActiveNiche(null);
    setLimit(50);
    // City NOT cleared — enables multi-niche same-city workflow
  };

  const removeTarget = (index: number) => {
    setTargets(targets.filter((_, i) => i !== index));
  };

  const parseAndAdd = () => {
    const lines = pasteText.split("\n").filter((line) => line.trim());
    const newTargets: Target[] = [];

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      const [keywordPart, limitPart, minPart, maxPart] = parts;
      if (keywordPart) {
        const target: Target = {
          keyword: keywordPart,
          limit: limitPart ? parseInt(limitPart) || 50 : 50,
        };
        if (minPart) target.followers_min = parseInt(minPart) || undefined;
        if (maxPart) target.followers_max = parseInt(maxPart) || undefined;
        newTargets.push(target);
      }
    }

    if (newTargets.length > 0) {
      setTargets([...targets, ...newTargets]);
      setPasteText("");
    }
  };

  const runBatch = async () => {
    if (targets.length === 0) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await scrapeInstagram(targets);
      setMessage({
        type: "success",
        text: `Instagram job started. Job ID: ${result.job_id}. Processing ${targets.length} keywords.`,
      });
      setTargets([]);
      setTimeout(loadJobs, 2000);
    } catch (err) {
      setMessage({
        type: "error",
        text: "Failed to start Instagram scrape. Make sure the API is running.",
      });
      console.error("Failed to start Instagram scrape:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNicheClick = (niche: string) => {
    setKeyword(niche.toLowerCase());
    setActiveNiche(niche);
  };

  const handleSuggestedCombo = (niche: string) => {
    const combo = `${niche.toLowerCase()} ${city}`.trim();
    const newTarget: Target = { keyword: combo, limit };
    if (useCustomRange) {
      newTarget.followers_min = followersMin;
      newTarget.followers_max = followersMax;
    }
    setTargets([...targets, newTarget]);
  };

  const isComboQueued = (niche: string) => {
    const combo = `${niche.toLowerCase()} ${city}`.trim().toLowerCase();
    return targets.some(t => t.keyword.toLowerCase() === combo);
  };

  const formatDate = (dateStr: string) => {
    const utcStr = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
    const date = new Date(utcStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-[var(--success-dim)] text-[var(--success)]";
      case "running":
        return "bg-[var(--accent-dim)] text-[var(--accent)]";
      case "failed":
        return "bg-[var(--error-dim)] text-[var(--error)]";
      default:
        return "bg-[var(--warning-dim)] text-[var(--warning)]";
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-[var(--success)]";
      case "running":
        return "bg-[var(--accent)]";
      case "failed":
        return "bg-[var(--error)]";
      default:
        return "bg-[var(--warning)]";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-[var(--success)]";
    if (score >= 50) return "bg-[var(--warning)]";
    return "bg-[var(--text-muted)]";
  };

  return (
    <div className="stagger-children">
      {/* Title + Live running indicator */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-[10px] text-[var(--accent)] tracking-[0.2em] uppercase mb-1">Social</p>
          <h1 className="font-display text-2xl text-[var(--text-primary)] tracking-[-0.02em]">Instagram</h1>
        </div>
        {hasRunningJob && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-dim)] border border-[var(--accent)]/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
            </span>
            <span className="font-mono text-[10px] text-[var(--accent)]">Running</span>
          </div>
        )}
      </div>

      {/* Message alert */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-[var(--success-dim)] border border-[var(--success)]/20 text-[var(--success)]"
              : "bg-[var(--error-dim)] border border-[var(--error)]/20 text-[var(--error)]"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Niche Templates Grid */}
      <div className="mb-5 card-static p-5">
        <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-3">Quick Niches</p>
        <div className="flex flex-wrap gap-2">
          {NICHES.map((niche) => (
            <button
              key={niche}
              onClick={() => handleNicheClick(niche)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                activeNiche === niche
                  ? "bg-[var(--accent)] text-black border-[var(--accent)]"
                  : "bg-[var(--surface-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]"
              }`}
            >
              {niche}
            </button>
          ))}
        </div>
      </div>

      {/* Bio-Optimized Keywords (visible when niche is selected) */}
      {activeNiche && BIO_KEYWORDS[activeNiche] && (
        <div className="mb-5 card-static p-5">
          <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Bio keywords for {activeNiche}
          </p>
          <p className="text-[11px] text-[var(--text-dim)] mb-3">Terms businesses use in their Instagram bios</p>
          <div className="flex flex-wrap gap-2">
            {BIO_KEYWORDS[activeNiche].map((term) => {
              const termWithCity = city ? `${term} ${city}`.trim() : term;
              const alreadyQueued = targets.some(t => t.keyword.toLowerCase() === termWithCity.toLowerCase());
              return (
                <button
                  key={term}
                  onClick={() => {
                    if (alreadyQueued) return;
                    setKeyword(term);
                  }}
                  disabled={alreadyQueued}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    keyword === term
                      ? "bg-[var(--accent)] text-black border-[var(--accent)]"
                      : alreadyQueued
                        ? "opacity-40 cursor-not-allowed bg-[var(--surface-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]"
                        : "bg-[var(--surface-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]"
                  }`}
                >
                  {term}
                </button>
              );
            })}
            <button
              onClick={() => {
                const terms = BIO_KEYWORDS[activeNiche];
                const newTargets: Target[] = [];
                for (const term of terms) {
                  const full = city ? `${term} ${city}`.trim() : term;
                  if (!targets.some(t => t.keyword.toLowerCase() === full.toLowerCase())) {
                    const t: Target = { keyword: full, limit };
                    if (useCustomRange) {
                      t.followers_min = followersMin;
                      t.followers_max = followersMax;
                    }
                    newTargets.push(t);
                  }
                }
                if (newTargets.length > 0) setTargets([...targets, ...newTargets]);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-dashed border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)]"
            >
              + Add all
            </button>
          </div>
        </div>
      )}

      {/* Suggested Combos (visible when city is entered) */}
      {city.trim() && (
        <div className="mb-5 card-static p-5">
          <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Suggested for {city}
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_NICHES.map((niche) => {
              const queued = isComboQueued(niche);
              return (
                <button
                  key={niche}
                  onClick={() => !queued && handleSuggestedCombo(niche)}
                  disabled={queued}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    queued
                      ? "opacity-40 cursor-not-allowed bg-[var(--surface-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]"
                      : "bg-[var(--surface-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]"
                  }`}
                >
                  {niche} + {city}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Keyword + Quick Paste */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-static p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.02em]">Add Keyword</h3>
              <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Single entry</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Niche</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setActiveNiche(null);
                }}
                placeholder="e.g., makeup artist"
                className="field w-full px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">City <span className="text-[var(--text-dim)] font-normal normal-case">(optional)</span></label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., london"
                className="field w-full px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Limit</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="field w-full px-4 py-3 text-sm focus:outline-none"
              >
                <option value={10}>10 profiles</option>
                <option value={20}>20 profiles</option>
                <option value={50}>50 profiles</option>
                <option value={100}>100 profiles</option>
              </select>
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomRange}
                  onChange={(e) => setUseCustomRange(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-[var(--accent)]"
                />
                <span className="text-xs text-[var(--text-muted)]">Custom follower range</span>
              </label>

              {useCustomRange && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block font-mono text-[10px] text-[var(--text-dim)] mb-1">Min</label>
                    <input
                      type="number"
                      value={followersMin ?? ""}
                      onChange={(e) => setFollowersMin(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={String(globalDefaults.min)}
                      className="field w-full px-3 py-2 text-xs placeholder:text-[var(--text-dim)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-[var(--text-dim)] mb-1">Max</label>
                    <input
                      type="number"
                      value={followersMax ?? ""}
                      onChange={(e) => setFollowersMax(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={String(globalDefaults.max)}
                      className="field w-full px-3 py-2 text-xs placeholder:text-[var(--text-dim)] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={addTarget}
              disabled={!keyword.trim()}
              className="btn-secondary w-full py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Add to Queue
            </button>
          </div>
        </div>

        <div className="card-static p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.02em]">Quick Paste</h3>
              <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Bulk import</p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Format: <code className="text-[var(--text-primary)] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded">keyword, limit, min, max</code>
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`makeup artist london, 50\nhome baker mumbai, 30, ${globalDefaults.min}, ${globalDefaults.max}\npersonal trainer sydney, 20, 1000, 10000`}
            rows={6}
            className="field w-full px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none resize-none font-mono"
          />
          <button
            onClick={parseAndAdd}
            disabled={!pasteText.trim()}
            className="mt-4 btn-secondary w-full py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Parse & Add
          </button>
        </div>
      </div>

      {/* Queue + Run button */}
      <div className="mt-6 card-static p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.02em]">Queue</h3>
              <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{targets.length} keywords</p>
            </div>
          </div>
          {targets.length > 0 && (
            <span className="tag tag-gold font-mono text-[10px]">Ready</span>
          )}
        </div>

        {targets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[var(--text-muted)] text-sm mb-1">No keywords in queue</p>
            <p className="text-[var(--text-dim)] text-xs">Add keywords above to get started</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {targets.map((target, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-mono text-[10px] text-[var(--text-dim)] w-6">#{index + 1}</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {target.keyword}
                  </span>
                  <span className="tag tag-gold font-mono text-[10px]">{target.limit} profiles</span>
                  {(target.followers_min || target.followers_max) && (
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      {target.followers_min ?? globalDefaults.min}-{target.followers_max ?? globalDefaults.max}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeTarget(index)}
                  className="text-[var(--text-muted)] hover:text-[var(--error)] transition-colors text-xs font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={runBatch}
          disabled={targets.length === 0 || isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Run Batch ({targets.length} keywords)</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Tabs: Jobs | Top Results */}
      <div className="mt-6 card-static p-6">
        <div className="flex items-center gap-1 mb-5 border-b border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "jobs"
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Jobs
            {activeTab === "jobs" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "results"
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Top Results
            {activeTab === "results" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
            )}
          </button>
        </div>

        {activeTab === "jobs" && (
          <>
            {jobsLoading ? (
              <p className="text-[var(--text-muted)] text-sm py-6 text-center">Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm py-6 text-center">No Instagram jobs yet. Run a batch to get started.</p>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(job.status)} ${job.status === "running" ? "animate-pulse" : ""}`} />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          Job #{job.id}
                        </p>
                        <p className="font-mono text-[10px] text-[var(--text-muted)]">
                          {job.leads_found} leads found
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-medium ${getStatusPill(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--text-dim)] min-w-[55px] text-right">
                        {formatDate(job.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "results" && (
          <>
            {resultsLoading ? (
              <p className="text-[var(--text-muted)] text-sm py-6 text-center">Loading results...</p>
            ) : previewLeads.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm py-6 text-center">No Instagram leads yet.</p>
            ) : (
              <div className="space-y-2">
                {previewLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {lead.instagram && (
                          <a
                            href={`https://instagram.com/${lead.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-[var(--accent)] hover:underline"
                          >
                            @{lead.instagram}
                          </a>
                        )}
                        {!lead.instagram && (
                          <span className="text-sm font-medium text-[var(--text-primary)]">{lead.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-[var(--surface-card)] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getScoreColor(lead.lead_score)}`}
                            style={{ width: `${lead.lead_score}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-[var(--text-muted)] w-6">{lead.lead_score}</span>
                      </div>
                    </div>
                    {lead.reason && (
                      <p className="text-[11px] text-[var(--text-muted)] mb-1">{lead.reason}</p>
                    )}
                    {lead.ai_outreach && (
                      <p className="text-[11px] text-[var(--text-dim)] truncate">
                        <span className="text-[var(--text-primary)] font-medium">DM:</span> {lead.ai_outreach}
                      </p>
                    )}
                  </div>
                ))}
                <Link
                  href="/leads"
                  className="block text-center text-xs text-[var(--accent)] hover:underline py-2"
                >
                  View all leads →
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tips */}
      <div className="mt-6 card-static p-5">
        <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-wider mb-3">
          Tips
        </p>
        <ul className="text-xs text-[var(--text-secondary)] space-y-2 leading-relaxed">
          <li>Click a niche above to quickly fill the keyword field</li>
          <li>Enter a city to see suggested niche + city combos</li>
          <li>Use location + profession: &quot;makeup artist london&quot;</li>
          <li>Adjust follower range per niche (bakers: {globalDefaults.min}-{globalDefaults.max}, trainers: 1000-10000)</li>
          <li>Default range: {globalDefaults.min}-{globalDefaults.max} (change in Settings)</li>
        </ul>
      </div>
    </div>
  );
}
