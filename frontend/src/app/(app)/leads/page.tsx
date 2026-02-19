"use client";

import { useEffect, useRef, useState } from "react";
import { batchDeleteLeads, getLeads, Lead, regenerateLeadOutreach, updateLeadStatus } from "@/lib/api";

const FILTER_DEBOUNCE_MS = 280;
const NOTICE_TIMEOUT_MS = 3800;

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "meeting", label: "Meeting" },
  { value: "closed", label: "Closed" },
  { value: "not_interested", label: "Not Interested" },
];

type Filters = {
  status: string;
  source: string;
  minScore: number;
  city: string;
  noWebsite: boolean;
};

type Notice = {
  type: "success" | "error" | "info";
  text: string;
};

function csvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (/["\n,]/.test(raw)) {
    return `"${raw.replace(/"/g, "\"\"")}"`;
  }
  return raw;
}

function leadsToCsv(leads: Lead[]): string {
  const headers = [
    "id",
    "name",
    "category",
    "city",
    "status",
    "source",
    "lead_score",
    "rating",
    "reviews",
    "phone",
    "email",
    "website",
    "instagram",
    "maps_url",
    "ai_outreach",
  ];

  const rows = leads.map((lead) => [
    lead.id,
    lead.name,
    lead.category,
    lead.city,
    lead.status,
    lead.source,
    lead.lead_score,
    lead.rating,
    lead.reviews,
    lead.phone,
    lead.email,
    lead.website,
    lead.instagram,
    lead.maps_url,
    lead.ai_outreach,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((item) => csvValue(item)).join(","))
    .join("\n");
}

export default function LeadsCRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegeneratingOutreach, setIsRegeneratingOutreach] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [filters, setFilters] = useState<Filters>({
    status: "",
    source: "",
    minScore: 0,
    city: "",
    noWebsite: false,
  });
  const [effectiveFilters, setEffectiveFilters] = useState<Filters>(filters);

  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const loadLeads = async (activeFilters: Filters) => {
    setIsLoading(true);
    setSelectedIds(new Set());

    try {
      const data = await getLeads({
        status: activeFilters.status || undefined,
        source: activeFilters.source || undefined,
        min_score: activeFilters.minScore || undefined,
        city: activeFilters.city.trim() || undefined,
        no_website: activeFilters.noWebsite || undefined,
        limit: 100,
      });
      setLeads(data);
    } catch (err) {
      console.error("Failed to load leads:", err);
      setLeads([]);
      setNotice({ type: "error", text: "Failed to load leads. Please refresh." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setEffectiveFilters(filters), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    void loadLeads(effectiveFilters);
  }, [effectiveFilters]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < leads.length;
  }, [selectedIds, leads.length]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    const previous = leads.find((lead) => lead.id === leadId);
    if (!previous) return;

    setLeads((current) =>
      current.map((lead) => (lead.id === leadId ? { ...lead, status: newStatus } : lead))
    );
    if (selectedLead?.id === leadId) {
      setSelectedLead({ ...selectedLead, status: newStatus });
    }

    try {
      await updateLeadStatus(leadId, newStatus);
      setNotice({ type: "success", text: "Lead status updated." });
    } catch (err) {
      console.error("Failed to update status:", err);
      setLeads((current) =>
        current.map((lead) => (lead.id === leadId ? { ...lead, status: previous.status } : lead))
      );
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: previous.status });
      }
      setNotice({ type: "error", text: "Failed to update status." });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length && leads.length > 0) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(leads.map((lead) => lead.id)));
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected lead(s)?`)) return;

    setIsDeleting(true);
    try {
      await batchDeleteLeads(Array.from(selectedIds));
      setLeads((current) => current.filter((lead) => !selectedIds.has(lead.id)));
      if (selectedLead && selectedIds.has(selectedLead.id)) {
        setSelectedLead(null);
      }
      setSelectedIds(new Set());
      setNotice({ type: "success", text: "Selected leads deleted." });
    } catch (err) {
      console.error("Failed to delete leads:", err);
      setNotice({ type: "error", text: "Failed to delete selected leads." });
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ type: "info", text: `${label} copied.` });
    } catch (err) {
      console.error("Clipboard failed:", err);
      setNotice({ type: "error", text: "Copy failed in this browser." });
    }
  };

  const handleRegenerateOutreach = async () => {
    if (!selectedLead) return;
    setIsRegeneratingOutreach(true);

    try {
      const updated = await regenerateLeadOutreach(selectedLead.id);
      setLeads((current) => current.map((lead) => (lead.id === updated.id ? updated : lead)));
      setSelectedLead(updated);
      setNotice({ type: "success", text: "Outreach regenerated." });
    } catch (err) {
      console.error("Failed to regenerate outreach:", err);
      setNotice({ type: "error", text: "Failed to regenerate outreach." });
    } finally {
      setIsRegeneratingOutreach(false);
    }
  };

  const exportCsv = () => {
    if (leads.length === 0) return;
    const csv = leadsToCsv(leads);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const datePart = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `leadpilot-leads-${datePart}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice({ type: "info", text: `Exported ${leads.length} lead(s) to CSV.` });
  };

  const formatPhoneForWhatsApp = (phone: string) => phone.replace(/\D/g, "");

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-[var(--success)]";
    if (score >= 50) return "bg-[var(--warning)]";
    return "bg-[var(--text-muted)]";
  };

  const statusLabel = statusOptions.find((item) => item.value === filters.status)?.label || "All Status";
  const sourceLabel = filters.source ? filters.source.replace("_", " ") : "All Sources";

  return (
    <div className="flex flex-col xl:flex-row gap-5 min-h-[calc(100vh-180px)] xl:h-[calc(100vh-140px)]">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4 shrink-0">
          <div>
            <p className="font-mono text-[10px] text-[var(--accent)] tracking-[0.2em] uppercase mb-1">CRM</p>
            <h1 className="font-display text-2xl text-[var(--text-primary)] tracking-[-0.02em]">Leads</h1>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => void loadLeads(effectiveFilters)}
              disabled={isLoading}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={exportCsv}
              disabled={leads.length === 0}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={handleBatchDelete}
                disabled={isDeleting}
                className="btn-primary bg-[var(--error)] border-[var(--error-dim)] text-white hover:bg-[var(--error)]/90 px-3 py-1.5 text-xs"
              >
                {isDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
              </button>
            )}
            <span className="tag font-mono text-[10px]">{leads.length} leads</span>
          </div>
        </div>

        {notice && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs ${
              notice.type === "success"
                ? "bg-[var(--success-dim)] border border-[var(--success)]/20 text-[var(--success)]"
                : notice.type === "error"
                  ? "bg-[var(--error-dim)] border border-[var(--error)]/20 text-[var(--error)]"
                  : "bg-[var(--accent-dim)] border border-[var(--accent)]/20 text-[var(--accent)]"
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="flex gap-2.5 mb-4 overflow-x-auto pb-2 shrink-0">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="field px-3 py-2 text-xs focus:outline-none"
          >
            <option value="">All Status</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
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
          <label className="flex items-center gap-1.5 px-3 py-1.5 field cursor-pointer min-w-max">
            <input
              type="checkbox"
              checked={filters.noWebsite}
              onChange={(e) => setFilters({ ...filters, noWebsite: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--accent)] focus:ring-[var(--accent-muted)] focus:ring-1"
            />
            <span className="text-xs text-[var(--fg-primary)]">No Website</span>
          </label>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
          <span className="tag">{statusLabel}</span>
          <span className="tag">{sourceLabel}</span>
          {filters.city.trim() && <span className="tag">city: {filters.city.trim()}</span>}
          {filters.minScore > 0 && <span className="tag">score {filters.minScore}+</span>}
          {filters.noWebsite && <span className="tag">no website</span>}
        </div>

        <div className="flex-1 overflow-auto bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[260px]">
              <p className="text-[var(--text-muted)] text-sm">Loading...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[260px]">
              <p className="text-[var(--text-muted)] text-sm">No leads found for current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="sticky top-0 bg-[var(--surface-elevated)] z-10">
                  <tr className="text-left font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium w-10">
                      <input
                        ref={selectAllRef}
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
                          <p className="font-mono text-[10px] text-[var(--text-muted)]">{lead.category || "Unknown category"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{lead.city || "-"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--text-primary)]">
                          {lead.rating ?? "-"}{lead.rating !== null ? "★" : ""} ({lead.reviews ?? 0})
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
                          <span className="font-mono text-[10px] text-[var(--text-muted)] w-6">{lead.lead_score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            void handleStatusChange(lead.id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg font-mono text-[10px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        >
                          {statusOptions.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedLead && (
        <div className="w-full xl:w-80 card-static p-5 overflow-auto shrink-0 xl:max-h-none max-h-[420px]">
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
              <p className="font-mono text-[10px] text-[var(--text-muted)]">{selectedLead.category || "Unknown category"}</p>
            </div>
            <button
              onClick={() => setSelectedLead(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs px-2 py-1 rounded-lg bg-[var(--surface-elevated)] transition-colors"
            >
              Close
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
                    onClick={() => void copyToClipboard(selectedLead.phone!, "Phone")}
                    className="flex items-center gap-2 text-xs text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors rounded-xl px-3 py-2.5 bg-[var(--surface-elevated)] w-full text-left border border-[var(--border-subtle)]"
                  >
                    <span className="text-[var(--text-muted)]">Phone</span>
                    <span className="ml-auto font-mono">{selectedLead.phone}</span>
                  </button>
                )}
                {selectedLead.phone && (
                  <a
                    href={`https://wa.me/${formatPhoneForWhatsApp(selectedLead.phone)}?text=${encodeURIComponent(selectedLead.ai_outreach || "")}`}
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
                    href={`mailto:${selectedLead.email}?subject=${encodeURIComponent(`Quick question regarding ${selectedLead.name}`)}&body=${encodeURIComponent(selectedLead.ai_outreach || "")}`}
                    className="flex items-center gap-2 text-xs text-[var(--accent)] hover:underline px-3 py-2.5 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]"
                  >
                    <span className="text-[var(--text-muted)]">Email</span>
                    <span className="ml-auto truncate max-w-[180px]">{selectedLead.email}</span>
                  </a>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Outreach</p>
                <div className="flex items-center gap-3">
                  {selectedLead.ai_outreach && (
                    <button
                      onClick={() => void copyToClipboard(selectedLead.ai_outreach!, "Outreach message")}
                      className="text-[11px] text-[var(--accent)] hover:underline"
                    >
                      Copy
                    </button>
                  )}
                  <button
                    onClick={() => void handleRegenerateOutreach()}
                    disabled={isRegeneratingOutreach}
                    className="text-[11px] text-[var(--accent)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRegeneratingOutreach ? "Regenerating..." : "Regenerate"}
                  </button>
                </div>
              </div>
              <div className="p-4 bg-[var(--surface-elevated)] rounded-xl text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed border border-[var(--border-subtle)]">
                {selectedLead.ai_outreach || "No outreach draft yet. Click Regenerate to create one."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
