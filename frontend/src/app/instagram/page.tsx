"use client";

import { useState, useEffect } from "react";
import { scrapeInstagram, getSettings, Setting } from "@/lib/api";

interface Target {
  keyword: string;
  limit: number;
  followers_min?: number;
  followers_max?: number;
  score_threshold?: number;
}

export default function InstagramPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [keyword, setKeyword] = useState("");
  const [limit, setLimit] = useState(50);
  const [followersMin, setFollowersMin] = useState<number | undefined>(undefined);
  const [followersMax, setFollowersMax] = useState<number | undefined>(undefined);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [globalDefaults, setGlobalDefaults] = useState({ min: 500, max: 5000 });

  useEffect(() => {
    getSettings().then((settings: Setting[]) => {
      const minSetting = settings.find(s => s.key === "instagram_followers_min");
      const maxSetting = settings.find(s => s.key === "instagram_followers_max");
      setGlobalDefaults({
        min: minSetting ? parseInt(minSetting.value) : 500,
        max: maxSetting ? parseInt(maxSetting.value) : 5000,
      });
    }).catch(() => {});
  }, []);

  const addTarget = () => {
    if (keyword) {
      const newTarget: Target = { keyword, limit };
      if (useCustomRange) {
        newTarget.followers_min = followersMin;
        newTarget.followers_max = followersMax;
      }
      setTargets([...targets, newTarget]);
      setKeyword("");
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
      const parts = line.split(",").map((p) => p.trim());
      const [keywordPart, limitPart, minPart, maxPart] = parts;
      if (keywordPart) {
        const target: Target = {
          keyword: keywordPart,
          limit: limitPart ? parseInt(limitPart) || 50 : 50,
        };
        if (minPart) target.followers_min = parseInt(minPart) || undefined;
        if (maxPart) target.followers_max = parseInt(maxPart) || undefined;
        newTargets.push(target);
      }
    }

    if (newTargets.length > 0) {
      setTargets([...targets, ...newTargets]);
      setPasteText("");
    }
  };

  const runBatch = async () => {
    if (targets.length === 0) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await scrapeInstagram(targets);
      setMessage({
        type: "success",
        text: `Instagram job started. Job ID: ${result.job_id}. Processing ${targets.length} keywords.`,
      });
      setTargets([]);
    } catch (err) {
      setMessage({
        type: "error",
        text: "Failed to start Instagram scrape. Make sure the API is running.",
      });
      console.error("Failed to start Instagram scrape:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--fg-primary)] tracking-[-0.025em] mb-8">Instagram</h1>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--fg-primary)] mb-4">Add Keyword</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Search Keyword</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g., makeup artist london"
                className="field-inset w-full px-4 py-2.5 text-sm text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Limit</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="field-inset w-full px-4 py-2.5 text-sm text-[var(--fg-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
              >
                <option value={10}>10 profiles</option>
                <option value={20}>20 profiles</option>
                <option value={50}>50 profiles</option>
                <option value={100}>100 profiles</option>
              </select>
            </div>

            <div className="pt-3 border-t border-[var(--border)]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomRange}
                  onChange={(e) => setUseCustomRange(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-[var(--accent)]"
                />
                <span className="text-xs text-[var(--fg-muted)]">Custom follower range</span>
              </label>

              {useCustomRange && (
                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  <div>
                    <label className="block text-[11px] text-[var(--fg-muted)] mb-1">Min</label>
                    <input
                      type="number"
                      value={followersMin ?? ""}
                      onChange={(e) => setFollowersMin(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={String(globalDefaults.min)}
                      className="field-inset w-full px-3 py-2 text-[var(--fg-primary)] text-xs placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--fg-muted)] mb-1">Max</label>
                    <input
                      type="number"
                      value={followersMax ?? ""}
                      onChange={(e) => setFollowersMax(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={String(globalDefaults.max)}
                      className="field-inset w-full px-3 py-2 text-[var(--fg-primary)] text-xs placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={addTarget}
              disabled={!keyword}
              className="w-full py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--fg-primary)] text-sm font-medium rounded-xl transition-all border border-[var(--border)] hover:border-[var(--border-hover)]"
            >
              + Add to Queue
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--fg-primary)] mb-4">Quick Paste</h3>
          <p className="text-xs text-[var(--fg-muted)] mb-3">
            Format: <code className="text-[var(--fg-primary)]">keyword, limit, min, max</code>
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="makeup artist london, 50
home baker mumbai, 30, 200, 2000
personal trainer sydney, 20, 1000, 10000"
            rows={6}
            className="field-inset w-full px-4 py-2.5 text-sm text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all resize-none font-mono"
          />
          <button
            onClick={parseAndAdd}
            disabled={!pasteText.trim()}
            className="mt-3 w-full py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--fg-primary)] text-sm font-medium rounded-xl transition-all border border-[var(--border)] hover:border-[var(--border-hover)]"
          >
            Parse & Add
          </button>
        </div>
      </div>

      <div className="mt-6 card p-6">
        <h3 className="text-sm font-semibold text-[var(--fg-primary)] mb-4">
          Queue ({targets.length} keywords)
        </h3>

        {targets.length === 0 ? (
          <p className="text-[var(--fg-muted)] text-sm">
            No keywords in queue. Add some above.
          </p>
        ) : (
          <div className="space-y-1.5 mb-4">
            {targets.map((target, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-tertiary)]/50"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-[var(--fg-primary)]">
                    {target.keyword}
                  </span>
                  <span className="text-[11px] text-[var(--accent-hover)] font-medium">{target.limit} profiles</span>
                  {(target.followers_min || target.followers_max) && (
                    <span className="text-[11px] text-[var(--fg-muted)]">
                      {target.followers_min ?? globalDefaults.min}-{target.followers_max ?? globalDefaults.max}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeTarget(index)}
                  className="text-[var(--error)] hover:text-[var(--fg-primary)] transition-colors text-xs"
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
          className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] hover:-translate-y-px hover:shadow-[0_0_20px_var(--accent-glow)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all duration-150"
        >
          {isLoading ? "Running..." : `Run All (${targets.length} keywords)`}
        </button>
      </div>

      <div className="mt-6 card-static p-5">
        <h4 className="text-xs font-semibold text-[var(--fg-primary)] mb-2.5 uppercase tracking-wider">
          Tips
        </h4>
        <ul className="text-xs text-[var(--fg-muted)] space-y-1.5 leading-relaxed">
          <li>Use location + profession: &quot;makeup artist london&quot;</li>
          <li>Include niche terms: &quot;home baker mumbai&quot;</li>
          <li>Adjust follower range per niche (bakers: 200-2000, trainers: 1000-10000)</li>
          <li>Default range: {globalDefaults.min}-{globalDefaults.max} (change in Settings)</li>
        </ul>
      </div>
    </div>
  );
}
