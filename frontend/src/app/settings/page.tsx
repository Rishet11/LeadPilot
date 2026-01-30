"use client";

import { useState, useEffect } from "react";
import { getSettings, updateSetting, resetSettings, Setting } from "@/lib/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Local state for editing
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
    followers_min: 500,
    followers_max: 5000,
    score_threshold: 60,
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

      // Parse settings into local state
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

      // Parse Instagram settings
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

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Save AI prompt
      await updateSetting("ai_system_prompt", aiPrompt);

      // Save scoring config
      for (const [key, value] of Object.entries(scoringConfig)) {
        await updateSetting(`scoring_${key}`, String(value));
      }

      // Save Instagram config
      for (const [key, value] of Object.entries(instagramConfig)) {
        await updateSetting(`instagram_${key}`, String(value));
      }

      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save settings." });
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Per-section save functions
  const saveScoringConfig = async () => {
    setSavingSection("scoring");
    setMessage(null);
    try {
      for (const [key, value] of Object.entries(scoringConfig)) {
        await updateSetting(`scoring_${key}`, String(value));
      }
      setOriginalScoringConfig({ ...scoringConfig });
      setMessage({ type: "success", text: "Scoring configuration saved!" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save scoring config." });
      console.error(err);
    } finally {
      setSavingSection(null);
    }
  };

  const cancelScoringConfig = () => {
    setScoringConfig({ ...originalScoringConfig });
  };

  const saveInstagramConfig = async () => {
    setSavingSection("instagram");
    setMessage(null);
    try {
      for (const [key, value] of Object.entries(instagramConfig)) {
        await updateSetting(`instagram_${key}`, String(value));
      }
      setOriginalInstagramConfig({ ...instagramConfig });
      setMessage({ type: "success", text: "Instagram settings saved!" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save Instagram settings." });
      console.error(err);
    } finally {
      setSavingSection(null);
    }
  };

  const cancelInstagramConfig = () => {
    setInstagramConfig({ ...originalInstagramConfig });
  };

  const saveAiPrompt = async () => {
    setSavingSection("ai");
    setMessage(null);
    try {
      await updateSetting("ai_system_prompt", aiPrompt);
      setOriginalAiPrompt(aiPrompt);
      setMessage({ type: "success", text: "AI prompt saved!" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save AI prompt." });
      console.error(err);
    } finally {
      setSavingSection(null);
    }
  };

  const cancelAiPrompt = () => {
    setAiPrompt(originalAiPrompt);
  };

  // Check if sections have unsaved changes
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
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--foreground-muted)]">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-[var(--foreground-muted)] hover:text-white transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-500/20 border border-green-500/50 text-green-300"
              : "bg-red-500/20 border border-red-500/50 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* AI Prompt Editor */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">AI System Prompt</h3>
          <p className="text-sm text-[var(--foreground-muted)] mb-3">
            This prompt defines the personality and behavior of the AI when generating outreach messages.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
          />
          {hasAiChanges && (
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={cancelAiPrompt}
                className="px-4 py-2 text-sm text-[var(--foreground-muted)] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAiPrompt}
                disabled={savingSection === "ai"}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {savingSection === "ai" ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* Scoring Configuration */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Scoring Configuration</h3>
          <p className="text-sm text-[var(--foreground-muted)] mb-4">
            Adjust how many points each condition adds to the lead score (0-100 scale).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                No Website
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoringConfig.no_website}
                  onChange={(e) =>
                    setScoringConfig({ ...scoringConfig, no_website: parseInt(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="w-12 text-center text-white font-medium">
                  +{scoringConfig.no_website}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                High Reviews (100+)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoringConfig.high_reviews}
                  onChange={(e) =>
                    setScoringConfig({ ...scoringConfig, high_reviews: parseInt(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="w-12 text-center text-white font-medium">
                  +{scoringConfig.high_reviews}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                Medium Reviews (30-99)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoringConfig.medium_reviews}
                  onChange={(e) =>
                    setScoringConfig({ ...scoringConfig, medium_reviews: parseInt(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="w-12 text-center text-white font-medium">
                  +{scoringConfig.medium_reviews}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                High Rating (4.5+)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoringConfig.high_rating}
                  onChange={(e) =>
                    setScoringConfig({ ...scoringConfig, high_rating: parseInt(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="w-12 text-center text-white font-medium">
                  +{scoringConfig.high_rating}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                Good Rating (4.0+)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoringConfig.good_rating}
                  onChange={(e) =>
                    setScoringConfig({ ...scoringConfig, good_rating: parseInt(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="w-12 text-center text-white font-medium">
                  +{scoringConfig.good_rating}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                High-Value Category
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoringConfig.high_value_category}
                  onChange={(e) =>
                    setScoringConfig({
                      ...scoringConfig,
                      high_value_category: parseInt(e.target.value),
                    })
                  }
                  className="flex-1"
                />
                <span className="w-12 text-center text-white font-medium">
                  +{scoringConfig.high_value_category}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                Low Rating Opportunity (&lt;3.8)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoringConfig.low_rating_opportunity}
                  onChange={(e) =>
                    setScoringConfig({
                      ...scoringConfig,
                      low_rating_opportunity: parseInt(e.target.value),
                    })
                  }
                  className="flex-1"
                />
                <span className="w-12 text-center text-white font-medium">
                  +{scoringConfig.low_rating_opportunity}
                </span>
              </div>
            </div>
          </div>
          {hasScoringChanges && (
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--border)]">
              <button
                onClick={cancelScoringConfig}
                className="px-4 py-2 text-sm text-[var(--foreground-muted)] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveScoringConfig}
                disabled={savingSection === "scoring"}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {savingSection === "scoring" ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* Instagram Configuration */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">📸 Instagram Settings</h3>
          <p className="text-sm text-[var(--foreground-muted)] mb-4">
            Configure follower range and score threshold for Instagram lead discovery.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                Min Followers
              </label>
              <input
                type="number"
                value={instagramConfig.followers_min}
                onChange={(e) =>
                  setInstagramConfig({ ...instagramConfig, followers_min: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                Max Followers
              </label>
              <input
                type="number"
                value={instagramConfig.followers_max}
                onChange={(e) =>
                  setInstagramConfig({ ...instagramConfig, followers_max: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-2">
                Score Threshold
              </label>
              <input
                type="number"
                value={instagramConfig.score_threshold}
                onChange={(e) =>
                  setInstagramConfig({ ...instagramConfig, score_threshold: parseInt(e.target.value) || 0 })
                }
                min="0"
                max="100"
                className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <p className="text-xs text-[var(--foreground-muted)] mt-3">
            Only profiles with {instagramConfig.followers_min} - {instagramConfig.followers_max} followers and score ≥ {instagramConfig.score_threshold} will be included.
          </p>
          {hasInstagramChanges && (
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--border)]">
              <button
                onClick={cancelInstagramConfig}
                className="px-4 py-2 text-sm text-[var(--foreground-muted)] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveInstagramConfig}
                disabled={savingSection === "instagram"}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {savingSection === "instagram" ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* API Info */}
        <div className="bg-[var(--background-tertiary)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            API keys are configured via environment variables on the server:
          </p>
          <ul className="mt-2 text-sm text-[var(--foreground-muted)] space-y-1">
            <li>• <code className="text-white">APIFY_API_TOKEN</code> - For Google Maps & Instagram scraping</li>
            <li>• <code className="text-white">GEMINI_API_KEY</code> - For AI outreach generation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
