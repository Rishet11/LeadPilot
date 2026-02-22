"use client";

import { useEffect, useState } from "react";
import { AgentTemplate, getAgentTemplates, getCurrentUsage, getUserFacingApiError, scrapeBatch } from "@/lib/api";

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
    const requiredCredits = targets.reduce(
      (sum, target) => sum + Math.max(1, Math.min(200, Number(target.limit) || 1)),
      0,
    );

    setIsLoading(true);
    setMessage(null);

    try {
      const usage = await getCurrentUsage().catch(() => null);
      if (usage && usage.remaining_credits !== null && requiredCredits > usage.remaining_credits) {
        setMessage({
          type: "error",
          text: `This batch needs ${requiredCredits} credits, but only ${usage.remaining_credits} are remaining.`,
        });
        return;
      }
      const result = await scrapeBatch(targets);
      setMessage({
        type: "success",
        text: `Batch job started. Job ID: ${result.job_id}. Processing ${targets.length} targets (${requiredCredits} credits).`,
      });
      setTargets([]);
    } catch (err) {
      setMessage({
        type: "error",
        text: getUserFacingApiError(err, "Failed to start batch job. Make sure the API is running."),
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
    <div className="stagger-children relative">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-[var(--accent-indigo)] to-[var(--accent-violet)] rounded-full blur-[150px] opacity-10 animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-gradient-to-tl from-[var(--accent-violet)] to-[var(--accent-indigo)] rounded-full blur-[150px] opacity-10" />
      </div>

      <div className="mb-8">
        <p className="font-mono text-[10px] text-[var(--accent-indigo)] drop-shadow-[0_0_8px_var(--glow-indigo)] tracking-widest uppercase mb-2 font-bold">Multi-Target</p>
        <h1 className="font-display text-3xl text-white font-bold tracking-tight drop-shadow-md">Batch Queue</h1>
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

      <div className="glass-glow rounded-2xl p-7 relative overflow-hidden transition-all hover:-translate-y-1 mb-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent-indigo)] to-[var(--accent-violet)] opacity-50" />
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--accent-indigo)]/20 to-[var(--accent-violet)]/20 border border-[var(--border-highlight)] shadow-[0_0_15px_var(--glow-indigo)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_white]">
              <path d="M4 7h16M4 12h16M4 17h10" />
              <circle cx="19" cy="17" r="2" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Niche Playbooks</h3>
            <p className="font-mono text-[10px] text-[var(--accent-indigo)] font-bold uppercase tracking-widest drop-shadow-[0_0_8px_var(--glow-indigo)]">Prebuilt queue templates</p>
          </div>
        </div>

        {isTemplatesLoading ? (
          <p className="text-xs text-[var(--text-muted)]">Loading playbooks...</p>
        ) : templates.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No playbooks available for this plan.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="rounded-xl border border-[var(--border-secondary)] bg-black/40 p-4 shadow-inner hover:border-[var(--border-highlight)] transition-colors group">
                <p className="text-sm font-bold text-white group-hover:text-[var(--accent-indigo)] transition-colors">{template.name}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5">{template.expected_outcome}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="font-mono text-[10px] bg-black/50 border border-[var(--border-secondary)] text-[var(--text-dim)] px-2 py-0.5 rounded-md drop-shadow-sm">{template.vertical}</span>
                  <span className="font-mono text-[10px] bg-[var(--accent-dim)] border border-[var(--accent)]/20 text-[var(--accent-indigo)] px-2 py-0.5 rounded-md drop-shadow-sm">{template.google_maps_targets.length} targets</span>
                </div>
                <button
                  onClick={() => applyTemplate(template)}
                  disabled={isLoading || applyingTemplateId === template.id}
                  className="mt-4 btn-secondary w-full py-2.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--border-highlight)] shadow-[0_0_15px_transparent] hover:shadow-[0_0_15px_var(--glow-indigo)]"
                >
                  {applyingTemplateId === template.id ? "Adding..." : "Add to Queue"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-glow rounded-2xl p-7 relative transition-all hover:-translate-y-1">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[var(--accent-indigo)]/20 to-transparent border border-[var(--border-highlight)] shadow-[0_0_15px_var(--glow-indigo)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_white]">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Add Target</h3>
              <p className="font-mono text-[10px] text-[var(--accent-indigo)] font-bold uppercase tracking-widest drop-shadow-[0_0_8px_var(--glow-indigo)]">Single entry</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-2 font-bold">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., London, UK"
                className="w-full px-4 py-3 text-sm bg-black/40 border border-[var(--border-secondary)] rounded-xl text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-2 font-bold">Industry</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Dentist"
                className="w-full px-4 py-3 text-sm bg-black/40 border border-[var(--border-secondary)] rounded-xl text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-2 font-bold">Limit</label>
              <div className="relative">
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-4 py-3 text-sm bg-black/40 border border-[var(--border-secondary)] rounded-xl text-white focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all appearance-none"
                >
                  <option value={10}>10 leads</option>
                  <option value={20}>20 leads</option>
                  <option value={50}>50 leads</option>
                  <option value={100}>100 leads</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>
            <button
              onClick={addTarget}
              disabled={isLoading || !city || !category}
              className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_var(--glow-indigo)] hover:shadow-[0_0_30px_var(--glow-violet)]"
            >
              + Add to Queue
            </button>
          </div>
        </div>

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
            Paste multiple targets (City, Industry, Limit per line)
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="London, Dentist, 50&#10;Mumbai, Gym, 30&#10;Sydney, Plumber, 20"
            rows={6}
            className="w-full px-4 py-3 text-sm bg-black/40 border border-[var(--border-secondary)] rounded-xl text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] shadow-inner transition-all resize-none font-mono"
          />
          <button
            onClick={parseAndAdd}
            disabled={isLoading || !pasteText.trim()}
            className="mt-4 btn-secondary w-full py-3.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--border-highlight)] shadow-[0_0_15px_transparent] hover:shadow-[0_0_15px_var(--glow-violet)]"
          >
            Parse & Add
          </button>
        </div>
      </div>

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
              <p className="font-mono text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">{targets.length} targets</p>
            </div>
          </div>
          {targets.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] bg-black/50 border border-[var(--border-secondary)] text-[var(--text-dim)] px-2 py-0.5 rounded-md drop-shadow-sm">{totalLeadBudget} lead budget</span>
              <span className="font-mono text-[10px] bg-[var(--success-dim)] border border-[var(--success)]/20 text-[var(--success)] px-3 py-1 rounded-md drop-shadow-sm font-bold">Ready</span>
              <button
                onClick={clearQueue}
                className="btn-secondary px-4 py-2 text-[10px] font-mono uppercase tracking-widest border border-[var(--border-secondary)] hover:border-[var(--error-dim)] hover:bg-[var(--error-dim)]/50 hover:text-[var(--error)] transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {targets.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-[var(--border-secondary)] rounded-xl bg-black/20">
            <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">No targets in queue</p>
            <p className="text-[var(--text-dim)] text-xs">Add targets above to get started</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {targets.map((target, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-[var(--bg-secondary)]/50 border border-[var(--border-secondary)] hover:border-[var(--border-highlight)] transition-colors glass rounded-xl shadow-sm hover:shadow-[0_0_15px_var(--glow-indigo)]"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] text-[var(--text-dim)] w-8 tracking-widest">#{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-sm font-bold text-white drop-shadow-sm">{target.city}</span>
                  <span className="text-[var(--accent-indigo)] font-bold">/</span>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{target.category}</span>
                  <span className="font-mono text-[10px] bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[var(--text-secondary)] px-2 py-0.5 rounded-md drop-shadow-sm ml-2">Limit {target.limit}</span>
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

        <button
          onClick={runBatch}
          disabled={targets.length === 0 || isLoading}
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
              <span>Run Batch ({targets.length} targets / {totalLeadBudget} leads)</span>
              <svg className="w-5 h-5 drop-shadow-[0_0_8px_white]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
