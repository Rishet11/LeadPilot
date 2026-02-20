"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  scrapeInstagram,
  getSettings,
  getJobs,
  getLeads,
  getCurrentPlan,
  getUserFacingApiError,
  Setting,
  Job,
  Lead,
  CurrentPlan,
} from "@/lib/api";

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
const MESSAGE_TIMEOUT_MS = 4500;
const STALE_AFTER_MS = 30000;

interface Target {
  keyword: string;
  limit: number;
  followers_min?: number;
  followers_max?: number;
  score_threshold?: number;
}

function normalizeTarget(raw: Target): Target | null {
  const keyword = raw.keyword.trim();
  if (!keyword) {
    return null;
  }

  const limit = Math.max(1, Math.min(200, Number(raw.limit) || 50));
  const followersMin = Number.isFinite(raw.followers_min) ? Number(raw.followers_min) : undefined;
  const followersMax = Number.isFinite(raw.followers_max) ? Number(raw.followers_max) : undefined;
  const scoreThreshold = Number.isFinite(raw.score_threshold) ? Number(raw.score_threshold) : undefined;

  const normalized: Target = {
    keyword,
    limit,
  };

  if (followersMin !== undefined) {
    normalized.followers_min = Math.max(0, followersMin);
  }
  if (followersMax !== undefined) {
    normalized.followers_max = Math.max(0, followersMax);
  }
  if (
    normalized.followers_min !== undefined &&
    normalized.followers_max !== undefined &&
    normalized.followers_min > normalized.followers_max
  ) {
    const min = normalized.followers_max;
    const max = normalized.followers_min;
    normalized.followers_min = min;
    normalized.followers_max = max;
  }
  if (scoreThreshold !== undefined) {
    normalized.score_threshold = Math.max(0, Math.min(100, scoreThreshold));
  }

  return normalized;
}

function dedupeTargets(items: Target[]): Target[] {
  const map = new Map<string, Target>();
  for (const item of items) {
    const normalized = normalizeTarget(item);
    if (!normalized) continue;
    map.set(normalized.keyword.toLowerCase(), normalized);
  }
  return Array.from(map.values());
}

export default function InstagramPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("");
  const [limit, setLimit] = useState(50);
  const [followersMin, setFollowersMin] = useState<number | undefined>(undefined);
  const [followersMax, setFollowersMax] = useState<number | undefined>(undefined);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeNiche, setActiveNiche] = useState<string | null>(null);

  const [globalDefaults, setGlobalDefaults] = useState({ min: 500, max: 5000 });

  // Job tracking state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [lastJobsUpdatedAt, setLastJobsUpdatedAt] = useState<string | null>(null);
  const [jobsRefreshWarning, setJobsRefreshWarning] = useState<string | null>(null);

  // Results preview state
  const [previewLeads, setPreviewLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<"jobs" | "results">("jobs");
  const [resultsLoading, setResultsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);

  const mergeTargets = (incoming: Target[]) => {
    const merged = dedupeTargets([...targets, ...incoming]);
    const addedCount = Math.max(0, merged.length - targets.length);
    setTargets(merged);
    return addedCount;
  };

  const buildTarget = (rawKeyword: string): Target => {
    const built: Target = {
      keyword: rawKeyword,
      limit,
    };
    if (useCustomRange) {
      built.followers_min = followersMin;
      built.followers_max = followersMax;
    }
    return built;
  };

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

  useEffect(() => {
    getCurrentPlan()
      .then(setCurrentPlan)
      .catch(() => setCurrentPlan(null));
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), MESSAGE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [message]);

  // Poll jobs
  const loadJobs = useCallback(async () => {
    try {
      const allJobs = await getJobs(20);
      setJobs(allJobs.filter(j => j.job_type === "instagram"));
      setLastJobsUpdatedAt(new Date().toISOString());
      setJobsRefreshWarning(null);
    } catch (err) {
      setJobs([]);
      setJobsRefreshWarning(getUserFacingApiError(err, "Live refresh failed. Showing last known jobs."));
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
    const poll = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadJobs();
    };
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (!document.hidden) {
        loadJobs();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
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
    if (!combinedKeyword.trim()) return;
    const added = mergeTargets([buildTarget(combinedKeyword)]);
    if (added === 0) {
      setMessage({ type: "error", text: "Keyword already exists in queue." });
      return;
    }

    setMessage({ type: "success", text: `Added "${combinedKeyword}" to queue.` });
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
      const parts = line
        .replace(/\s*\|\s*/g, ",")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
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
      const added = mergeTargets(newTargets);
      setMessage({
        type: "success",
        text: `Parsed ${newTargets.length} rows. Added ${added} unique keyword(s).`,
      });
      setPasteText("");
    } else {
      setMessage({
        type: "error",
        text: "No valid rows found. Use: keyword, limit, min, max",
      });
    }
  };

  const runBatch = async () => {
    if (targets.length === 0 || (currentPlan && !currentPlan.instagram_enabled)) return;

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
        text: getUserFacingApiError(err, "Failed to start Instagram scrape. Make sure the API is running."),
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
    const added = mergeTargets([buildTarget(combo)]);
    if (added === 0) {
      setMessage({ type: "error", text: `"${combo}" already exists in queue.` });
      return;
    }
    setMessage({ type: "success", text: `Added "${combo}" to queue.` });
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
      case "completed_with_errors":
        return "bg-[var(--warning-dim)] text-[var(--warning)]";
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
      case "completed_with_errors":
        return "bg-[var(--warning)]";
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

  const formatLastUpdated = (isoTime: string | null) => {
    if (!isoTime) return "not synced yet";
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(isoTime).getTime()) / 1000));
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const isStale =
    !lastJobsUpdatedAt || Date.now() - new Date(lastJobsUpdatedAt).getTime() > STALE_AFTER_MS;

  const isInstagramLocked = currentPlan ? !currentPlan.instagram_enabled : false;
  const canRunBatch = !isInstagramLocked && targets.length > 0 && !isLoading;
  const runStateLabel = canRunBatch ? "Ready to run" : "Run button disabled";
  const runStateHint = isInstagramLocked
    ? "Instagram scraping is locked on your current plan."
    : targets.length === 0
      ? "Add at least 1 keyword to enable Run Batch."
      : isLoading
        ? "Queuing your Instagram job..."
        : "Complete required steps above.";

  const clearQueue = () => {
    if (targets.length === 0) return;
    setTargets([]);
    setMessage({ type: "success", text: "Queue cleared." });
  };

  const totalProfileBudget = targets.reduce((sum, target) => sum + target.limit, 0);

  return (
    <div className="stagger-children relative">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-[var(--accent-indigo)] to-[var(--accent-violet)] rounded-full blur-[150px] opacity-10 animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-gradient-to-tl from-[var(--accent-violet)] to-[var(--accent-indigo)] rounded-full blur-[150px] opacity-10" />
      </div>

      {/* Title + Live running indicator */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-[10px] text-[var(--accent-indigo)] drop-shadow-[0_0_8px_var(--glow-indigo)] tracking-widest uppercase mb-1 font-bold">Social</p>
          <h1 className="font-display text-3xl text-white font-bold tracking-tight drop-shadow-md">Instagram</h1>
        </div>
        {hasRunningJob && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--accent-indigo)]/20 to-[var(--accent-violet)]/20 border border-[var(--border-highlight)] shadow-[0_0_15px_var(--glow-indigo)] rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white drop-shadow-[0_0_5px_white]"></span>
            </span>
            <span className="font-mono text-[10px] text-white font-bold uppercase tracking-widest">Running</span>
          </div>
        )}
      </div>
      <div className="mb-6 flex items-center gap-3">
        <p className="text-xs text-[var(--text-secondary)] font-medium">Last synced: <span className="text-white">{formatLastUpdated(lastJobsUpdatedAt)}</span></p>
        {isStale && <span className="font-mono text-[10px] bg-[var(--warning-dim)] border border-[var(--warning)]/20 text-[var(--warning)] px-2 py-0.5 rounded-md drop-shadow-sm uppercase tracking-wider">stale</span>}
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
      {jobsRefreshWarning && (
        <div className="mb-6 p-4 rounded-xl text-sm bg-[var(--warning-dim)] border border-[var(--warning)]/20 text-[var(--warning)]">
          {jobsRefreshWarning}
        </div>
      )}

      {/* Niche Templates Grid */}
      <div className="mb-6 glass-glow rounded-2xl p-6 relative transition-all hover:-translate-y-1">
        <p className="font-mono text-[10px] text-[var(--accent-violet)] drop-shadow-[0_0_8px_var(--glow-violet)] uppercase tracking-widest mb-4 font-bold">Quick Niches</p>
        <div className="flex flex-wrap gap-2">
          {NICHES.map((niche) => (
            <button
              key={niche}
              onClick={() => handleNicheClick(niche)}
              disabled={isLoading}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border shadow-sm ${
                activeNiche === niche
                  ? "bg-gradient-to-br from-[var(--accent-indigo)] to-[var(--accent-violet)] text-white border-transparent shadow-[0_0_15px_var(--glow-indigo)] scale-105"
                  : "bg-black/40 text-[var(--text-secondary)] border-[var(--border-secondary)] hover:border-[var(--border-highlight)] hover:text-white hover:bg-[var(--bg-secondary)]"
              }`}
            >
              {niche}
            </button>
          ))}
        </div>
      </div>

      {/* Bio-Optimized Keywords (visible when niche is selected) */}
      {activeNiche && BIO_KEYWORDS[activeNiche] && (
        <div className="mb-6 glass-glow rounded-2xl p-6 relative transition-all hover:-translate-y-1">
          <p className="font-mono text-[10px] text-[var(--accent-violet)] drop-shadow-[0_0_8px_var(--glow-violet)] uppercase tracking-widest mb-1 font-bold">
            Bio keywords for <span className="text-white">{activeNiche}</span>
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mb-4 font-medium">Terms businesses use in their Instagram bios</p>
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
                  disabled={alreadyQueued || isLoading}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-sm ${
                    keyword === term
                      ? "bg-gradient-to-br from-[var(--accent-indigo)] to-[var(--accent-violet)] text-white border-transparent shadow-[0_0_15px_var(--glow-indigo)]"
                      : alreadyQueued
                        ? "opacity-30 cursor-not-allowed bg-black/20 text-[var(--text-muted)] border-[var(--border-secondary)]"
                        : "bg-black/40 text-[var(--text-secondary)] border-[var(--border-secondary)] hover:border-[var(--border-highlight)] hover:text-white hover:bg-[var(--bg-secondary)]"
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
                    newTargets.push(buildTarget(full));
                  }
                }
                if (newTargets.length > 0) {
                  const added = mergeTargets(newTargets);
                  setMessage({
                    type: "success",
                    text: `Added ${added} keyword(s) from ${activeNiche}.`,
                  });
                }
              }}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all border border-dashed border-[var(--accent-violet)] text-[var(--accent-violet)] bg-[var(--accent-violet)]/5 hover:bg-[var(--accent-violet)]/10 hover:shadow-[0_0_15px_var(--glow-violet)] drop-shadow-sm"
            >
              + Add all
            </button>
          </div>
        </div>
      )}

      {/* Suggested Combos (visible when city is entered) */}
      {city.trim() && (
        <div className="mb-6 glass-glow rounded-2xl p-6 relative transition-all hover:-translate-y-1">
          <p className="font-mono text-[10px] text-[var(--accent-violet)] drop-shadow-[0_0_8px_var(--glow-violet)] uppercase tracking-widest mb-4 font-bold">
            Suggested for <span className="text-white">{city}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_NICHES.map((niche) => {
              const queued = isComboQueued(niche);
              return (
                <button
                  key={niche}
                  onClick={() => !queued && handleSuggestedCombo(niche)}
                  disabled={queued || isLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border shadow-sm ${
                    queued
                      ? "opacity-30 cursor-not-allowed bg-black/20 text-[var(--text-muted)] border-[var(--border-secondary)]"
                      : "bg-black/40 text-[var(--text-secondary)] border-[var(--border-secondary)] hover:border-[var(--border-highlight)] hover:text-white hover:bg-[var(--bg-secondary)]"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-glow rounded-2xl p-7 relative transition-all hover:-translate-y-1">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--accent-indigo)]/20 to-transparent border border-[var(--border-highlight)] shadow-[0_0_15px_var(--glow-indigo)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_white]">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Add Keyword</h3>
              <p className="font-mono text-[10px] text-[var(--accent-indigo)] font-bold uppercase tracking-widest drop-shadow-[0_0_8px_var(--glow-indigo)]">Single entry</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-2 font-bold">Niche</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setActiveNiche(null);
                }}
                disabled={isLoading}
                placeholder="e.g., makeup artist"
                className="w-full px-4 py-3 text-sm bg-black/40 border border-[var(--border-secondary)] rounded-xl text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-2 font-bold">City <span className="text-[var(--text-dim)] font-normal normal-case">(optional)</span></label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={isLoading}
                placeholder="e.g., london"
                className="w-full px-4 py-3 text-sm bg-black/40 border border-[var(--border-secondary)] rounded-xl text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-2 font-bold">Limit</label>
              <div className="relative">
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  disabled={isLoading}
                  className="w-full px-4 py-3 text-sm bg-black/40 border border-[var(--border-secondary)] rounded-xl text-white focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all appearance-none"
                >
                <option value={10}>10 profiles</option>
                <option value={20}>20 profiles</option>
                <option value={50}>50 profiles</option>
                <option value={100}>100 profiles</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

            <button
              onClick={() => {
                setShowAdvanced((current) => {
                  const next = !current;
                  if (!next) {
                    setUseCustomRange(false);
                    setFollowersMin(undefined);
                    setFollowersMax(undefined);
                  }
                  return next;
                });
              }}
              disabled={isLoading}
              className="btn-secondary w-full py-2.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--border-secondary)] shadow-sm"
            >
              {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
            </button>

            {showAdvanced && (
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomRange}
                    onChange={(e) => setUseCustomRange(e.target.checked)}
                    disabled={isLoading}
                    className="w-3.5 h-3.5 rounded accent-[var(--accent)]"
                  />
                  <span className="text-xs text-[var(--text-secondary)] font-medium">Custom follower range</span>
                </label>

                {useCustomRange && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="block font-mono text-[10px] text-[var(--text-dim)] mb-1 uppercase tracking-widest font-bold">Min</label>
                      <input
                        type="number"
                        value={followersMin ?? ""}
                        onChange={(e) => setFollowersMin(e.target.value ? parseInt(e.target.value) : undefined)}
                        disabled={isLoading}
                        placeholder={String(globalDefaults.min)}
                        className="w-full px-3 py-2 text-xs bg-black/40 border border-[var(--border-secondary)] rounded-lg text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] text-[var(--text-dim)] mb-1 uppercase tracking-widest font-bold">Max</label>
                      <input
                        type="number"
                        value={followersMax ?? ""}
                        onChange={(e) => setFollowersMax(e.target.value ? parseInt(e.target.value) : undefined)}
                        disabled={isLoading}
                        placeholder={String(globalDefaults.max)}
                        className="w-full px-3 py-2 text-xs bg-black/40 border border-[var(--border-secondary)] rounded-lg text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={addTarget}
              disabled={!keyword.trim() || isLoading}
              className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_var(--glow-indigo)] hover:shadow-[0_0_30px_var(--glow-violet)]"
            >
              + Add to Queue
            </button>
          </div>
        </div>

        {showAdvanced ? (
          <div className="glass-glow rounded-2xl p-7 relative transition-all hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--bg-tertiary)] to-transparent border border-[var(--border-secondary)] shadow-inner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Quick Paste</h3>
                <p className="font-mono text-[10px] text-[var(--accent-violet)] font-bold uppercase tracking-widest drop-shadow-[0_0_8px_var(--glow-violet)]">Bulk import</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4 font-medium">
              Format: <code className="text-[var(--accent-violet)] bg-[var(--accent-violet)]/10 border border-[var(--accent-violet)]/20 px-1.5 py-0.5 rounded font-mono">keyword, limit, min, max</code>
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              disabled={isLoading}
              placeholder={`makeup artist london, 50\nhome baker mumbai, 30, ${globalDefaults.min}, ${globalDefaults.max}\npersonal trainer sydney, 20, 1000, 10000`}
              rows={6}
              className="w-full px-4 py-3 text-sm bg-black/40 border border-[var(--border-secondary)] rounded-xl text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all resize-none font-mono"
            />
            <button
              onClick={parseAndAdd}
              disabled={!pasteText.trim() || isLoading}
              className="mt-4 btn-secondary w-full py-3.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--border-highlight)] shadow-[0_0_15px_transparent] hover:shadow-[0_0_15px_var(--glow-violet)]"
            >
              Parse & Add
            </button>
          </div>
        ) : (
          <div className="glass-glow rounded-2xl p-7 flex items-center justify-center">
            <p className="text-xs text-[var(--text-secondary)] text-center font-medium opacity-70">
              Advanced tools are hidden. Use “Show Advanced Options” for bulk import and custom follower ranges.
            </p>
          </div>
        )}
      </div>

      {/* Queue + Run button */}
      <div className="mt-6 glass-glow rounded-2xl p-7 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--bg-tertiary)] to-transparent border border-[var(--border-secondary)] shadow-inner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Queue</h3>
              <p className="font-mono text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">
                {targets.length} keywords
              </p>
            </div>
          </div>
          {targets.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] bg-black/50 border border-[var(--border-secondary)] text-[var(--text-dim)] px-2 py-0.5 rounded-md drop-shadow-sm">{totalProfileBudget} profiles</span>
              <span className="font-mono text-[10px] bg-[var(--success-dim)] border border-[var(--success)]/20 text-[var(--success)] px-3 py-1 rounded-md drop-shadow-sm font-bold">Ready</span>
              <button
                onClick={clearQueue}
                disabled={isLoading}
                className="btn-secondary px-4 py-2 text-[10px] font-mono uppercase tracking-widest border border-[var(--border-secondary)] hover:border-[var(--error-dim)] hover:bg-[var(--error-dim)]/50 hover:text-[var(--error)] transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {targets.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-[var(--border-secondary)] rounded-xl bg-black/20">
            <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">No keywords in queue</p>
            <p className="text-[var(--text-dim)] text-xs">Add keywords above to get started</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {targets.map((target, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-[var(--bg-secondary)]/50 border border-[var(--border-secondary)] hover:border-[var(--border-highlight)] transition-colors glass rounded-xl shadow-sm hover:shadow-[0_0_15px_var(--glow-indigo)]"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-mono text-[10px] text-[var(--text-dim)] w-8 tracking-widest">#{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-sm font-bold text-white drop-shadow-sm">
                    {target.keyword}
                  </span>
                  <span className="font-mono text-[10px] bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[var(--text-secondary)] px-2 py-0.5 rounded-md drop-shadow-sm ml-2">Limit {target.limit}</span>
                  {(target.followers_min || target.followers_max) && (
                    <span className="font-mono text-[10px] bg-black/50 border border-[var(--border-secondary)] text-[var(--text-dim)] px-2 py-0.5 rounded-md drop-shadow-sm">
                      {target.followers_min ?? globalDefaults.min}-{target.followers_max ?? globalDefaults.max} followers
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeTarget(index)}
                  className="text-[var(--text-dim)] hover:text-red-400 transition-colors text-xs font-semibold px-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className={`mb-8 p-5 rounded-xl border ${
            canRunBatch
              ? "bg-black/40 border-[var(--success)]/40 shadow-[0_0_15px_var(--success-dim)]"
              : "bg-black/20 border-[var(--border-secondary)]"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <p className={`text-sm font-bold ${canRunBatch ? "text-[var(--success)] drop-shadow-[0_0_8px_var(--success-dim)]" : "text-white"}`}>
              {runStateLabel}
            </p>
            {!isInstagramLocked && (
              <span className="font-mono text-[10px] text-[var(--text-dim)] uppercase tracking-widest font-bold">
                {targets.length} queued
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium">{runStateHint}</p>
          {isInstagramLocked && (
            <div className="mt-4">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[var(--accent-indigo)] to-[var(--accent-violet)] text-white shadow-[0_0_15px_var(--glow-indigo)] hover:scale-105 transition-all"
              >
                Upgrade Plan
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </div>

        <button
          onClick={runBatch}
          disabled={!canRunBatch}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_var(--glow-indigo)] hover:shadow-[0_0_30px_var(--glow-violet)]"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 drop-shadow-[0_0_8px_white]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Run Batch ({targets.length} keywords / {totalProfileBudget} profiles)</span>
              <svg className="w-5 h-5 drop-shadow-[0_0_8px_white]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Tabs: Jobs | Top Results */}
      <div className="mt-6 glass-glow rounded-2xl p-7 relative">
        <div className="flex items-center gap-1 mb-6 border-b border-[var(--border-secondary)]">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-3 text-sm font-bold transition-colors relative ${
              activeTab === "jobs"
                ? "text-[var(--accent-indigo)] drop-shadow-[0_0_8px_var(--glow-indigo)]"
                : "text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            Jobs
            {activeTab === "jobs" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--accent-indigo)] to-[var(--accent-violet)] shadow-[0_0_10px_var(--glow-indigo)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`px-4 py-3 text-sm font-bold transition-colors relative ${
              activeTab === "results"
                ? "text-[var(--accent-indigo)] drop-shadow-[0_0_8px_var(--glow-indigo)]"
                : "text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            Top Results
            {activeTab === "results" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--accent-indigo)] to-[var(--accent-violet)] shadow-[0_0_10px_var(--glow-indigo)]" />
            )}
          </button>
        </div>

        {activeTab === "jobs" && (
          <>
            {jobsLoading ? (
              <p className="text-[var(--text-secondary)] text-sm py-8 text-center animate-pulse">Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-[var(--border-secondary)] rounded-xl bg-black/20">
                <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">No Instagram jobs yet.</p>
                <p className="text-[var(--text-dim)] text-xs">Run a batch to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 bg-[var(--bg-secondary)]/50 border border-[var(--border-secondary)] hover:border-[var(--border-highlight)] transition-colors glass rounded-xl shadow-sm hover:shadow-[0_0_15px_var(--glow-indigo)]"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${getStatusDot(job.status)} ${job.status === "running" ? "animate-pulse shadow-[0_0_8px_currentColor]" : ""}`} />
                      <div>
                        <p className="text-sm font-bold text-white drop-shadow-sm">
                          Job #{job.id}
                        </p>
                        <p className="font-mono text-[10px] text-[var(--accent-indigo)] font-bold mt-0.5">
                          {job.leads_found} leads found
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-md font-mono text-[10px] uppercase tracking-widest font-bold ${getStatusPill(job.status)}`}>
                        {job.status.replace(/_/g, " ")}
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
              <p className="text-[var(--text-secondary)] text-sm py-8 text-center animate-pulse">Loading results...</p>
            ) : previewLeads.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-[var(--border-secondary)] rounded-xl bg-black/20">
                <p className="text-[var(--text-secondary)] text-sm font-medium">No Instagram leads yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {previewLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-5 bg-[var(--bg-secondary)]/50 border border-[var(--border-secondary)] hover:border-[var(--border-highlight)] transition-colors glass rounded-xl shadow-sm hover:shadow-[0_0_15px_var(--glow-violet)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {lead.instagram && (
                          <a
                            href={`https://instagram.com/${lead.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-[var(--accent-indigo)] hover:text-white transition-colors"
                          >
                            @{lead.instagram}
                          </a>
                        )}
                        {!lead.instagram && (
                          <span className="text-sm font-bold text-white">{lead.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-1.5 bg-black/50 border border-[var(--border-secondary)] rounded-full overflow-hidden shadow-inner flex">
                          <div
                            className={`h-full opacity-80 ${getScoreColor(lead.lead_score)}`}
                            style={{ width: `${lead.lead_score}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-[var(--accent-violet)] drop-shadow-[0_0_5px_var(--glow-violet)] w-6 font-bold">{lead.lead_score}</span>
                      </div>
                    </div>
                    {lead.reason && (
                      <p className="text-[11px] text-[var(--text-secondary)] mb-2 leading-relaxed">{lead.reason}</p>
                    )}
                    {lead.ai_outreach && (
                      <p className="text-[11px] text-[var(--text-dim)] truncate mt-1">
                        <span className="text-white font-semibold">DM:</span> {lead.ai_outreach}
                      </p>
                    )}
                  </div>
                ))}
                <Link
                  href="/leads"
                  className="block text-center text-xs text-[var(--accent-indigo)] font-bold hover:text-white transition-colors py-4 mt-2"
                >
                  View all leads →
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tips */}
      <div className="mt-6 glass-glow rounded-2xl p-6 relative">
        <p className="font-mono text-[10px] text-[var(--accent-violet)] drop-shadow-[0_0_8px_var(--glow-violet)] uppercase tracking-widest mb-4 font-bold">
          Pro Tips
        </p>
        <ul className="text-xs text-[var(--text-secondary)] space-y-2.5 leading-relaxed font-medium">
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
