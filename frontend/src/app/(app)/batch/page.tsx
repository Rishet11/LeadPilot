"use client";

import { useEffect, useState } from "react";
import { AgentTemplate, getAgentTemplates, scrapeBatch } from "@/lib/api";

interface Target {
  city: string;
  category: string;
  limit: number;
}

function normalizeTarget(raw: Target): Target | null {
  const city = raw.city.trim();
  const category = raw.category.trim();
  const limit = Math.max(1, Math.min(200, Number(raw.limit) || 50));

  if (!city || !category) {
    return null;
  }

  return { city, category, limit };
}

function dedupeTargets(items: Target[]): Target[] {
  const map = new Map<string, Target>();

  for (const item of items) {
    const normalized = normalizeTarget(item);
    if (!normalized) continue;
    const key = `${normalized.city.toLowerCase()}|${normalized.category.toLowerCase()}`;
    map.set(key, normalized);
  }

  return Array.from(map.values());
}

export default function BatchQueue() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState(50);
  const [pasteText, setPasteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(true);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templateData = await getAgentTemplates();
        setTemplates(templateData.slice(0, 6));
      } catch (err) {
        console.error("Failed to load templates:", err);
        setTemplates([]);
      } finally {
        setIsTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  const addTargets = (incoming: Target[]) => {
    if (!incoming.length) return 0;
    const merged = dedupeTargets([...targets, ...incoming]);
    const addedCount = Math.max(0, merged.length - targets.length);
    setTargets(merged);
    return addedCount;
  };

  const addTarget = () => {
    if (city && category) {
      const added = addTargets([{ city, category, limit }]);
      if (added === 0) {
        setMessage({
          type: "error",
          text: "Target already exists in queue.",
        });
      }
      setCity("");
      setCategory("");
      setLimit(50);
    }
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
      if (parts.length >= 2) {
        const [cityPart, categoryPart, limitPart] = parts;
        newTargets.push({
          city: cityPart,
          category: categoryPart,
          limit: limitPart && /^\d+$/.test(limitPart) ? parseInt(limitPart, 10) : 50,
        });
      }
    }

    if (newTargets.length > 0) {
      const added = addTargets(newTargets);
      setMessage({
        type: "success",
        text: `Parsed ${newTargets.length} rows. Added ${added} unique target(s).`,
      });
      setPasteText("");
    }
  };

  const applyTemplate = (template: AgentTemplate) => {
    setApplyingTemplateId(template.id);
    const incoming = template.google_maps_targets.map((t) => ({
      city: t.city,
      category: t.category,
      limit: t.limit,
    }));
    const added = addTargets(incoming);
    setMessage({
      type: "success",
      text: `Applied ${template.name}. Added ${added} unique target(s).`,
    });
    setApplyingTemplateId(null);
  };

  const runBatch = async () => {
    if (targets.length === 0) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await scrapeBatch(targets);
      setMessage({
        type: "success",
        text: `Batch job started. Job ID: ${result.job_id}. Processing ${targets.length} targets.`,
      });
      setTargets([]);
    } catch (err) {
      setMessage({
        type: "error",
        text: "Failed to start batch job. Make sure the API is running.",
      });
      console.error("Failed to start batch job:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearQueue = () => {
    setTargets([]);
    setMessage({
      type: "success",
      text: "Queue cleared.",
    });
  };

  const totalLeadBudget = targets.reduce((sum, target) => sum + target.limit, 0);

  return (
    <div className="stagger-children">
      <div className="mb-8">
        <p className="font-mono text-[10px] text-[var(--accent)] tracking-[0.2em] uppercase mb-2">Multi-Target</p>
        <h1 className="font-display text-2xl text-[var(--text-primary)] tracking-[-0.02em]">Batch Queue</h1>
      </div>

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

      <div className="card-static p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M4 12h16M4 17h10" />
              <circle cx="19" cy="17" r="2" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.02em]">Niche Playbooks</h3>
            <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Prebuilt queue templates</p>
          </div>
        </div>

        {isTemplatesLoading ? (
          <p className="text-xs text-[var(--text-muted)]">Loading playbooks...</p>
        ) : templates.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No playbooks available for this plan.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {templates.map((template) => (
              <div key={template.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3">
                <p className="text-xs font-medium text-[var(--text-primary)]">{template.name}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">{template.expected_outcome}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="tag font-mono text-[10px]">{template.vertical}</span>
                  <span className="tag font-mono text-[10px]">{template.google_maps_targets.length} targets</span>
                </div>
                <button
                  onClick={() => applyTemplate(template)}
                  disabled={isLoading || applyingTemplateId === template.id}
                  className="mt-3 btn-secondary w-full py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {applyingTemplateId === template.id ? "Adding..." : "Add Template to Queue"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-static p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.02em]">Add Target</h3>
              <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Single entry</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., London, UK"
                className="field w-full px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Industry</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Dentist"
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
                <option value={10}>10 leads</option>
                <option value={20}>20 leads</option>
                <option value={50}>50 leads</option>
                <option value={100}>100 leads</option>
              </select>
            </div>
            <button
              onClick={addTarget}
              disabled={isLoading || !city || !category}
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
            Paste multiple targets (City, Industry, Limit per line)
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="London, Dentist, 50
Mumbai, Gym, 30
Sydney, Plumber, 20"
            rows={6}
            className="field w-full px-4 py-3 text-sm placeholder:text-[var(--text-dim)] focus:outline-none resize-none font-mono"
          />
          <button
            onClick={parseAndAdd}
            disabled={isLoading || !pasteText.trim()}
            className="mt-4 btn-secondary w-full py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Parse & Add
          </button>
        </div>
      </div>

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
              <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{targets.length} targets</p>
            </div>
          </div>
          {targets.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="tag font-mono text-[10px]">{totalLeadBudget} lead budget</span>
              <span className="tag tag-gold font-mono text-[10px]">Ready</span>
              <button
                onClick={clearQueue}
                className="btn-secondary px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {targets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[var(--text-muted)] text-sm mb-1">No targets in queue</p>
            <p className="text-[var(--text-dim)] text-xs">Add targets above to get started</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {targets.map((target, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] text-[var(--text-dim)] w-6">#{index + 1}</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{target.city}</span>
                  <span className="text-[var(--text-dim)]">/</span>
                  <span className="text-sm text-[var(--text-secondary)]">{target.category}</span>
                  <span className="tag tag-gold font-mono text-[10px]">{target.limit}</span>
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
              <span>Run Batch ({targets.length} targets / {totalLeadBudget} leads)</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
