"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showMobileCTA, setShowMobileCTA] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  
  // Demo state
  const [demoCity, setDemoCity] = useState("");
  const [demoIndustry, setDemoIndustry] = useState("");
  const [demoStatus, setDemoStatus] = useState<"idle" | "loading" | "results">("idle");
  const [demoLeadCount, setDemoLeadCount] = useState(0);
  const [demoLeads, setDemoLeads] = useState<any[]>([]);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState<"local" | "saas" | "ecommerce" | "b2b">("local");

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
      `Just joined the LeadPilot waitlist! 🚀\n\nGet 50+ qualified leads in 2 minutes — without manual prospecting.\n\nJoin me 👇`
    );
    const url = encodeURIComponent("https://lead-pilot-ten.vercel.app?ref=twitter");
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    console.log("[Analytics] Twitter share clicked");
  };
  
  const generateMockLeads = (city: string, industry: string) => {
    // Generate realistic business names
    const prefixes = ["Sunrise", "Metro", "Elite", "Premier", "City", "Professional", "Express", "Quality"];
    const suffixes = ["Solutions", "Services", "Pros", "Experts", "Care", "Co.", "Group", "Team"];
    const streets = ["Main St", "Oak Ave", "Elm St", "Cedar Rd", "Maple Dr", "Park Blvd", "1st Ave", "Broadway"];
    const firstNames = ["Mike", "Sarah", "John", "Lisa", "David", "Maria", "Tom", "Emily"];
    
    const leads = [];
    for (let i = 0; i < 3; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      const street = streets[Math.floor(Math.random() * streets.length)];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const score = Math.floor(Math.random() * 30) + 70; // 70-100
      const reviews = Math.floor(Math.random() * 150) + 10;
      const rating = (Math.random() * 1.5 + 3.5).toFixed(1); // 3.5-5.0
      const hasWebsite = Math.random() > 0.3;
      const hasSocial = Math.random() > 0.5;
      
      // Generate realistic AI outreach message
      let aiMessage = "";
      if (!hasWebsite) {
        aiMessage = `Hi ${firstName}, I noticed ${prefix} ${industry} has great reviews but no website. With 70% of local searches happening on mobile, you could be missing leads. Would a quick site audit be helpful?`;
      } else if (!hasSocial) {
        aiMessage = `Hi ${firstName}, saw ${prefix} ${industry} has a solid ${rating}★ rating. I help businesses like yours get more visibility through social media. Worth a quick chat?`;
      } else {
        aiMessage = `Hi ${firstName}, ${prefix} ${industry} looks well-established with ${reviews} reviews. I specialize in helping top ${industry.toLowerCase()} businesses scale their online presence. Open to discussing growth strategies?`;
      }
      
      const businessName = `${prefix} ${industry} ${suffix}`.replace(/s /g, ' '); // Remove plural 's'
      const domain = businessName.toLowerCase().replace(/[\s&]/g, '');
      
      leads.push({
        name: businessName,
        industry,
        city,
        score,
        reviews,
        rating: parseFloat(rating),
        address: `${Math.floor(Math.random() * 9000) + 1000} ${street}`,
        hasWebsite,
        hasSocial,
        email: `${firstName.toLowerCase()}@${domain.substring(0, 15)}***.com`,
        phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-****`,
        aiMessage,
        firstName
      });
    }
    return leads;
  };
  
  const handleDemoSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoCity.trim() || !demoIndustry.trim()) return;
    
    setDemoStatus("loading");
    setLoadingStep(0);
    
    // Progressive loading steps
    setTimeout(() => setLoadingStep(1), 300);
    setTimeout(() => setLoadingStep(2), 800);
    setTimeout(() => setLoadingStep(3), 1400);
    setTimeout(() => {
      const leads = generateMockLeads(demoCity, demoIndustry);
      setDemoLeads(leads);
      setDemoLeadCount(Math.floor(Math.random() * 30) + 35); // 35-65 leads
      setLoadingStep(4);
      setDemoStatus("results");
    }, 2200);
  };
  
  const scrollToSignup = () => {
    document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col vignette">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-50">
        {/* Scarcity Banner */}
        <div className="bg-[var(--accent)] text-black text-center py-2.5 text-sm font-medium">
          🚀 Launching soon — limited early access spots available
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
                Get 50+ qualified leads in 2 minutes
              </h1>
              <p className="text-2xl text-[var(--text-secondary)] mb-6">
                No manual prospecting. No guesswork.
              </p>
              <p className="text-lg text-[var(--text-muted)] leading-relaxed mb-6 max-w-xl">
                Enter city + industry → Get scored leads + AI-written outreach messages instantly.
              </p>
              
              {/* Perfect for */}
              <p className="text-sm text-[var(--text-muted)] mb-8">
                Perfect for <span className="text-[var(--accent)]">freelancers</span>, <span className="text-[var(--accent)]">agencies</span>, <span className="text-[var(--accent)]">consultants</span> & <span className="text-[var(--accent)]">sales teams</span>
              </p>
              
              {/* Waitlist Counter */}
              <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse"></span>
                <strong className="text-[var(--accent)]">327 agencies</strong>
                <span>on the waitlist · Early access closing soon</span>
              </div>
              
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
                <form id="signup-form" onSubmit={handleSubmit} className="mb-4">
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
                          Get Early Access →
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] text-center mt-2">
                    ✓ No credit card · No spam · Unsubscribe anytime
                  </p>
                  {status === "error" && (
                    <p className="mt-2 text-sm text-red-400">Something went wrong. Please try again.</p>
                  )}
                </form>
              )}
              
              <p className="text-[var(--text-dim)] text-sm">
                🔥 200+ agencies and freelancers on the waitlist
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
                <p className="font-display text-4xl text-[var(--text-primary)] mb-2">2 min</p>
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

        {/* Interactive Demo Section */}
        <section className="py-20 border-b border-[var(--border-subtle)] bg-[var(--surface-base)]">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-10">
              <p className="font-mono text-xs text-[var(--accent)] tracking-[0.2em] uppercase mb-4">
                Try It Now
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-[var(--text-primary)] tracking-[-0.02em] mb-4">
                See it in action
              </h2>
              <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
                Enter any city and industry to preview what LeadPilot finds.
              </p>
            </div>
            
            {/* Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <button
                onClick={() => setActiveTab("local")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "local"
                    ? "bg-[var(--accent)] text-black"
                    : "bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                }`}
              >
                🏪 Local Services
              </button>
              <button
                onClick={() => setActiveTab("saas")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "saas"
                    ? "bg-[var(--accent)] text-black"
                    : "bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                }`}
              >
                💻 SaaS/Tech
              </button>
              <button
                onClick={() => setActiveTab("ecommerce")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "ecommerce"
                    ? "bg-[var(--accent)] text-black"
                    : "bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                }`}
              >
                🛍️ E-commerce
              </button>
              <button
                onClick={() => setActiveTab("b2b")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "b2b"
                    ? "bg-[var(--accent)] text-black"
                    : "bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                }`}
              >
                💼 B2B Services
              </button>
            </div>
            
            {/* Demo Search Form */}
            <form onSubmit={handleDemoSearch} className="max-w-xl mx-auto mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Industry (e.g., Plumbers)"
                  value={demoIndustry}
                  onChange={(e) => setDemoIndustry(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all"
                />
                <input
                  type="text"
                  placeholder="City (e.g., Austin)"
                  value={demoCity}
                  onChange={(e) => setDemoCity(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all"
                />
                <button
                  type="submit"
                  disabled={demoStatus === "loading"}
                  className="btn-primary px-6 py-3 text-sm font-medium whitespace-nowrap disabled:opacity-50"
                >
                  {demoStatus === "loading" ? "Searching..." : "Search"}
                </button>
              </div>
            </form>
            
            {/* Loading State */}
            {demoStatus === "loading" && (
              <div className="text-center py-12">
                <div className="inline-block space-y-3">
                  <div className={`flex items-center gap-3 px-6 py-3 rounded-xl ${loadingStep >= 1 ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' : 'bg-[var(--surface-elevated)] border border-[var(--border-subtle)]'}`}>
                    {loadingStep >= 1 ? (
                      <span className="text-[var(--accent)]">✓</span>
                    ) : (
                      <svg className="animate-spin h-4 w-4 text-[var(--accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    <span className="text-[var(--text-secondary)] text-sm">Scanning Google Maps...</span>
                  </div>
                  <div className={`flex items-center gap-3 px-6 py-3 rounded-xl ${loadingStep >= 2 ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' : 'bg-[var(--surface-elevated)] border border-[var(--border-subtle)] opacity-50'}`}>
                    {loadingStep >= 2 ? (
                      <span className="text-[var(--accent)]">✓</span>
                    ) : loadingStep >= 1 ? (
                      <svg className="animate-spin h-4 w-4 text-[var(--accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span className="text-[var(--text-muted)]">○</span>
                    )}
                    <span className="text-[var(--text-secondary)] text-sm">Scoring {demoLeadCount || '50+'} businesses...</span>
                  </div>
                  <div className={`flex items-center gap-3 px-6 py-3 rounded-xl ${loadingStep >= 3 ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' : 'bg-[var(--surface-elevated)] border border-[var(--border-subtle)] opacity-50'}`}>
                    {loadingStep >= 3 ? (
                      <span className="text-[var(--accent)]">✓</span>
                    ) : loadingStep >= 2 ? (
                      <svg className="animate-spin h-4 w-4 text-[var(--accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span className="text-[var(--text-muted)]">○</span>
                    )}
                    <span className="text-[var(--text-secondary)] text-sm">Generating AI outreach...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Results */}
            {demoStatus === "results" && (
              <div>
                <div className="text-center mb-6">
                  <p className="text-lg text-[var(--text-primary)]">
                    Found <span className="text-[var(--accent)] font-bold">{demoLeadCount} leads</span> in {demoCity}
                  </p>
                </div>
                
                {/* Lead Cards */}
                <div className="space-y-4 mb-6">
                  {demoLeads.map((lead, i) => (
                    <div key={i} className="p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-[var(--text-primary)] mb-1">{lead.name}</h4>
                          <p className="text-sm text-[var(--text-muted)] mb-1">{lead.address}, {lead.city}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            ⭐ {lead.rating} stars • {lead.reviews} reviews
                          </p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 ml-4">
                          <span className="text-[var(--accent)] font-bold text-lg">{lead.score}</span>
                          <span className="text-xs text-[var(--text-muted)]">/100</span>
                        </div>
                      </div>
                      
                      {/* Contact Info */}
                      <div className="flex gap-4 text-xs text-[var(--text-muted)] mb-3 pb-3 border-b border-[var(--border-subtle)]">
                        <span>📧 {lead.email}</span>
                        <span>📱 {lead.phone}</span>
                      </div>
                      
                      {/* AI Message */}
                      <div className="p-3 rounded-lg bg-[var(--surface-base)] border border-dashed border-[var(--border-subtle)]">
                        <p className="text-xs text-[var(--accent)] font-medium mb-2">💬 AI-Generated Outreach</p>
                        <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">
                          &quot;{lead.aiMessage}&quot;
                        </p>
                      </div>
                      
                      <div className="flex gap-3 text-xs mt-3">
                        {lead.hasWebsite ? (
                          <span className="text-[var(--accent)]">✓ Has website</span>
                        ) : (
                          <span className="text-red-400">✗ No website</span>
                        )}
                        {lead.hasSocial ? (
                          <span className="text-[var(--accent)]">✓ Social presence</span>
                        ) : (
                          <span className="text-[var(--text-muted)]">✗ Low social</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Blurred Cards + CTA */}
                <div className="relative">
                  <div className="space-y-4 blur-sm opacity-40 pointer-events-none">
                    <div className="p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="h-5 bg-[var(--text-primary)]/20 rounded w-48 mb-2"></div>
                          <div className="h-4 bg-[var(--text-muted)]/20 rounded w-32 mb-1"></div>
                          <div className="h-3 bg-[var(--text-muted)]/20 rounded w-40"></div>
                        </div>
                        <div className="w-16 h-8 bg-[var(--accent)]/20 rounded-full ml-4"></div>
                      </div>
                    </div>
                    <div className="p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="h-5 bg-[var(--text-primary)]/20 rounded w-52 mb-2"></div>
                          <div className="h-4 bg-[var(--text-muted)]/20 rounded w-36 mb-1"></div>
                          <div className="h-3 bg-[var(--text-muted)]/20 rounded w-44"></div>
                        </div>
                        <div className="w-16 h-8 bg-[var(--accent)]/20 rounded-full ml-4"></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={scrollToSignup}
                      className="btn-primary px-6 py-3 text-sm font-medium shadow-lg"
                    >
                      Join 327 Agencies →
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Disclaimer */}
            {demoStatus === "results" && (
              <p className="text-center text-xs text-[var(--text-muted)] mt-4">
                * Demo preview with sample data. Real searches return actual business contact info.
              </p>
            )}
            
            
            {/* Empty State */}
            {demoStatus === "idle" && (
              <div className="text-center py-8">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Popular searches:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {activeTab === "local" && (
                    <>
                      <button onClick={() => { setDemoCity("Austin"); setDemoIndustry("Plumbers"); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all">
                        Plumbers in Austin
                      </button>
                      <button onClick={() => { setDemoCity("Miami"); setDemoIndustry("Dentists"); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all">
                        Dentists in Miami
                      </button>
                      <button onClick={() => { setDemoCity("Chicago"); setDemoIndustry("Law firms"); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all">
                        Law firms in Chicago
                      </button>
                    </>
                  )}
                  {activeTab === "saas" && (
                    <>
                      <button onClick={() => { setDemoCity("San Francisco"); setDemoIndustry("Marketing tools"); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all">
                        Marketing tools in SF
                      </button>
                      <button onClick={() => { setDemoCity("Austin"); setDemoIndustry("SaaS companies"); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all">
                        SaaS in Austin
                      </button>
                      <button onClick={() => { setDemoCity("NYC"); setDemoIndustry("Fintech startups"); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all">
                        Fintech in NYC
                      </button>
                    </>
                  )}
                  {activeTab === "ecommerce" && (
                    <>
                      <button onClick={() => { setDemoCity("Los Angeles"); setDemoIndustry("Fashion stores"); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all">
                        Fashion stores in LA
                      </button>
                      <button onClick={() => { setDemoCity("Portland"); setDemoIndustry("Pet supply shops"); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all">
                        Pet supplies in Portland
                      </button>
                      <button onClick={() => { setDemoCity("Seattle"); setDemoIndustry("Home decor stores"); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all">
                        Home decor in Seattle
                      </button>
                    </>
                  )}
                  {activeTab === "b2b" && (
                    <>
                      <button onClick={() => { setDemoCity("Houston"); setDemoIndustry("Manufacturing companies"); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all">
                        Manufacturing in Houston
                      </button>
                      <button onClick={() => { setDemoCity("Boston"); setDemoIndustry("Consulting firms"); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all">
                        Consultants in Boston
                      </button>
                      <button onClick={() => { setDemoCity("Denver"); setDemoIndustry("Logistics companies"); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all">
                        Logistics in Denver
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
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
                    50+ qualified leads in 2 minutes
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
                  AI scores each lead based on business signals: reviews, growth potential, digital presence. 
                  Focus on leads most likely to convert.
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

        {/* Comparison Table */}
        <section className="py-20 border-t border-[var(--border-subtle)]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="mb-12 text-center">
              <p className="font-mono text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase mb-4">
                Compare
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                LeadPilot vs. <em className="italic text-[var(--text-secondary)]">The Old Way</em>
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-[var(--border-subtle)]">
                    <th className="p-4 text-left text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider"></th>
                    <th className="p-4 text-left text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">Manual</th>
                    <th className="p-4 text-left text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">Outsourced ($2K/mo)</th>
                    <th className="p-4 text-left text-sm font-medium text-[var(--accent)] uppercase tracking-wider bg-[var(--accent)]/5">
                      LeadPilot
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  <tr>
                    <td className="p-4 font-medium text-[var(--text-primary)]">Time to 50 leads</td>
                    <td className="p-4 text-[var(--text-muted)]">10+ hours</td>
                    <td className="p-4 text-[var(--text-muted)]">2-3 hours</td>
                    <td className="p-4 text-[var(--accent)] font-semibold bg-[var(--accent)]/5">2 minutes</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-[var(--text-primary)]">Cost per month</td>
                    <td className="p-4 text-[var(--text-muted)]">$0 (your time)</td>
                    <td className="p-4 text-[var(--text-muted)]">$2,000+</td>
                    <td className="p-4 text-[var(--accent)] font-semibold bg-[var(--accent)]/5">Coming soon</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-[var(--text-primary)]">Lead quality scoring</td>
                    <td className="p-4 text-[var(--text-muted)]">❌ Manual guesswork</td>
                    <td className="p-4 text-[var(--text-muted)]">❌ Inconsistent</td>
                    <td className="p-4 text-[var(--accent)] font-semibold bg-[var(--accent)]/5">✅ AI-powered</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-[var(--text-primary)]">Contact enrichment</td>
                    <td className="p-4 text-[var(--text-muted)]">❌ Manual search</td>
                    <td className="p-4 text-[var(--text-muted)]">✅ Manual</td>
                    <td className="p-4 text-[var(--accent)] font-semibold bg-[var(--accent)]/5">✅ Automatic</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-[var(--text-primary)]">Personalized outreach</td>
                    <td className="p-4 text-[var(--text-muted)]">❌ Generic templates</td>
                    <td className="p-4 text-[var(--text-muted)]">✅ Time-consuming</td>
                    <td className="p-4 text-[var(--accent)] font-semibold bg-[var(--accent)]/5">✅ AI-generated</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-[var(--text-primary)]">Local businesses</td>
                    <td className="p-4 text-[var(--text-muted)]">✅ Yes</td>
                    <td className="p-4 text-[var(--text-muted)]">✅ Yes</td>
                    <td className="p-4 text-[var(--accent)] font-semibold bg-[var(--accent)]/5">✅ Optimized</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                💡 <strong className="text-[var(--text-primary)]">Pro tip:</strong> Use LeadPilot to find leads, then feed them to your AI SDR tools
              </p>
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
                  How does AI scoring work?
                  <svg className="w-5 h-5 text-[var(--text-muted)] group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-4 text-[var(--text-secondary)] text-sm leading-relaxed">
                  Our AI analyzes 15+ signals including: website speed, mobile-friendliness, SSL certificate, 
                  social media presence, Google review rating + count, and more. Each lead gets a score from 0-100 — 
                  the higher the score, the more likely they need your services and are ready to buy.
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
                  🚀 <strong>Launching February 2026.</strong> Early access rolling out to waitlist in order.
                  <br/>
                  Spots #1-100 get <strong className="text-[var(--accent)]">lifetime founder pricing (50% off)</strong>.
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
                      Reserve My Spot →
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
