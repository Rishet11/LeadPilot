"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setStoredAuthToken } from "@/lib/auth";
import { loginWithGoogleIdToken } from "@/lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "pill" | "rectangular";
              text?: "continue_with" | "signin_with" | "signup_with";
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = "google-identity-services";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  const completeLogin = useCallback((token: string) => {
    setStoredAuthToken(token);
    router.push("/dashboard");
  }, [router]);

  const handleGoogleCredential = useCallback(async (response: { credential?: string }) => {
    if (!response?.credential) {
      setError("Google login failed. No credential received.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await loginWithGoogleIdToken(response.credential);
      completeLogin(result.access_token);
    } catch (err: unknown) {
      const fallback = "Google login failed. Please try again.";
      const message = err instanceof Error ? err.message : fallback;
      setError(message || fallback);
    } finally {
      setLoading(false);
    }
  }, [completeLogin]);

  useEffect(() => {
    if (!googleClientId || typeof window === "undefined") return;

    const setupGoogle = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
        ux_mode: "popup",
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 360,
      });
      setGoogleReady(true);
    };

    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      setupGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = GOOGLE_SCRIPT_ID;
    script.onload = setupGoogle;
    script.onerror = () => setError("Unable to load Google login right now. Please try again shortly.");
    document.head.appendChild(script);
  }, [googleClientId, handleGoogleCredential]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
      <div className="w-full max-w-md px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Lead<span className="text-[var(--accent)]">Pilot</span>
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Sign in with Google to open your workspace
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)] mb-2">Inside your workspace</p>
          <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
            <li>• Run Google Maps + Instagram collection queues</li>
            <li>• Score and review records with configurable rules</li>
            <li>• Export structured CSV from one dashboard</li>
          </ul>
        </div>

        <div className="p-5 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Google Sign-In</p>
          {googleClientId ? (
            <div>
              <div ref={googleButtonRef} className="min-h-[44px]" />
              {!googleReady && (
                <p className="text-xs text-[var(--text-muted)] mt-2">Loading Google login...</p>
              )}
              {loading && (
                <p className="text-xs text-[var(--text-muted)] mt-2">Signing you in...</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              Google login is not configured. Set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>.
            </p>
          )}
        </div>

        {error && (
          <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <p className="mt-5 text-center text-[11px] text-[var(--text-tertiary)]">
          We use Google only for secure authentication. No password stored by LeadPilot.
        </p>

      </div>
    </div>
  );
}
