"use client";

import { useCallback, useEffect, useState } from "react";
import { getSettings, updateSetting, resetSettings } from "@/lib/api";

const DEFAULT_SCORING_CONFIG = {
  no_website: 50,
  high_reviews: 20,
  medium_reviews: 25,
  high_rating: 20,
  good_rating: 10,
  high_value_category: 10,
  low_rating_opportunity: 15,
};

const DEFAULT_INSTAGRAM_CONFIG = {
  followers_min: 500,
  followers_max: 50000,
  score_threshold: 50,
};

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [aiPrompt, setAiPrompt] = useState("");
  const [originalAiPrompt, setOriginalAiPrompt] = useState("");

  const [scoringConfig, setScoringConfig] = useState({ ...DEFAULT_SCORING_CONFIG });
  const [originalScoringConfig, setOriginalScoringConfig] = useState({ ...DEFAULT_SCORING_CONFIG });

  const [instagramConfig, setInstagramConfig] = useState({ ...DEFAULT_INSTAGRAM_CONFIG });
  const [originalInstagramConfig, setOriginalInstagramConfig] = useState({ ...DEFAULT_INSTAGRAM_CONFIG });

  const [savingSection, setSavingSection] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSettings();

      const promptSetting = data.find((s) => s.key === "ai_system_prompt");
      if (promptSetting) {
        setAiPrompt(promptSetting.value);
        setOriginalAiPrompt(promptSetting.value);
      }

      const newScoring = { ...DEFAULT_SCORING_CONFIG };
      data.forEach((s) => {
        if (s.key.startsWith("scoring_")) {
          const key = s.key.replace("scoring_", "") as keyof typeof scoringConfig;
          if (key in newScoring) {
            newScoring[key] = parseInt(s.value) || 0;
          }
        }
      });
      setScoringConfig(newScoring);
      setOriginalScoringConfig({ ...newScoring });

      const newInstagram = { ...DEFAULT_INSTAGRAM_CONFIG };
      data.forEach((s) => {
        if (s.key.startsWith("instagram_")) {
          const key = s.key.replace("instagram_", "") as keyof typeof instagramConfig;
          if (key in newInstagram) {
            newInstagram[key] = parseInt(s.value) || 0;
          }
        }
      });
      setInstagramConfig(newInstagram);
      setOriginalInstagramConfig({ ...newInstagram });
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveSection = async (
    section: string,
    saveFn: () => Promise<void>,
    successMsg: string,
    errorMsg: string
  ) => {
    setSavingSection(section);
    setMessage(null);
    try {
      await saveFn();
      setMessage({ type: "success", text: successMsg });
    } catch (err) {
      setMessage({ type: "error", text: errorMsg });
      console.error(`Failed to save ${section} settings:`, err);
    } finally {
      setSavingSection(null);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      await updateSetting("ai_system_prompt", aiPrompt);

      for (const [key, value] of Object.entries(scoringConfig)) {
        await updateSetting(`scoring_${key}`, String(value));
      }

      for (const [key, value] of Object.entries(instagramConfig)) {
        await updateSetting(`instagram_${key}`, String(value));
      }

      setMessage({ type: "success", text: "Settings saved." });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save settings." });
      console.error("Failed to save all settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const saveScoringConfig = () =>
    saveSection("scoring", async () => {
      for (const [key, value] of Object.entries(scoringConfig)) {
        await updateSetting(`scoring_${key}`, String(value));
      }
      setOriginalScoringConfig({ ...scoringConfig });
    }, "Scoring configuration saved.", "Failed to save scoring config.");

  const cancelScoringConfig = () => {
    setScoringConfig({ ...originalScoringConfig });
  };

  const saveInstagramConfig = () =>
    saveSection("instagram", async () => {
      for (const [key, value] of Object.entries(instagramConfig)) {
        await updateSetting(`instagram_${key}`, String(value));
      }
      setOriginalInstagramConfig({ ...instagramConfig });
    }, "Instagram settings saved.", "Failed to save Instagram settings.");

  const cancelInstagramConfig = () => {
    setInstagramConfig({ ...originalInstagramConfig });
  };

  const saveAiPrompt = () =>
    saveSection("ai", async () => {
      await updateSetting("ai_system_prompt", aiPrompt);
      setOriginalAiPrompt(aiPrompt);
    }, "AI prompt saved.", "Failed to save AI prompt.");

  const cancelAiPrompt = () => {
    setAiPrompt(originalAiPrompt);
  };

  const hasAiChanges = aiPrompt !== originalAiPrompt;
  const hasScoringChanges = JSON.stringify(scoringConfig) !== JSON.stringify(originalScoringConfig);
  const hasInstagramChanges = JSON.stringify(instagramConfig) !== JSON.stringify(originalInstagramConfig);
  const hasAnyChanges = hasAiChanges || hasScoringChanges || hasInstagramChanges;

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all settings to defaults?")) return;

    try {
      await resetSettings();
      await loadSettings();
      setMessage({ type: "success", text: "Settings reset to defaults." });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to reset settings." });
      console.error("Failed to reset settings:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-muted)] text-sm">Loading settings...</p>
      </div>
    );
  }

  const scoringFields = [
    { key: "no_website" as const, label: "No Website", desc: "Prime target — no online presence to capture search traffic" },
    { key: "high_reviews" as const, label: "High Reviews (100+)", desc: "Big business — may already have marketing sorted, harder sell" },
    { key: "medium_reviews" as const, label: "Established Local (30-99)", desc: "Sweet spot — proven demand, has budget, no digital presence yet" },
    { key: "high_rating" as const, label: "High Rating (4.5+)", desc: "Strong reputation — website would showcase their quality" },
    { key: "good_rating" as const, label: "Good Rating (4.0+)", desc: "Solid foundation — ready for online growth" },
    { key: "high_value_category" as const, label: "High-Value Category", desc: "Dentists, salons, HVAC, lawyers — high ticket, need websites" },
    { key: "low_rating_opportunity" as const, label: "Low Rating (<3.8)", desc: "Reputation fix — need a site to control the narrative" },
  ];

  return (
    <div className="stagger-children">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-[10px] text-[var(--accent)] tracking-[0.2em] uppercase mb-1">Configuration</p>
          <h1 className="font-display text-2xl text-[var(--text-primary)] tracking-[-0.02em]">Settings</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="btn-secondary px-4 py-2 text-xs"
          >
            Reset to Defaults
          </button>
          <button
            onClick={saveSettings}
            disabled={isSaving || !hasAnyChanges}
            className="btn-primary px-5 py-2 text-xs font-medium disabled:opacity-50"
          >
            {isSaving ? "Saving..." : hasAnyChanges ? "Save All" : "No Changes"}
          </button>
        </div>
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

      <div className="space-y-6">
        <div className="card-static p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
                <path d="M12 2a10 10 0 0 1 10 10"/>
                <circle cx="12" cy="12" r="6"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.02em]">AI System Prompt</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Controls how the AI qualifies leads and writes outreach messages
              </p>
            </div>
          </div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={16}
            className="field w-full px-4 py-3 text-[13px] leading-relaxed placeholder:text-[var(--text-dim)] focus:outline-none font-mono resize-y"
          />
          <p className="font-mono text-[10px] text-[var(--text-dim)] mt-2 tabular-nums">{aiPrompt.length} characters</p>
          {hasAiChanges && (
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={cancelAiPrompt}
                className="btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={saveAiPrompt}
                disabled={savingSection === "ai"}
                className="btn-primary px-5 py-2 text-xs font-medium disabled:opacity-50"
              >
                {savingSection === "ai" ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        <div className="card-static p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"/>
                <path d="M7 16l4-8 4 4 5-6"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.02em]">Scoring</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Points added to lead score per condition (0-100 scale)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {scoringFields.map(({ key, label, desc }) => (
              <div key={key} className="p-4 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[var(--text-primary)]">{label}</label>
                  <span className="font-mono text-xs text-[var(--accent)] tabular-nums">+{scoringConfig[key]}</span>
                </div>
                <p className="text-[11px] text-[var(--text-dim)] mb-3">{desc}</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoringConfig[key]}
                  onChange={(e) =>
                    setScoringConfig({ ...scoringConfig, [key]: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            ))}
          </div>
          {hasScoringChanges && (
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-[var(--border-subtle)]">
              <button
                onClick={cancelScoringConfig}
                className="btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={saveScoringConfig}
                disabled={savingSection === "scoring"}
                className="btn-primary px-5 py-2 text-xs font-medium disabled:opacity-50"
              >
                {savingSection === "scoring" ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        <div className="card-static p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.02em]">Instagram</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Filters for Instagram lead discovery
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
              <label className="block font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Min Followers</label>
              <p className="text-[11px] text-[var(--text-dim)] mb-3">Below this = too small to convert</p>
              <input
                type="number"
                value={instagramConfig.followers_min}
                onChange={(e) =>
                  setInstagramConfig({ ...instagramConfig, followers_min: parseInt(e.target.value) || 0 })
                }
                className="field w-full px-4 py-3 text-sm focus:outline-none"
              />
            </div>

            <div className="p-4 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
              <label className="block font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Max Followers</label>
              <p className="text-[11px] text-[var(--text-dim)] mb-3">Above this = already has agency or in-house</p>
              <input
                type="number"
                value={instagramConfig.followers_max}
                onChange={(e) =>
                  setInstagramConfig({ ...instagramConfig, followers_max: parseInt(e.target.value) || 0 })
                }
                className="field w-full px-4 py-3 text-sm focus:outline-none"
              />
            </div>

            <div className="p-4 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
              <label className="block font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Score Threshold</label>
              <p className="text-[11px] text-[var(--text-dim)] mb-3">Minimum score to qualify as a lead</p>
              <input
                type="number"
                value={instagramConfig.score_threshold}
                onChange={(e) =>
                  setInstagramConfig({ ...instagramConfig, score_threshold: parseInt(e.target.value) || 0 })
                }
                min="0"
                max="100"
                className="field w-full px-4 py-3 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="impact-box mt-4">
            <p className="text-[11px] text-[var(--text-secondary)]">
              Only profiles with <span className="text-[var(--text-primary)] font-medium">{instagramConfig.followers_min}-{instagramConfig.followers_max}</span> followers and score ≥ <span className="text-[var(--text-primary)] font-medium">{instagramConfig.score_threshold}</span> will be included.
            </p>
          </div>

          {hasInstagramChanges && (
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-[var(--border-subtle)]">
              <button
                onClick={cancelInstagramConfig}
                className="btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={saveInstagramConfig}
                disabled={savingSection === "instagram"}
                className="btn-primary px-5 py-2 text-xs font-medium disabled:opacity-50"
              >
                {savingSection === "instagram" ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        <div className="card-static p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2H3v16h5v4l4-4h5l4-4V2z"/>
                <path d="M10 8h4"/>
                <path d="M10 12h4"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.02em]">Server Integrations</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Configured via server environment variables
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
              <code className="px-3 py-1.5 bg-[var(--surface-card)] rounded-lg text-[var(--text-primary)] font-mono text-xs">APIFY_API_TOKEN</code>
              <span className="text-xs text-[var(--text-muted)]">Google Maps & Instagram scraping</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
              <code className="px-3 py-1.5 bg-[var(--surface-card)] rounded-lg text-[var(--text-primary)] font-mono text-xs">GEMINI_API_KEY</code>
              <span className="text-xs text-[var(--text-muted)]">AI outreach generation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
