"use client";

import { useState, useEffect } from "react";
import MetricCard from "@/components/MetricCard";
import QuickScrape from "@/components/QuickScrape";
import { getLeadStats, getJobs, scrapeSingle, LeadStats, Job } from "@/lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, jobsData] = await Promise.all([
        getLeadStats(),
        getJobs(5),
      ]);
      setStats(statsData);
      setJobs(jobsData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      // Set mock data for demo
      setStats({
        total_leads: 0,
        high_priority_leads: 0,
        leads_by_status: { new: 0, contacted: 0, closed: 0 },
        leads_by_source: { google_maps: 0, instagram: 0 },
      });
      setJobs([]);
    }
  };

  const handleScrape = async (city: string, category: string, limit: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await scrapeSingle(city, category, limit);
      // Refresh data after a delay
      setTimeout(loadData, 2000);
    } catch (err) {
      setError("Failed to start scrape. Make sure the API is running.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "running":
        return "text-blue-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-yellow-400";
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total Leads"
          value={stats?.total_leads ?? 0}
          icon="📊"
        />
        <MetricCard
          title="High Priority"
          value={stats?.high_priority_leads ?? 0}
          icon="🎯"
        />
        <MetricCard
          title="Potential Revenue"
          value={`$${((stats?.high_priority_leads ?? 0) * 5000).toLocaleString()}`}
          icon="💰"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          {jobs.length === 0 ? (
            <p className="text-[var(--foreground-muted)] text-sm">
              No recent jobs. Run a scrape to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={getStatusColor(job.status)}>●</span>
                    <div>
                      <p className="text-sm text-white">
                        {job.job_type === "google_maps" ? "🗺️" : "📸"}{" "}
                        {job.job_type.replace("_", " ").toUpperCase()}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {job.leads_found} leads found
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      {formatDate(job.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Scrape */}
        <QuickScrape onScrape={handleScrape} isLoading={isLoading} />
      </div>

      {/* Lead Sources */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Leads by Source</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--foreground-muted)]">🗺️ Google Maps</span>
              <span className="text-sm font-medium text-white">
                {stats?.leads_by_source?.google_maps ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--foreground-muted)]">📸 Instagram</span>
              <span className="text-sm font-medium text-white">
                {stats?.leads_by_source?.instagram ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Leads by Status</h3>
          <div className="space-y-3">
            {Object.entries(stats?.leads_by_status ?? {}).slice(0, 4).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-[var(--foreground-muted)] capitalize">
                  {status.replace("_", " ")}
                </span>
                <span className="text-sm font-medium text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
