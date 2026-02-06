"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showMobileCTA, setShowMobileCTA] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);

  // Show mobile sticky CTA after scrolling past hero
  useEffect(() => {
    const handleScroll = () => {
      setShowMobileCTA(window.scrollY > 500);
      
      // Track scroll depth for analytics
      if (window.scrollY > 300 && typeof window !== 'undefined') {
        (window as any).leadpilot_scrolled_to_cta = true;
      }
    };
    window.addEventListener("scroll", handleScroll);
    
    // Track page view
    console.log("[Analytics] Page view");
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    console.log("[Analytics] Form submission started");

    try {
      const res = await fetch("https://formspree.io/f/xgolwjvy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
        // Generate a random waitlist position between 128-200
        const position = Math.floor(Math.random() * 73) + 128;
        setWaitlistPosition(position);
        console.log("[Analytics] Form submitted successfully, position:", position);
      } else {
        setStatus("error");
        console.log("[Analytics] Form submission failed");
      }
    } catch {
      setStatus("error");
      console.log("[Analytics] Form submission error");
    }
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(
      `Just joined the LeadPilot waitlist! 🚀\n\nGet 50+ qualified leads in 10 minutes — without manual prospecting.\n\nJoin me 👇`
    );
    const url = encodeURIComponent("https://lead-pilot-ten.vercel.app?ref=twitter");
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    console.log("[Analytics] Twitter share clicked");
  };

  return (
    <div className="min-h-screen flex flex-col vignette">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-50">
        {/* Scarcity Banner */}
        <div className="bg-[var(--accent)] text-black text-center py-2.5 text-sm font-medium">
          🚀 Early access launching March 2026 — waitlist closes soon
        </div>

        {/* Header */}
        <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-base)]/95 backdrop-blur-xl">
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
      </div>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-24 pb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Text Content */}
            <div className="stagger-children">
              <p className="font-mono text-xs text-[var(--accent)] tracking-[0.2em] uppercase mb-6">
                Find Clients Faster
              </p>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-medium text-[var(--text-primary)] tracking-[-0.03em] leading-[1.1] mb-4">
                Get 50+ qualified leads in 10 minutes
              </h1>
              <p className="text-2xl text-[var(--text-secondary)] mb-6">
                No manual prospecting. No guesswork.
              </p>
              <p className="text-lg text-[var(--text-muted)] leading-relaxed mb-8 max-w-xl">
                Enter city + industry → Get scored leads + AI-written outreach messages instantly.
              </p>
              
              {/* Email Form / Success State */}
              {status === "success" ? (
                <div className="p-6 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 mb-4">
                  <p className="text-2xl font-display text-[var(--text-primary)] mb-2">
                    🎉 You&apos;re on the list!
                  </p>
                  <p className="text-[var(--text-secondary)] mb-4">
                    We&apos;ll email you when early access opens. Share to spread the word 👇
                  </p>
                  <button
                    onClick={shareOnTwitter}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#1DA1F2] text-white text-sm font-medium hover:bg-[#1a8cd8] transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share on Twitter
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mb-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      disabled={status === "loading"}
                      className="flex-1 px-5 py-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="btn-primary inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-medium whitespace-nowrap disabled:opacity-50"
                    >
                      {status === "loading" ? (
                        "Joining..."
                      ) : (
                        <>
                          Get Early Access
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
              )}
              
              <p className="text-[var(--text-dim)] text-sm">
                🔥 127 people already on the waitlist
              </p>
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

        {/* Stats row - Outcome Focused */}
        <section className="border-y border-[var(--border-subtle)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)]">
              <div className="py-12 text-center">
                <p className="font-display text-4xl text-[var(--text-primary)] mb-2">10 min</p>
                <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">Search to Leads</p>
              </div>
              <div className="py-12 text-center">
                <p className="font-display text-4xl text-[var(--text-primary)] mb-2">50+</p>
                <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">Leads Per Search</p>
              </div>
              <div className="py-12 text-center">
                <p className="font-display text-4xl text-[var(--text-primary)] mb-2">0%</p>
                <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">Manual Entry</p>
              </div>
            </div>
          </div>
        </section>

        {/* Before/After Section */}
        <section className="py-20 border-b border-[var(--border-subtle)]">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Before */}
              <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/20">
                <p className="text-red-400 font-mono text-xs uppercase tracking-wider mb-4">😩 Without LeadPilot</p>
                <ul className="space-y-3 text-[var(--text-secondary)] text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">✗</span>
                    Hours scrolling Google Maps manually
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">✗</span>
                    Copy-pasting into spreadsheets
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">✗</span>
                    Generic outreach that gets ignored
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">✗</span>
                    No idea which leads are worth pursuing
                  </li>
                </ul>
              </div>
              {/* After */}
              <div className="p-6 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/20">
                <p className="text-[var(--accent)] font-mono text-xs uppercase tracking-wider mb-4">🚀 With LeadPilot</p>
                <ul className="space-y-3 text-[var(--text-secondary)] text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)]">✓</span>
                    50+ qualified leads in 10 minutes
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)]">✓</span>
                    Auto-enriched with contact data
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)]">✓</span>
                    AI writes personalized messages
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)]">✓</span>
                    Lead scores tell you who to call first
                  </li>
                </ul>
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
                  Search
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Enter any city + industry. LeadPilot pulls every business listing 
                  from Google Maps or Instagram in seconds.
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
                  AI analyzes each lead — rating, reviews, website quality — 
                  and assigns a 0-100 score. High scores = high conversion potential.
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
                  Reach Out
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Get AI-written outreach messages personalized to each business. 
                  Copy, paste, send. Watch replies come in.
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

        {/* FAQ Section */}
        <section className="py-24 border-t border-[var(--border-subtle)]">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <p className="font-mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-4">
                FAQ
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-4">
              <details className="group p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <summary className="cursor-pointer text-[var(--text-primary)] font-medium flex items-center justify-between">
                  Is this legal/ethical?
                  <svg className="w-5 h-5 text-[var(--text-muted)] group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-4 text-[var(--text-secondary)] text-sm leading-relaxed">
                  Yes. We only scrape publicly available business information 
                  (same data you&apos;d find searching Google manually). No private data is accessed.
                </p>
              </details>
              <details className="group p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <summary className="cursor-pointer text-[var(--text-primary)] font-medium flex items-center justify-between">
                  How is this different from Apollo/ZoomInfo?
                  <svg className="w-5 h-5 text-[var(--text-muted)] group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-4 text-[var(--text-secondary)] text-sm leading-relaxed">
                  Those tools focus on B2B enterprise contacts. LeadPilot finds local businesses 
                  with weak digital presence — perfect for agencies selling websites, 
                  SEO, or marketing services.
                </p>
              </details>
              <details className="group p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <summary className="cursor-pointer text-[var(--text-primary)] font-medium flex items-center justify-between">
                  When will this launch?
                  <svg className="w-5 h-5 text-[var(--text-muted)] group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-4 text-[var(--text-secondary)] text-sm leading-relaxed">
                  We&apos;re launching in March 2026 with a phased rollout. Waitlist order determines 
                  early access priority. Join now to be first in line.
                </p>
              </details>
              <details className="group p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <summary className="cursor-pointer text-[var(--text-primary)] font-medium flex items-center justify-between">
                  What will it cost?
                  <svg className="w-5 h-5 text-[var(--text-muted)] group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-4 text-[var(--text-secondary)] text-sm leading-relaxed">
                  Early access users get a significant discount. 
                  Join the waitlist to lock in founder pricing.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 border-t border-[var(--border-subtle)]">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <p className="font-mono text-xs text-[var(--accent)] tracking-[0.2em] uppercase mb-6">
              Early Access
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-medium text-[var(--text-primary)] tracking-[-0.02em] mb-6">
              Stop hunting for leads.<br />
              <em className="italic text-[var(--text-secondary)]">Let AI bring them to you.</em>
            </h2>
            <p className="text-[var(--text-secondary)] mb-10 max-w-md mx-auto">
              Join the waitlist. Be first in line when we launch.
            </p>
            
            {/* Bottom Email Form */}
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email"
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
                    "You're in! 🎉"
                  ) : (
                    <>
                      Get Early Access
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
              <p className="mt-4 text-sm text-[var(--text-dim)]">
                Early access includes founder pricing + priority support
              </p>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <p className="font-mono text-xs text-[var(--text-dim)]">
            LeadPilot © 2026
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

      {/* Mobile Sticky CTA */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--surface-base)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] p-4 transition-transform duration-300 ${
          showMobileCTA && status !== "success" ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            required
            disabled={status === "loading"}
            className="flex-1 px-4 py-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="btn-primary px-5 py-3 text-sm font-medium whitespace-nowrap disabled:opacity-50"
          >
            {status === "loading" ? "..." : "Get Access"}
          </button>
        </form>
      </div>
    </div>
  );
}
