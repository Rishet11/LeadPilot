"use client";

import { useState, useEffect } from "react";
import MetricCard from "@/components/MetricCard";
import QuickScrape from "@/components/QuickScrape";
import { getLeadStats, getJobs, scrapeSingle, LeadStats, Job } from "@/lib/api";

const POLL_INTERVAL_MS = 5000;
const REVENUE_PER_HIGH_PRIORITY_LEAD = 5000;

export default function Dashboard() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsData, jobsData] = await Promise.all([
        getLeadStats(),
        getJobs(10),
      ]);
      setStats(statsData);
      setJobs(jobsData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setStats({
        total_leads: 0,
        high_priority_leads: 0,
        leads_by_status: { new: 0, contacted: 0, closed: 0 },
        leads_by_source: { google_maps: 0, instagram: 0 },
      });
      setJobs([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleScrape = async (city: string, category: string, limit: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await scrapeSingle(city, category, limit);
      setTimeout(loadData, 2000);
    } catch (err) {
      setError("Failed to start scrape. Make sure the API is running.");
      console.error("Failed to start scrape:", err);
    } finally {
      setIsLoading(false);
    }
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

  const getStatusDot = (status: string) => {
    switch (status) {
      case "completed": return "status-dot-success";
      case "running": return "status-dot-gold";
      case "failed": return "status-dot-error";
      default: return "status-dot-warning";
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case "completed": return "bg-[var(--success-dim)] text-[var(--success)]";
      case "running": return "bg-[var(--accent-dim)] text-[var(--accent)]";
      case "failed": return "bg-[var(--error-dim)] text-[var(--error)]";
      default: return "bg-[var(--warning-dim)] text-[var(--warning)]";
    }
  };

  return (
    <div className="max-w-6xl animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Overview</p>
          <h1 className="font-display text-3xl text-[var(--text-primary)] tracking-[-0.02em]">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--success-dim)] border border-[var(--success)]/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]"></span>
          </span>
          <span className="font-mono text-[10px] text-[var(--success)] uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 bg-[var(--error-dim)] border border-[var(--error)]/20 rounded-xl text-[var(--error)] text-sm">
          {error}
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 stagger-children">
        <MetricCard
          title="Total Leads"
          value={stats?.total_leads ?? 0}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <MetricCard
          title="High Priority"
          value={stats?.high_priority_leads ?? 0}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          }
        />
        <MetricCard
          title="Potential Revenue"
          value={`$${((stats?.high_priority_leads ?? 0) * REVENUE_PER_HIGH_PRIORITY_LEAD).toLocaleString()}`}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Activity feed */}
        <div className="lg:col-span-2 card-static p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Activity</p>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Jobs</h3>
            </div>
            {isRefreshing && (
              <svg className="animate-spin h-4 w-4 text-[var(--text-muted)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className={`status-dot ${getStatusDot(job.status)} ${job.status === "running" ? "animate-pulse" : ""}`} />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {job.job_type === "google_maps" ? "Google Maps" : "Instagram"}
                      </p>
                      <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                        {job.leads_found} leads found
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase tracking-wider ${getStatusPill(job.status)}`}>
                      {job.status}
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

        {/* Quick scrape */}
        <QuickScrape onScrape={handleScrape} isLoading={isLoading} />
      </div>

      {/* Stats cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-static p-6">
          <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Breakdown</p>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-5">Leads by Source</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <span className="text-sm text-[var(--text-secondary)]">Google Maps</span>
              </div>
              <span className="font-mono text-sm text-[var(--text-primary)]">
                {stats?.leads_by_source?.google_maps ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </div>
                <span className="text-sm text-[var(--text-secondary)]">Instagram</span>
              </div>
              <span className="font-mono text-sm text-[var(--text-primary)]">
                {stats?.leads_by_source?.instagram ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className="card-static p-6">
          <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Pipeline</p>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-5">Leads by Status</h3>
          <div className="space-y-3">
            {Object.entries(stats?.leads_by_status ?? {}).slice(0, 4).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)] capitalize">
                  {status.replace("_", " ")}
                </span>
                <span className="font-mono text-sm text-[var(--text-primary)]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
