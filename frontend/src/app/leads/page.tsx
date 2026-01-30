"use client";

import { useState, useEffect } from "react";
import { getLeads, updateLeadStatus, Lead } from "@/lib/api";

const statusOptions = [
  { value: "new", label: "New", color: "bg-gray-500" },
  { value: "contacted", label: "Contacted", color: "bg-blue-500" },
  { value: "replied", label: "Replied", color: "bg-yellow-500" },
  { value: "meeting", label: "Meeting", color: "bg-purple-500" },
  { value: "closed", label: "Closed", color: "bg-green-500" },
  { value: "not_interested", label: "Not Interested", color: "bg-red-500" },
];

export default function LeadsCRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    source: "",
    minScore: 0,
    city: "",
  });

  useEffect(() => {
    loadLeads();
  }, [filters]);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const data = await getLeads({
        status: filters.status || undefined,
        source: filters.source || undefined,
        min_score: filters.minScore || undefined,
        city: filters.city || undefined,
        limit: 100,
      });
      setLeads(data);
    } catch (err) {
      console.error("Failed to load leads:", err);
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      setLeads(leads.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-gray-500";
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      {/* Leads Table */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Leads CRM</h1>
          <span className="text-sm text-[var(--foreground-muted)]">
            {leads.length} leads
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">All Status</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            className="px-3 py-2 bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">All Sources</option>
            <option value="google_maps">Google Maps</option>
            <option value="instagram">Instagram</option>
          </select>
          <input
            type="text"
            placeholder="Filter by city..."
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="px-3 py-2 bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)]"
          />
          <select
            value={filters.minScore}
            onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })}
            className="px-3 py-2 bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            <option value={0}>Any Score</option>
            <option value={50}>50+</option>
            <option value={70}>70+</option>
            <option value={80}>80+ (High Priority)</option>
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[var(--foreground-muted)]">Loading...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[var(--foreground-muted)]">No leads found. Run a scrape to get started!</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-[var(--background-tertiary)]">
                <tr className="text-left text-sm text-[var(--foreground-muted)]">
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">Reviews</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`border-t border-[var(--border)] cursor-pointer transition-colors ${
                      selectedLead?.id === lead.id
                        ? "bg-[var(--accent)]/20"
                        : "hover:bg-[var(--background-tertiary)]"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{lead.name}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">{lead.category}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground-muted)]">
                      {lead.city}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white">
                        {lead.rating}★ ({lead.reviews})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getScoreColor(lead.lead_score)}`}
                            style={{ width: `${lead.lead_score}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--foreground-muted)]">
                          {lead.lead_score}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(lead.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 bg-[var(--background-tertiary)] border border-[var(--border)] rounded text-xs text-white focus:outline-none"
                      >
                        {statusOptions.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <div className="w-96 bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5 overflow-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">{selectedLead.name}</h2>
              <p className="text-sm text-[var(--foreground-muted)]">{selectedLead.category}</p>
            </div>
            <button
              onClick={() => setSelectedLead(null)}
              className="text-[var(--foreground-muted)] hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Score */}
            <div>
              <p className="text-sm text-[var(--foreground-muted)] mb-1">Lead Score</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getScoreColor(selectedLead.lead_score)}`}
                    style={{ width: `${selectedLead.lead_score}%` }}
                  />
                </div>
                <span className="text-xl font-bold text-white">{selectedLead.lead_score}</span>
              </div>
              {selectedLead.reason && (
                <p className="text-xs text-[var(--foreground-muted)] mt-1">{selectedLead.reason}</p>
              )}
            </div>

            {/* Contact Info */}
            <div>
              <p className="text-sm text-[var(--foreground-muted)] mb-2">Contact</p>
              {selectedLead.phone && (
                <button
                  onClick={() => copyToClipboard(selectedLead.phone!)}
                  className="flex items-center gap-2 text-sm text-white hover:text-[var(--accent)] transition-colors"
                >
                  📞 {selectedLead.phone}
                  <span className="text-xs text-[var(--foreground-muted)]">(click to copy)</span>
                </button>
              )}
              {selectedLead.website && (
                <a
                  href={selectedLead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-[var(--accent)] hover:underline mt-1"
                >
                  🌐 {selectedLead.website}
                </a>
              )}
              {selectedLead.instagram && (
                <a
                  href={`https://instagram.com/${selectedLead.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-[var(--accent)] hover:underline mt-1"
                >
                  📸 @{selectedLead.instagram}
                </a>
              )}
            </div>

            {/* AI Outreach */}
            {selectedLead.ai_outreach && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[var(--foreground-muted)]">AI Outreach Message</p>
                  <button
                    onClick={() => copyToClipboard(selectedLead.ai_outreach!)}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <div className="p-3 bg-[var(--background-tertiary)] rounded-lg text-sm text-white whitespace-pre-wrap">
                  {selectedLead.ai_outreach}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
