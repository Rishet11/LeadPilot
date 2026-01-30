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
    // Backend stores UTC — append Z if missing so the browser converts to local time
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

  const getStatusPill = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-[var(--success-muted)] text-[var(--success)]";
      case "running":
        return "bg-[var(--accent-muted)] text-[var(--accent-hover)]";
      case "failed":
        return "bg-[var(--error-muted)] text-[var(--error)]";
      default:
        return "bg-[var(--warning-muted)] text-[var(--warning)]";
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-[var(--fg-primary)] tracking-[-0.025em]">Dashboard</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--success-muted)] border border-[var(--success)]/15 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]"></span>
          </span>
          <span className="text-[11px] font-medium text-[var(--success)]">Live</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3.5 bg-[var(--error-muted)] border border-[var(--error)]/15 rounded-xl text-[var(--error)] text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard
          title="Total Leads"
          value={stats?.total_leads ?? 0}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 5-6" />
            </svg>
          }
        />
        <MetricCard
          title="High Priority"
          value={stats?.high_priority_leads ?? 0}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-[var(--fg-primary)]">Recent Activity</h3>
            {isRefreshing && (
              <svg className="animate-spin h-3.5 w-3.5 text-[var(--fg-muted)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-[var(--fg-muted)] text-sm">
                No recent jobs. Run a scrape to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-tertiary)]/50 hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDot(job.status)}`} />
                    <div>
                      <p className="text-sm font-medium text-[var(--fg-primary)]">
                        {job.job_type === "google_maps" ? "Google Maps" : "Instagram"}
                      </p>
                      <p className="text-xs text-[var(--fg-muted)]">
                        {job.leads_found} leads
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${getStatusPill(job.status)}`}>
                      {job.status}
                    </span>
                    <span className="text-[11px] text-[var(--fg-muted)] min-w-[55px] text-right">
                      {formatDate(job.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <QuickScrape onScrape={handleScrape} isLoading={isLoading} />
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--fg-primary)] mb-4">Leads by Source</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--fg-muted)]">Google Maps</span>
              <span className="text-sm font-semibold text-[var(--fg-primary)]">
                {stats?.leads_by_source?.google_maps ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--fg-muted)]">Instagram</span>
              <span className="text-sm font-semibold text-[var(--fg-primary)]">
                {stats?.leads_by_source?.instagram ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--fg-primary)] mb-4">Leads by Status</h3>
          <div className="space-y-3">
            {Object.entries(stats?.leads_by_status ?? {}).slice(0, 4).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-[var(--fg-muted)] capitalize">
                  {status.replace("_", " ")}
                </span>
                <span className="text-sm font-semibold text-[var(--fg-primary)]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
