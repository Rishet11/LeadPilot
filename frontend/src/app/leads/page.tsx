"use client";

import { useState, useEffect } from "react";
import { getLeads, updateLeadStatus, Lead } from "@/lib/api";

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "meeting", label: "Meeting" },
  { value: "closed", label: "Closed" },
  { value: "not_interested", label: "Not Interested" },
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
    noWebsite: false,
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
        no_website: filters.noWebsite || undefined,
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
    if (score >= 80) return "bg-[var(--success)]";
    if (score >= 50) return "bg-[var(--warning)]";
    return "bg-[var(--fg-muted)]";
  };

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-[var(--fg-primary)] tracking-[-0.025em]">Leads</h1>
          <span className="text-xs text-[var(--fg-muted)]">
            {leads.length} leads
          </span>
        </div>

        <div className="flex gap-2.5 mb-5">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="field-inset px-3 py-1.5 text-[var(--fg-primary)] text-xs focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
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
            className="field-inset px-3 py-1.5 text-[var(--fg-primary)] text-xs focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
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
            className="field-inset px-3 py-1.5 text-[var(--fg-primary)] text-xs placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
          />
          <select
            value={filters.minScore}
            onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })}
            className="field-inset px-3 py-1.5 text-[var(--fg-primary)] text-xs focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
          >
            <option value={0}>Any Score</option>
            <option value={50}>50+</option>
            <option value={70}>70+</option>
            <option value={80}>80+</option>
          </select>
          <label className="flex items-center gap-1.5 px-3 py-1.5 field-inset cursor-pointer">
            <input
              type="checkbox"
              checked={filters.noWebsite}
              onChange={(e) => setFilters({ ...filters, noWebsite: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--accent)] focus:ring-[var(--accent-muted)] focus:ring-1"
            />
            <span className="text-xs text-[var(--fg-primary)]">No Website</span>
          </label>
        </div>

        <div className="flex-1 overflow-auto card-static">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[var(--fg-muted)] text-sm">Loading...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[var(--fg-muted)] text-sm">No leads found.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-[var(--bg-tertiary)]">
                <tr className="text-left text-[11px] text-[var(--fg-muted)] uppercase tracking-wider">
                  <th className="px-4 py-2.5 font-medium">Business</th>
                  <th className="px-4 py-2.5 font-medium">City</th>
                  <th className="px-4 py-2.5 font-medium">Reviews</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`border-t border-[var(--border)] cursor-pointer transition-colors ${
                      selectedLead?.id === lead.id
                        ? "bg-[var(--accent-muted)]"
                        : "hover:bg-[var(--bg-tertiary)]/50"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div>
                        {lead.maps_url ? (
                          <a
                            href={lead.maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-[var(--accent-hover)] hover:underline"
                          >
                            {lead.name}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-[var(--fg-primary)]">{lead.name}</p>
                        )}
                        <p className="text-[11px] text-[var(--fg-muted)]">{lead.category}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--fg-muted)]">
                      {lead.city}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-[var(--fg-primary)]">
                        {lead.rating}★ ({lead.reviews})
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getScoreColor(lead.lead_score)}`}
                            style={{ width: `${lead.lead_score}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-[var(--fg-muted)] w-6">
                          {lead.lead_score}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={lead.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(lead.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--fg-primary)] focus:outline-none focus:border-[var(--accent)]"
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

      {selectedLead && (
        <div className="w-80 card-static p-5 overflow-auto shrink-0">
          <div className="flex items-start justify-between mb-5">
            <div>
              {selectedLead.maps_url ? (
                <a
                  href={selectedLead.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-[var(--accent-hover)] hover:underline"
                >
                  {selectedLead.name}
                </a>
              ) : (
                <h2 className="text-sm font-semibold text-[var(--fg-primary)]">{selectedLead.name}</h2>
              )}
              <p className="text-xs text-[var(--fg-muted)]">{selectedLead.category}</p>
            </div>
            <button
              onClick={() => setSelectedLead(null)}
              className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)] text-xs px-1.5 py-0.5 rounded-lg bg-[var(--bg-tertiary)] transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-medium text-[var(--fg-muted)] uppercase tracking-wider mb-2">Score</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getScoreColor(selectedLead.lead_score)}`}
                    style={{ width: `${selectedLead.lead_score}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-[var(--fg-primary)]">{selectedLead.lead_score}</span>
              </div>
              {selectedLead.reason && (
                <p className="text-[11px] text-[var(--fg-muted)] mt-1.5">{selectedLead.reason}</p>
              )}
            </div>

            <div>
              <p className="text-[11px] font-medium text-[var(--fg-muted)] uppercase tracking-wider mb-2">Contact</p>
              <div className="space-y-2">
                {selectedLead.phone && (
                  <button
                    onClick={() => copyToClipboard(selectedLead.phone!)}
                    className="flex items-center gap-2 text-xs text-[var(--fg-primary)] hover:text-[var(--accent-hover)] transition-colors rounded-xl px-3 py-2 bg-[var(--bg-tertiary)] w-full text-left"
                  >
                    <span className="text-[var(--fg-muted)]">Phone</span>
                    <span className="ml-auto">{selectedLead.phone}</span>
                  </button>
                )}
                {selectedLead.website && (
                  <a
                    href={selectedLead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[var(--accent-hover)] hover:underline px-3 py-2 bg-[var(--bg-tertiary)] rounded-xl"
                  >
                    <span className="text-[var(--fg-muted)]">Web</span>
                    <span className="ml-auto truncate max-w-[180px]">{selectedLead.website}</span>
                  </a>
                )}
                {selectedLead.instagram && (
                  <a
                    href={`https://instagram.com/${selectedLead.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[var(--accent-hover)] hover:underline px-3 py-2 bg-[var(--bg-tertiary)] rounded-xl"
                  >
                    <span className="text-[var(--fg-muted)]">IG</span>
                    <span className="ml-auto">@{selectedLead.instagram}</span>
                  </a>
                )}
              </div>
            </div>

            {selectedLead.ai_outreach && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-medium text-[var(--fg-muted)] uppercase tracking-wider">Outreach</p>
                  <button
                    onClick={() => copyToClipboard(selectedLead.ai_outreach!)}
                    className="text-[11px] text-[var(--accent-hover)] hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-xl text-xs text-[var(--fg-primary)] whitespace-pre-wrap leading-relaxed">
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
