"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setStoredApiKey } from "@/lib/auth";
import { validateApiKey } from "@/lib/api";

export default function LoginPage() {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey) {
      setError("Please enter your API key");
      setLoading(false);
      return;
    }

    if (!trimmedKey.startsWith("lp_")) {
      setError("Invalid API key format. Keys start with 'lp_'");
      setLoading(false);
      return;
    }

    // Validate key with backend
    const isValid = await validateApiKey(trimmedKey);
    
    if (isValid) {
      setStoredApiKey(trimmedKey);
      router.push("/dashboard");
    } else {
      setError("Invalid API key. Please check and try again.");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
      <div className="w-full max-w-md px-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Lead<span className="text-[var(--accent-primary)]">Pilot</span>
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Enter your API key to access the dashboard
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="apiKey" 
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="lp_xxxxxxxxxxxxx"
              className="w-full px-4 py-3 bg-[var(--surface-card)] border border-[var(--border-default)] 
                         rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent
                         transition-all duration-200"
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] 
                       text-white font-medium rounded-xl transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Logging in...
              </span>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        {/* Help text */}
        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Don't have an API key?{" "}
          <a href="/" className="text-[var(--accent-primary)] hover:underline">
            Join the waitlist
          </a>
        </p>
      </div>
    </div>
  );
}
