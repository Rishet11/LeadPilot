"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("https://formspree.io/f/xgolwjvy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col vignette">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--surface-base)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)] group-hover:shadow-[0_0_30px_var(--accent-glow)] transition-shadow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.02em]">LeadPilot</span>
          </Link>

        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 pt-16">
        <section className="max-w-6xl mx-auto px-6 pt-32 pb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Text Content */}
            <div className="stagger-children">
              <p className="font-mono text-xs text-[var(--accent)] tracking-[0.2em] uppercase mb-6">
                B2B Lead Generation
              </p>
              <h1 className="font-display text-5xl md:text-6xl font-medium text-[var(--text-primary)] tracking-[-0.03em] leading-[1.1] mb-8">
                Find businesses that <em className="italic text-[var(--text-secondary)]">need</em> what you sell
              </h1>
              <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8 max-w-xl">
                LeadPilot scrapes Google Maps and Instagram to find local businesses
                with weak digital presence. Then scores and qualifies each lead
                so you reach out to the <span className="text-[var(--text-primary)]">right prospects</span>.
              </p>
              
              {/* Email Form */}
              <form onSubmit={handleSubmit} className="mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={status === "loading" || status === "success"}
                    className="flex-1 px-5 py-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading" || status === "success"}
                    className="btn-primary inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-medium whitespace-nowrap disabled:opacity-50"
                  >
                    {status === "loading" ? (
                      "Joining..."
                    ) : status === "success" ? (
                      "You're in! ✓"
                    ) : (
                      <>
                        Join Waitlist
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
                {status === "error" && (
                  <p className="mt-2 text-sm text-red-400">Something went wrong. Please try again.</p>
                )}
              </form>
              
              <span className="text-[var(--text-dim)] text-sm">Join 100+ builders on the waitlist</span>
            </div>

            {/* Right - Hero Image */}
            <div className="relative hidden md:block">
              <div className="absolute inset-0 bg-[var(--accent)]/20 blur-3xl rounded-full transform scale-90 translate-x-4" />
              <img
                src="/hero-dashboard.png"
                alt="LeadPilot Dashboard Preview"
                className="relative w-full h-auto drop-shadow-2xl"
              />
            </div>
          </div>
        </section>

        {/* Stats row */}
        <section className="border-y border-[var(--border-subtle)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)]">
              <div className="py-12 text-center">
                <p className="font-display text-4xl text-[var(--text-primary)] mb-2">2</p>
                <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">Data Sources</p>
              </div>
              <div className="py-12 text-center">
                <p className="font-display text-4xl text-[var(--text-primary)] mb-2">AI</p>
                <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">Outreach Gen</p>
              </div>
              <div className="py-12 text-center">
                <p className="font-display text-4xl text-[var(--text-primary)] mb-2">0-100</p>
                <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">Lead Scoring</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features - Bento grid */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-16">
              <p className="font-mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-4">
                How it works
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                Three steps to <em className="italic">qualified</em> leads
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5 stagger-children">
              {/* Step 1 */}
              <div className="card card-glow p-8 group">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center mb-6 group-hover:border-[var(--accent)] transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[var(--accent)] transition-colors">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <p className="font-mono text-[10px] text-[var(--accent)] tracking-wider uppercase mb-3">Step 01</p>
                <h3 className="font-display text-xl text-[var(--text-primary)] mb-3">
                  Discover
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Enter a city and industry. LeadPilot pulls business listings from
                  Google Maps or searches Instagram for niche keywords.
                </p>
              </div>

              {/* Step 2 */}
              <div className="card card-glow p-8 group">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center mb-6 group-hover:border-[var(--accent)] transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[var(--accent)] transition-colors">
                    <path d="M3 3v18h18" />
                    <path d="M7 16l4-8 4 4 5-6" />
                  </svg>
                </div>
                <p className="font-mono text-[10px] text-[var(--accent)] tracking-wider uppercase mb-3">Step 02</p>
                <h3 className="font-display text-xl text-[var(--text-primary)] mb-3">
                  Score
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Each lead gets a score based on reviews, ratings, and whether
                  they have a website. High scores mean high conversion potential.
                </p>
              </div>

              {/* Step 3 */}
              <div className="card card-glow p-8 group">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center mb-6 group-hover:border-[var(--accent)] transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[var(--accent)] transition-colors">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="font-mono text-[10px] text-[var(--accent)] tracking-wider uppercase mb-3">Step 03</p>
                <h3 className="font-display text-xl text-[var(--text-primary)] mb-3">
                  Outreach
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  AI writes a personalized message for each lead using their
                  actual business data. Copy it and send.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section className="py-24 border-t border-[var(--border-subtle)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-16">
              <p className="font-mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-4">
                Data Sources
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                Pull leads from <em className="italic">multiple</em> channels
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Google Maps */}
              <div className="card-static p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)]/20 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <span className="tag tag-gold font-mono text-[10px]">Primary</span>
                </div>
                <h3 className="font-display text-2xl text-[var(--text-primary)] mb-4">Google Maps</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                  Search by location and category. Get business name, phone,
                  website, rating, and review count for every listing.
                </p>
                <div className="impact-box">
                  <p className="text-xs text-[var(--text-muted)]">
                    <span className="text-[var(--text-primary)]">Best for:</span> Local service businesses, retail, restaurants
                  </p>
                </div>
              </div>

              {/* Instagram */}
              <div className="card-static p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)]/20 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </div>
                  <span className="tag font-mono text-[10px]">Social</span>
                </div>
                <h3 className="font-display text-2xl text-[var(--text-primary)] mb-4">Instagram</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                  Search by keyword. Find small business accounts based on
                  follower count and bio content.
                </p>
                <div className="impact-box">
                  <p className="text-xs text-[var(--text-muted)]">
                    <span className="text-[var(--text-primary)]">Best for:</span> Creators, freelancers, niche service providers
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 border-t border-[var(--border-subtle)]">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <p className="font-mono text-xs text-[var(--accent)] tracking-[0.2em] uppercase mb-6">
              Get Started
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-medium text-[var(--text-primary)] tracking-[-0.02em] mb-6">
              Start finding <em className="italic">leads</em>
            </h2>
            <p className="text-[var(--text-secondary)] mb-10 max-w-md mx-auto">
              Join the waitlist to get early access. Results in minutes, not days.
            </p>
            
            {/* Bottom Email Form */}
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={status === "loading" || status === "success"}
                  className="flex-1 px-5 py-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={status === "loading" || status === "success"}
                  className="btn-primary inline-flex items-center justify-center gap-3 px-8 py-4 text-base whitespace-nowrap disabled:opacity-50"
                >
                  {status === "loading" ? (
                    "Joining..."
                  ) : status === "success" ? (
                    "You're in! ✓"
                  ) : (
                    <>
                      Join Waitlist
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <p className="font-mono text-xs text-[var(--text-dim)]">
            LeadPilot
          </p>
          <a
            href="https://twitter.com/MehraRishe90311"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
          >
            Building in public by Rishet Mehra
          </a>
        </div>
      </footer>
    </div>
  );
}
