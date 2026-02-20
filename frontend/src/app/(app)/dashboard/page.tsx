"use client";

import { useEffect, useRef, useState } from "react";
import MetricCard from "@/components/MetricCard";
import QuickScrape from "@/components/QuickScrape";
import {
  getLeadStats,
  getJobs,
  scrapeSingle,
  scrapeBatch,
  getCurrentUsage,
  getCurrentPlan,
  getUserFacingApiError,
  generateTargetsFromObjective,
  GeneratedGoogleTarget,
  LeadStats,
  Job,
  UsageCurrent,
  CurrentPlan,
} from "@/lib/api";

const POLL_INTERVAL_MS = 5000;
const STALE_AFTER_MS = 30000;
// const REVENUE_PER_HIGH_PRIORITY_LEAD = 5000; // Removed

export default function Dashboard() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [usage, setUsage] = useState<UsageCurrent | null>(null);
  const [plan, setPlan] = useState<CurrentPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isGeneratingTargets, setIsGeneratingTargets] = useState(false);
  const [agentObjective, setAgentObjective] = useState("");
  const [generatedTargets, setGeneratedTargets] = useState<GeneratedGoogleTarget[]>([]);
  const [agentWarnings, setAgentWarnings] = useState<string[]>([]);
  const [agentInfo, setAgentInfo] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    loadData(true);
    const poll = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadData(false);
    };
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (!document.hidden) {
        loadData(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const loadData = async (showSpinner = false) => {
    if (refreshInFlightRef.current) {
      return;
    }
    if (showSpinner) {
      setIsRefreshing(true);
    }
    refreshInFlightRef.current = true;

    try {
      const [statsData, jobsData, usageData, planData] = await Promise.all([
        getLeadStats(),
        getJobs(10),
        getCurrentUsage(),
        getCurrentPlan(),
      ]);
      setStats(statsData);
      setJobs(jobsData);
      setUsage(usageData);
      setPlan(planData);
      setRefreshWarning(null);
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setRefreshWarning(getUserFacingApiError(err, "Live refresh failed. Showing last known data."));
    } finally {
      refreshInFlightRef.current = false;
      setIsRefreshing(false);
    }
  };

  const handleScrape = async (city: string, category: string, limit: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await scrapeSingle(city.trim(), category.trim(), limit);
      setTimeout(loadData, 2000);
      setAgentInfo(`Queued quick scrape for ${category} in ${city}.`);
      return true;
    } catch (err) {
      setError(getUserFacingApiError(err, "Failed to start scrape. Make sure the API is running."));
      console.error("Failed to start scrape:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTargets = async () => {
    if (!agentObjective.trim()) return;
    setIsGeneratingTargets(true);
    setError(null);
    setAgentInfo(null);

    try {
      const result = await generateTargetsFromObjective({
        objective: agentObjective.trim(),
        max_targets: 6,
        default_limit: 50,
        include_instagram: false,
      });
      setGeneratedTargets(result.google_maps_targets || []);
      setAgentWarnings(result.warnings || []);
      setAgentInfo(`Generated ${result.google_maps_targets.length} target(s) using ${result.source.toUpperCase()} strategy.`);
    } catch (err) {
      console.error("Failed to generate targets:", err);
      setError(getUserFacingApiError(err, "Target Builder failed. Try a clearer objective with city + industry."));
      setGeneratedTargets([]);
      setAgentWarnings([]);
    } finally {
      setIsGeneratingTargets(false);
    }
  };

  const handleRunGeneratedBatch = async () => {
    if (generatedTargets.length === 0) return;
    setIsBatchLoading(true);
    setError(null);
    setAgentInfo(null);

    try {
      const result = await scrapeBatch(generatedTargets);
      setAgentInfo(`Queued batch job #${result.job_id} with ${generatedTargets.length} targets.`);
      setGeneratedTargets([]);
      setTimeout(loadData, 2000);
    } catch (err) {
      console.error("Failed to queue generated targets:", err);
      setError(getUserFacingApiError(err, "Failed to queue generated targets."));
    } finally {
      setIsBatchLoading(false);
    }
  };

  useEffect(() => {
    if (!agentInfo && !error && !refreshWarning) {
      return;
    }
    const timer = setTimeout(() => {
      setAgentInfo(null);
      setError(null);
      setRefreshWarning(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [agentInfo, error, refreshWarning]);

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

  const formatDate = (dateStr: string) => {
    const utcStr = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
    const date = new Date(utcStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isStale =
    !lastUpdatedAt || Date.now() - new Date(lastUpdatedAt).getTime() > STALE_AFTER_MS;

  const getStatusDot = (status: string) => {
    switch (status) {
      case "completed": return "status-dot-success";
      case "completed_with_errors": return "status-dot-warning";
      case "running": return "status-dot-gold";
      case "failed": return "status-dot-error";
      default: return "status-dot-warning";
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case "completed": return "bg-[var(--success-dim)] text-[var(--success)]";
      case "completed_with_errors": return "bg-[var(--warning-dim)] text-[var(--warning)]";
      case "running": return "bg-[var(--accent-dim)] text-[var(--accent)]";
      case "failed": return "bg-[var(--error-dim)] text-[var(--error)]";
      default: return "bg-[var(--warning-dim)] text-[var(--warning)]";
    }
  };

  return (
    <div className="max-w-6xl animate-fade-up relative">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-[var(--accent-indigo)] to-[var(--accent-violet)] rounded-full blur-[150px] opacity-10 animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-gradient-to-tl from-[var(--accent-violet)] to-[var(--accent-indigo)] rounded-full blur-[150px] opacity-10" />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <p className="font-mono text-[10px] text-[var(--accent-indigo)] font-bold uppercase tracking-widest mb-1 drop-shadow-[0_0_8px_var(--glow-indigo)]">Overview</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white drop-shadow-md">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="btn-secondary px-3 py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--success-dim)] border border-[var(--success)]/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]"></span>
            </span>
            <span className="font-mono text-[10px] text-[var(--success)] uppercase tracking-wider">Live</span>
          </div>
          {isStale && (
            <span className="tag font-mono text-[10px] text-[var(--warning)] bg-[var(--warning-dim)] border border-[var(--warning)]/25">
              stale
            </span>
          )}
        </div>
      </div>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Last synced: {formatLastUpdated(lastUpdatedAt)}
      </p>
      {plan && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="tag font-mono text-[10px] uppercase">{plan.plan_tier} plan</span>
          <span className="tag font-mono text-[10px]">quota: {plan.monthly_lead_quota >= 1000000 ? "unlimited" : plan.monthly_lead_quota}</span>
          {usage && (
            <span className="tag font-mono text-[10px]">
              remaining: {usage.remaining_credits === null ? "unlimited" : usage.remaining_credits}
            </span>
          )}
        </div>
      )}

      {/* Error alert */}
      {refreshWarning && (
        <div className="mb-6 p-4 bg-[var(--warning-dim)] border border-[var(--warning)]/20 rounded-xl text-[var(--warning)] text-sm">
          {refreshWarning}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-[var(--error-dim)] border border-[var(--error)]/20 rounded-xl text-[var(--error)] text-sm">
          {error}
        </div>
      )}
      {agentInfo && (
        <div className="mb-6 p-4 bg-[var(--success-dim)] border border-[var(--success)]/20 rounded-xl text-[var(--success)] text-sm">
          {agentInfo}
        </div>
      )}
      {(stats?.total_leads ?? 0) === 0 && jobs.length === 0 && (
        <div className="mb-6 p-4 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-dim)]">
          <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-wider mb-2">Quick start</p>
          <div className="grid md:grid-cols-3 gap-2 text-xs text-[var(--text-secondary)]">
            <p>1. Run a quick scrape with city + niche.</p>
            <p>2. Wait for the job to complete in Activity.</p>
            <p>3. Open Leads, regenerate outreach, and export CSV.</p>
          </div>
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 stagger-children">
        <MetricCard
          title="Total Leads"
          value={stats?.total_leads ?? 0}
          className="glass-glow relative overflow-hidden transition-all hover:-translate-y-1 shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[var(--border-secondary)] rounded-2xl p-7"
          titleClassName="font-mono text-[10px] text-[var(--accent-indigo)] font-bold uppercase tracking-widest mb-2 drop-shadow-md"
          valueClassName="text-4xl font-display font-bold text-white tracking-tight drop-shadow-lg"
          iconClassName="text-[var(--text-secondary)] drop-shadow-md"
          icon={
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-indigo)]/20 to-transparent border border-[var(--border-highlight)] flex items-center justify-center shadow-inner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          }
        />
        <MetricCard
          title="High Priority"
          value={stats?.high_priority_leads ?? 0}
          className="glass-glow relative overflow-hidden transition-all hover:-translate-y-1 shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[var(--border-secondary)] rounded-2xl p-7"
          titleClassName="font-mono text-[10px] text-[var(--accent-violet)] font-bold uppercase tracking-widest mb-2 drop-shadow-md"
          valueClassName="text-4xl font-display font-bold text-white tracking-tight drop-shadow-lg"
          iconClassName="text-[var(--text-secondary)] drop-shadow-md"
          icon={
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-violet)]/20 to-transparent border border-[var(--border-highlight)] flex items-center justify-center shadow-inner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
          }
        />
        {/* MetricCard for Potential Revenue Removed */}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2 glass-glow rounded-2xl p-7 relative overflow-hidden group transition-all hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-mono text-[10px] text-[var(--accent-indigo)] font-bold uppercase tracking-widest mb-1">Activity</p>
              <h3 className="text-lg font-bold text-white">Recent Jobs</h3>
            </div>
            {isRefreshing && (
              <svg className="animate-spin h-5 w-5 text-[var(--accent-indigo)] drop-shadow-[0_0_8px_var(--glow-indigo)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>

          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5">
                  <path d="M12 8v4l3 3" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <p className="text-[var(--text-muted)] text-sm">No recent jobs</p>
              <p className="text-[var(--text-dim)] text-xs mt-1">Run a scrape to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-secondary)] hover:border-[var(--border-highlight)] hover:bg-[var(--bg-secondary)] transition-all glass hover:shadow-[0_0_20px_var(--glow-indigo)]"
                >
                  <div className="flex items-center gap-4">
                    <span className={`status-dot ${getStatusDot(job.status)} ${job.status === "running" ? "animate-pulse" : ""}`} />
                    <div>
                      <p className="text-sm font-bold text-white shadow-sm">
                        {job.job_type === "google_maps" ? "Google Maps" : "Instagram"}
                      </p>
                      <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                        {job.leads_found} leads found
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase tracking-wider ${getStatusPill(job.status)}`}>
                      {job.status.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--text-dim)] min-w-[60px] text-right">
                      {formatDate(job.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <QuickScrape onScrape={handleScrape} isLoading={isLoading} />

          <div className="glass-glow rounded-2xl p-7 relative overflow-hidden transition-all hover:-translate-y-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-indigo)] opacity-50" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--accent-indigo)]/20 to-[var(--accent-violet)]/20 border border-[var(--border-highlight)] shadow-[0_0_15px_var(--glow-indigo)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a5 5 0 0 0-5 5v2H6a2 2 0 0 0-2 2v3a8 8 0 0 0 16 0v-3a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z" />
                  <circle cx="9" cy="14" r="1" />
                  <circle cx="15" cy="14" r="1" />
                  <path d="M9 18h6" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Target Builder Agent</h3>
                <p className="font-mono text-[10px] text-[var(--accent-violet)] font-bold uppercase tracking-widest">Objective to targets</p>
              </div>
            </div>

            <textarea
              value={agentObjective}
              onChange={(e) => setAgentObjective(e.target.value)}
              rows={3}
              placeholder="e.g., Find dentists and med spas in Miami and Fort Lauderdale with weak digital presence"
              className="w-full px-4 py-3 text-sm bg-black/40 border border-[var(--border-secondary)] rounded-xl text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner resize-none transition-all"
            />

            <button
              onClick={handleGenerateTargets}
              disabled={isGeneratingTargets || !agentObjective.trim()}
              className="btn-primary w-full mt-4 py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_var(--glow-indigo)] hover:shadow-[0_0_30px_var(--glow-violet)]"
            >
              {isGeneratingTargets ? "Generating..." : "Generate Targets"}
            </button>

            {agentWarnings.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-[var(--warning-dim)] border border-[var(--warning)]/20">
                {agentWarnings.map((w, idx) => (
                  <p key={idx} className="text-[var(--warning)] text-xs">{w}</p>
                ))}
              </div>
            )}

            {generatedTargets.length > 0 && (
              <div className="mt-4">
                <div className="space-y-2 max-h-56 overflow-auto">
                  {generatedTargets.map((target, idx) => (
                    <div
                      key={`${target.city}-${target.category}-${idx}`}
                      className="flex items-center justify-between px-3 py-2 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border-subtle)]"
                    >
                      <p className="text-xs text-[var(--text-primary)]">
                        {target.city} / {target.category}
                      </p>
                      <span className="tag font-mono text-[10px]">{target.limit}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleRunGeneratedBatch}
                  disabled={isBatchLoading}
                  className="btn-primary w-full mt-4 py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_var(--glow-indigo)] hover:shadow-[0_0_30px_var(--glow-violet)]"
                >
                  {isBatchLoading ? "Queueing..." : `Queue Batch (${generatedTargets.length} targets)`}
                </button>
              </div>
            )}
          </div>
          
          {/* Niche Playbooks Widget Removed */}
        </div>
      </div>

      {/* Stats cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-glow rounded-2xl p-7 relative transition-all hover:-translate-y-1">
          <p className="font-mono text-[10px] text-[var(--accent-indigo)] font-bold uppercase tracking-widest mb-1">Breakdown</p>
          <h3 className="text-lg font-bold text-white mb-6">Leads by Source</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex items-center justify-center shadow-inner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="url(#gradient-maps)" strokeWidth="2">
                    <defs>
                      <linearGradient id="gradient-maps" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--accent-indigo)" />
                        <stop offset="100%" stopColor="var(--accent-violet)" />
                      </linearGradient>
                    </defs>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[var(--text-secondary)]">Google Maps</span>
              </div>
              <span className="font-mono text-base font-bold text-white drop-shadow-sm">
                {stats?.leads_by_source?.google_maps ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex items-center justify-center shadow-inner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="url(#gradient-ig)" strokeWidth="2">
                    <defs>
                      <linearGradient id="gradient-ig" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="50%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[var(--text-secondary)]">Instagram</span>
              </div>
              <span className="font-mono text-base font-bold text-white drop-shadow-sm">
                {stats?.leads_by_source?.instagram ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-glow rounded-2xl p-7 relative transition-all hover:-translate-y-1">
          <p className="font-mono text-[10px] text-[var(--accent-indigo)] font-bold uppercase tracking-widest mb-1">Pipeline</p>
          <h3 className="text-lg font-bold text-white mb-6">Leads by Status</h3>
          <div className="space-y-4">
            {Object.entries(stats?.leads_by_status ?? {}).slice(0, 4).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-[var(--border-secondary)]">
                <span className="text-sm font-medium text-[var(--text-secondary)] capitalize drop-shadow-sm">
                  {status.replace("_", " ")}
                </span>
                <span className="font-mono text-base font-bold text-white drop-shadow-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
