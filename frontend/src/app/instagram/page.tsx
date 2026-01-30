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
  
  // Global defaults from settings
  const [globalDefaults, setGlobalDefaults] = useState({ min: 500, max: 5000 });

  useEffect(() => {
    // Load global defaults from settings
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
      // Keep custom range settings for next add
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
      // Format: keyword, limit, min_followers, max_followers
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
        text: `Instagram job started! Job ID: ${result.job_id}. Processing ${targets.length} keywords.`,
      });
      setTargets([]);
    } catch (err) {
      setMessage({
        type: "error",
        text: "Failed to start Instagram scrape. Make sure the API is running.",
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Instagram Scraper</h1>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Keyword Form */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Add Keyword</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-1">Search Keyword</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g., makeup artist london"
                className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-1">Limit</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent)]"
              >
                <option value={10}>10 profiles</option>
                <option value={20}>20 profiles</option>
                <option value={50}>50 profiles</option>
                <option value={100}>100 profiles</option>
              </select>
            </div>
            
            {/* Custom Follower Range Toggle */}
            <div className="pt-2 border-t border-[var(--border)]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomRange}
                  onChange={(e) => setUseCustomRange(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-[var(--foreground-muted)]">Custom follower range</span>
              </label>
              
              {useCustomRange && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <label className="block text-xs text-[var(--foreground-muted)] mb-1">Min Followers</label>
                    <input
                      type="number"
                      value={followersMin ?? ""}
                      onChange={(e) => setFollowersMin(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={String(globalDefaults.min)}
                      className="w-full px-2 py-1.5 bg-[var(--background-tertiary)] border border-[var(--border)] rounded text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--foreground-muted)] mb-1">Max Followers</label>
                    <input
                      type="number"
                      value={followersMax ?? ""}
                      onChange={(e) => setFollowersMax(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={String(globalDefaults.max)}
                      className="w-full px-2 py-1.5 bg-[var(--background-tertiary)] border border-[var(--border)] rounded text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={addTarget}
              disabled={!keyword}
              className="w-full py-2.5 bg-[var(--background-tertiary)] hover:bg-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors border border-[var(--border)]"
            >
              + Add to Queue
            </button>
          </div>
        </div>

        {/* Quick Paste */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Paste</h3>
          <p className="text-sm text-[var(--foreground-muted)] mb-3">
            Format: <code className="text-white">keyword, limit, min, max</code>
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="makeup artist london, 50
home baker mumbai, 30, 200, 2000
personal trainer sydney, 20, 1000, 10000"
            rows={6}
            className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)] resize-none font-mono text-sm"
          />
          <button
            onClick={parseAndAdd}
            disabled={!pasteText.trim()}
            className="mt-3 w-full py-2.5 bg-[var(--background-tertiary)] hover:bg-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors border border-[var(--border)]"
          >
            Parse & Add
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div className="mt-6 bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">
          Queue ({targets.length} keywords)
        </h3>

        {targets.length === 0 ? (
          <p className="text-[var(--foreground-muted)] text-sm">
            No keywords in queue. Add some above!
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {targets.map((target, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 px-3 bg-[var(--background-tertiary)] rounded-lg"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-white font-medium">📸 {target.keyword}</span>
                  <span className="text-xs text-[var(--accent)]">{target.limit} profiles</span>
                  {(target.followers_min || target.followers_max) && (
                    <span className="text-xs text-purple-400">
                      {target.followers_min ?? globalDefaults.min} - {target.followers_max ?? globalDefaults.max} followers
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeTarget(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={runBatch}
          disabled={targets.length === 0 || isLoading}
          className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {isLoading ? "Running..." : `Run All (${targets.length} keywords)`}
        </button>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-[var(--background-tertiary)] rounded-xl border border-[var(--border)]">
        <h4 className="text-sm font-semibold text-white mb-2">💡 Tips for Instagram Keywords</h4>
        <ul className="text-sm text-[var(--foreground-muted)] space-y-1">
          <li>• Use location + profession: &quot;makeup artist london&quot;</li>
          <li>• Include niche terms: &quot;home baker mumbai&quot;</li>
          <li>• Adjust follower range per niche (bakers: 200-2000, trainers: 1000-10000)</li>
          <li>• Default range: {globalDefaults.min} - {globalDefaults.max} (change in Settings)</li>
        </ul>
      </div>
    </div>
  );
}
