"use client";

import { useState, useEffect } from "react";
import { getLeads, updateLeadStatus, batchDeleteLeads, Lead } from "@/lib/api";

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
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

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
    // Clear selection when filters change (optional choice, generally safer)
    setSelectedIds(new Set());
    
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

  // --- Batch Selection Logic ---
  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length && leads.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const toggleSelectOne = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} leads?`)) return;

    setIsDeleting(true);
    try {
      await batchDeleteLeads(Array.from(selectedIds));
      // Remove deleted from local state immediately for UI snapiness
      setLeads(leads.filter(l => !selectedIds.has(l.id)));
      if (selectedLead && selectedIds.has(selectedLead.id)) {
        setSelectedLead(null);
      }
      setSelectedIds(new Set());
    } catch (err) {
      alert("Failed to delete leads. See console.");
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove all non-numeric characters
    return phone.replace(/\D/g, "");
  };


  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-[var(--success)]";
    if (score >= 50) return "bg-[var(--warning)]";
    return "bg-[var(--text-muted)]";
  };

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-[10px] text-[var(--accent)] tracking-[0.2em] uppercase mb-1">CRM</p>
            <h1 className="font-display text-2xl text-[var(--text-primary)] tracking-[-0.02em]">Leads</h1>
          </div>
          <div className="flex items-center gap-4">
             {selectedIds.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  disabled={isDeleting}
                  className="btn-primary bg-[var(--error)] border-[var(--error-dim)] text-white hover:bg-[var(--error)]/90 px-3 py-1.5 text-xs flex items-center gap-2"
                >
                  {isDeleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
             )}
            <span className="tag font-mono text-[10px]">
              {leads.length} leads
            </span>
          </div>
        </div>

        <div className="flex gap-2.5 mb-5 overflow-x-auto pb-2">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="field px-3 py-2 text-xs focus:outline-none"
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
            className="field px-3 py-2 text-xs focus:outline-none"
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
            className="field px-3 py-2 text-xs placeholder:text-[var(--text-dim)] focus:outline-none"
          />
          <select
            value={filters.minScore}
            onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })}
            className="field px-3 py-2 text-xs focus:outline-none"
          >
            <option value={0}>Any Score</option>
            <option value={50}>50+</option>
            <option value={70}>70+</option>
            <option value={80}>80+</option>
          </select>
          <label className="flex items-center gap-1.5 px-3 py-1.5 field-inset cursor-pointer min-w-max">
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
              <p className="text-[var(--text-muted)] text-sm">Loading...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[var(--text-muted)] text-sm">No leads found.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-[var(--surface-elevated)] z-10">
                <tr className="text-left font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium w-10">
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll}
                      checked={leads.length > 0 && selectedIds.size === leads.length}
                      className="w-3.5 h-3.5 rounded border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--accent)]"
                    />
                  </th>
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
                    className={`border-t border-[var(--border-subtle)] cursor-pointer transition-colors ${
                      selectedLead?.id === lead.id
                        ? "bg-[var(--accent-dim)]"
                        : "hover:bg-[var(--surface-card)]"
                    }`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                       <input 
                          type="checkbox" 
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelectOne(lead.id)}
                          className="w-3.5 h-3.5 rounded border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--accent)]"
                        />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {lead.maps_url ? (
                          <a
                            href={lead.maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-[var(--accent)] hover:underline"
                          >
                            {lead.name}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-[var(--text-primary)]">{lead.name}</p>
                        )}
                        <p className="font-mono text-[10px] text-[var(--text-muted)]">{lead.category}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {lead.city}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--text-primary)]">
                        {lead.rating}★ ({lead.reviews})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getScoreColor(lead.lead_score)}`}
                            style={{ width: `${lead.lead_score}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-[var(--text-muted)] w-6">
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
                        className="px-2 py-1 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg font-mono text-[10px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
                  className="text-sm font-semibold text-[var(--accent)] hover:underline"
                >
                  {selectedLead.name}
                </a>
              ) : (
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{selectedLead.name}</h2>
              )}
              <p className="font-mono text-[10px] text-[var(--text-muted)]">{selectedLead.category}</p>
            </div>
            <button
              onClick={() => setSelectedLead(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs px-2 py-1 rounded-lg bg-[var(--surface-elevated)] transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Score</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getScoreColor(selectedLead.lead_score)}`}
                    style={{ width: `${selectedLead.lead_score}%` }}
                  />
                </div>
                <span className="font-display text-xl text-[var(--text-primary)]">{selectedLead.lead_score}</span>
              </div>
              {selectedLead.reason && (
                <p className="text-[11px] text-[var(--text-muted)] mt-2">{selectedLead.reason}</p>
              )}
            </div>

            <div>
              <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Contact</p>
              <div className="space-y-2">
                {selectedLead.phone && (
                  <button
                    onClick={() => copyToClipboard(selectedLead.phone!)}
                    className="flex items-center gap-2 text-xs text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors rounded-xl px-3 py-2.5 bg-[var(--surface-elevated)] w-full text-left border border-[var(--border-subtle)]"
                  >
                    <span className="text-[var(--text-muted)]">Phone</span>
                    <span className="ml-auto font-mono">{selectedLead.phone}</span>
                  </button>
                )}
                {selectedLead.phone && (
                  <a
                    href={`https://wa.me/${formatPhoneForWhatsApp(selectedLead.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[var(--accent)] hover:underline px-3 py-2.5 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]"
                  >
                    <span className="text-[var(--text-muted)]">WhatsApp</span>
                    <span className="ml-auto font-mono">{selectedLead.phone}</span>
                  </a>
                )}
                {selectedLead.website && (
                  <a
                    href={selectedLead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[var(--accent)] hover:underline px-3 py-2.5 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]"
                  >
                    <span className="text-[var(--text-muted)]">Web</span>
                    <span className="ml-auto truncate max-w-[180px]">{selectedLead.website}</span>
                  </a>
                )}
                {selectedLead.instagram && (
                  <a
                    href={`https://instagram.com/${selectedLead.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[var(--accent)] hover:underline px-3 py-2.5 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]"
                  >
                    <span className="text-[var(--text-muted)]">IG</span>
                    <span className="ml-auto">@{selectedLead.instagram}</span>
                  </a>
                )}
                {selectedLead.email && (
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="flex items-center gap-2 text-xs text-[var(--accent)] hover:underline px-3 py-2.5 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]"
                  >
                    <span className="text-[var(--text-muted)]">Email</span>
                    <span className="ml-auto truncate max-w-[180px]">{selectedLead.email}</span>
                  </a>
                )}
              </div>
            </div>

            {selectedLead.ai_outreach && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Outreach</p>
                  <button
                    onClick={() => copyToClipboard(selectedLead.ai_outreach!)}
                    className="text-[11px] text-[var(--accent)] hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <div className="p-4 bg-[var(--surface-elevated)] rounded-xl text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed border border-[var(--border-subtle)]">
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
