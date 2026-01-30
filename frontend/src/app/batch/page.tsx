"use client";

import { useState } from "react";
import { scrapeBatch } from "@/lib/api";

interface Target {
  city: string;
  category: string;
  limit: number;
}

export default function BatchQueue() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState(50);
  const [pasteText, setPasteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const addTarget = () => {
    if (city && category) {
      setTargets([...targets, { city, category, limit }]);
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
      const parts = line.split(/[,\-]/).map((p) => p.trim());
      if (parts.length >= 2) {
        const [cityPart, categoryPart, limitPart] = parts;
        newTargets.push({
          city: cityPart,
          category: categoryPart,
          limit: limitPart ? parseInt(limitPart) || 50 : 50,
        });
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
      const result = await scrapeBatch(targets);
      setMessage({
        type: "success",
        text: `Batch job started! Job ID: ${result.job_id}. Processing ${targets.length} targets.`,
      });
      setTargets([]);
    } catch (err) {
      setMessage({
        type: "error",
        text: "Failed to start batch job. Make sure the API is running.",
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Batch Queue</h1>

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
        {/* Add Target Form */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Add Target</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., London, UK"
                className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--foreground-muted)] mb-1">Industry</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Dentist"
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
                <option value={10}>10 leads</option>
                <option value={20}>20 leads</option>
                <option value={50}>50 leads</option>
                <option value={100}>100 leads</option>
              </select>
            </div>
            <button
              onClick={addTarget}
              disabled={!city || !category}
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
            Paste multiple targets (City, Industry, Limit per line)
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="London, Dentist, 50
Mumbai, Gym, 30
Sydney, Plumber, 20"
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
          Queue ({targets.length} targets)
        </h3>

        {targets.length === 0 ? (
          <p className="text-[var(--foreground-muted)] text-sm">
            No targets in queue. Add some above!
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {targets.map((target, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 px-3 bg-[var(--background-tertiary)] rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <span className="text-white font-medium">{target.city}</span>
                  <span className="text-[var(--foreground-muted)]">-</span>
                  <span className="text-[var(--foreground-muted)]">{target.category}</span>
                  <span className="text-xs text-[var(--accent)]">{target.limit} leads</span>
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
          {isLoading ? "Running..." : `Run All (${targets.length} targets)`}
        </button>
      </div>
    </div>
  );
}
