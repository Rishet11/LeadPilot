"use client";

import { useState, useEffect } from "react";
import { getSettings, updateSetting, resetSettings, Setting } from "@/lib/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [aiPrompt, setAiPrompt] = useState("");
  const [originalAiPrompt, setOriginalAiPrompt] = useState("");

  const [scoringConfig, setScoringConfig] = useState({
    no_website: 50,
    high_reviews: 30,
    medium_reviews: 15,
    high_rating: 20,
    good_rating: 10,
    high_value_category: 10,
    low_rating_opportunity: 15,
  });
  const [originalScoringConfig, setOriginalScoringConfig] = useState({ ...scoringConfig });

  const [instagramConfig, setInstagramConfig] = useState({
    followers_min: 300,
    followers_max: 10000,
    score_threshold: 50,
  });
  const [originalInstagramConfig, setOriginalInstagramConfig] = useState({ ...instagramConfig });

  const [savingSection, setSavingSection] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await getSettings();
      setSettings(data);

      const promptSetting = data.find((s) => s.key === "ai_system_prompt");
      if (promptSetting) {
        setAiPrompt(promptSetting.value);
        setOriginalAiPrompt(promptSetting.value);
      }

      const newScoring = { ...scoringConfig };
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

      const newInstagram = { ...instagramConfig };
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
  };

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
        <p className="text-[var(--fg-muted)] text-sm">Loading settings...</p>
      </div>
    );
  }

  const scoringFields = [
    { key: "no_website" as const, label: "No Website", desc: "Prime target — no online presence to capture search traffic" },
    { key: "high_reviews" as const, label: "High Reviews (100+)", desc: "Proven demand — high volume means established customer base" },
    { key: "medium_reviews" as const, label: "Medium Reviews (30-99)", desc: "Growing business — enough traction to justify digital investment" },
    { key: "high_rating" as const, label: "High Rating (4.5+)", desc: "Strong reputation — website would showcase their quality" },
    { key: "good_rating" as const, label: "Good Rating (4.0+)", desc: "Solid foundation — ready for online growth" },
    { key: "high_value_category" as const, label: "High-Value Category", desc: "Dentists, salons, HVAC, lawyers — high ticket, need websites" },
    { key: "low_rating_opportunity" as const, label: "Low Rating (<3.8)", desc: "Reputation fix — need a site to control the narrative" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-[var(--fg-primary)] tracking-[-0.025em]">Settings</h1>
        <div className="flex gap-2.5">
          <button
            onClick={handleReset}
            className="px-3.5 py-1.5 text-xs rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
          >
            Reset to Defaults
          </button>
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] hover:-translate-y-px hover:shadow-[0_0_20px_var(--accent-glow)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none text-white text-xs font-semibold rounded-xl transition-all duration-150"
          >
            {isSaving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-3.5 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-[var(--success-muted)] border border-[var(--success)]/15 text-[var(--success)]"
              : "bg-[var(--error-muted)] border border-[var(--error)]/15 text-[var(--error)]"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--fg-primary)] mb-1">AI System Prompt</h3>
          <p className="text-xs text-[var(--fg-muted)] mb-4">
            Controls how the AI qualifies leads and writes outreach messages. Defines qualification tiers, scoring logic, and message tone.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={16}
            className="field-inset w-full px-4 py-2.5 text-[13px] leading-relaxed text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all font-mono resize-y"
          />
          <p className="text-[11px] text-[var(--fg-muted)] mt-2 tabular-nums">{aiPrompt.length} characters</p>
          {hasAiChanges && (
            <div className="flex justify-end gap-2.5 mt-3">
              <button
                onClick={cancelAiPrompt}
                className="px-3 py-1.5 text-xs rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveAiPrompt}
                disabled={savingSection === "ai"}
                className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] hover:-translate-y-px hover:shadow-[0_0_20px_var(--accent-glow)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none text-white text-xs font-semibold rounded-xl transition-all duration-150"
              >
                {savingSection === "ai" ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--fg-primary)] mb-1">Scoring</h3>
          <p className="text-xs text-[var(--fg-muted)] mb-5">
            Points added to lead score per condition. Leads are scored 0-100 — higher score means higher conversion likelihood.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scoringFields.map(({ key, label, desc }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-xs text-[var(--fg-muted)]">{label}</label>
                  <span className="text-xs font-medium text-[var(--fg-primary)] tabular-nums">+{scoringConfig[key]}</span>
                </div>
                <p className="text-[11px] text-[var(--fg-muted)]/60 mb-1.5">{desc}</p>
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
            <div className="flex justify-end gap-2.5 mt-4 pt-4 border-t border-[var(--border)]">
              <button
                onClick={cancelScoringConfig}
                className="px-3 py-1.5 text-xs rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveScoringConfig}
                disabled={savingSection === "scoring"}
                className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] hover:-translate-y-px hover:shadow-[0_0_20px_var(--accent-glow)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none text-white text-xs font-semibold rounded-xl transition-all duration-150"
              >
                {savingSection === "scoring" ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--fg-primary)] mb-1">Instagram</h3>
          <p className="text-xs text-[var(--fg-muted)] mb-5">
            Filters for Instagram lead discovery. Targets micro-businesses in the sweet spot — big enough to pay, small enough to need you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[var(--fg-muted)] mb-1">Min Followers</label>
              <p className="text-[11px] text-[var(--fg-muted)]/60 mb-2">Below this = too small to convert</p>
              <input
                type="number"
                value={instagramConfig.followers_min}
                onChange={(e) =>
                  setInstagramConfig({ ...instagramConfig, followers_min: parseInt(e.target.value) || 0 })
                }
                className="field-inset w-full px-4 py-2.5 text-sm text-[var(--fg-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--fg-muted)] mb-1">Max Followers</label>
              <p className="text-[11px] text-[var(--fg-muted)]/60 mb-2">Above this = already has agency or in-house</p>
              <input
                type="number"
                value={instagramConfig.followers_max}
                onChange={(e) =>
                  setInstagramConfig({ ...instagramConfig, followers_max: parseInt(e.target.value) || 0 })
                }
                className="field-inset w-full px-4 py-2.5 text-sm text-[var(--fg-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--fg-muted)] mb-1">Score Threshold</label>
              <p className="text-[11px] text-[var(--fg-muted)]/60 mb-2">Minimum score to qualify as a lead</p>
              <input
                type="number"
                value={instagramConfig.score_threshold}
                onChange={(e) =>
                  setInstagramConfig({ ...instagramConfig, score_threshold: parseInt(e.target.value) || 0 })
                }
                min="0"
                max="100"
                className="field-inset w-full px-4 py-2.5 text-sm text-[var(--fg-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
              />
            </div>
          </div>

          <p className="text-[11px] text-[var(--fg-muted)] mt-3">
            Only profiles with {instagramConfig.followers_min}-{instagramConfig.followers_max} followers and score ≥ {instagramConfig.score_threshold} will be included.
          </p>
          {hasInstagramChanges && (
            <div className="flex justify-end gap-2.5 mt-4 pt-4 border-t border-[var(--border)]">
              <button
                onClick={cancelInstagramConfig}
                className="px-3 py-1.5 text-xs rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveInstagramConfig}
                disabled={savingSection === "instagram"}
                className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] hover:-translate-y-px hover:shadow-[0_0_20px_var(--accent-glow)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none text-white text-xs font-semibold rounded-xl transition-all duration-150"
              >
                {savingSection === "instagram" ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        <div className="card-static p-6">
          <h3 className="text-sm font-semibold text-[var(--fg-primary)] mb-1">API</h3>
          <p className="text-xs text-[var(--fg-muted)] mb-4">
            Configured via server environment variables.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <code className="px-2.5 py-1 bg-[var(--bg-tertiary)] rounded-lg text-[var(--fg-primary)] font-mono">APIFY_API_TOKEN</code>
              <span className="text-[var(--fg-muted)]">Google Maps & Instagram</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <code className="px-2.5 py-1 bg-[var(--bg-tertiary)] rounded-lg text-[var(--fg-primary)] font-mono">GEMINI_API_KEY</code>
              <span className="text-[var(--fg-muted)]">AI outreach generation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
