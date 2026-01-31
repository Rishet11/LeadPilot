
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

  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--fg-primary)] tracking-[-0.025em] mb-8">Batch Queue</h1>

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
          <h3 className="text-sm font-semibold text-[var(--fg-primary)] mb-4">Add Target</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., London, UK"
                className="field-inset w-full px-4 py-2.5 text-sm text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Industry</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Dentist"
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
                <option value={10}>10 leads</option>
                <option value={20}>20 leads</option>
                <option value={50}>50 leads</option>
                <option value={100}>100 leads</option>
              </select>
            </div>
            <button
              onClick={addTarget}
              disabled={!city || !category}
              className="w-full py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--fg-primary)] text-sm font-medium rounded-xl transition-all border border-[var(--border)] hover:border-[var(--border-hover)]"
            >
              + Add to Queue
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--fg-primary)] mb-4">Quick Paste</h3>
          <p className="text-xs text-[var(--fg-muted)] mb-3">
            Paste multiple targets (City, Industry, Limit per line)
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="London, Dentist, 50
Mumbai, Gym, 30
Sydney, Plumber, 20"
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
          Queue ({targets.length} targets)
        </h3>

        {targets.length === 0 ? (
          <p className="text-[var(--fg-muted)] text-sm">
            No targets in queue. Add some above.
          </p>
        ) : (
          <div className="space-y-1.5 mb-4">
            {targets.map((target, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)]/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[var(--fg-primary)]">{target.city}</span>
                  <span className="text-[var(--fg-muted)]">/</span>
                  <span className="text-sm text-[var(--fg-muted)]">{target.category}</span>
                  <span className="text-[11px] text-[var(--accent-hover)] font-medium">{target.limit}</span>
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
          {isLoading ? "Running..." : `Run All (${targets.length} targets)`}
        </button>
      </div>
    </div>
  );
}
