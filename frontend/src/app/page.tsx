"use client";

import Link from "next/link";
import GuestPreview from "@/components/GuestPreview";
import { useState, useEffect } from "react";

// --- Data Constants (Kept for content, will re-style later) ---

const PROOF_STRIP = [
  { label: "Time to first list", value: "< 10 min", icon: "⚡" },
  { label: "Lead scoring dimensions", value: "12 signals", icon: "📊" },
  { label: "Outreach starter quality", value: "Research-based", icon: "✨" },
  { label: "Best-fit users", value: "Local agencies", icon: "🎯" },
];

const WORKFLOW = [
  {
    title: "Set objective",
    text: "Type what you want: niche, city, and lead quality constraints.",
    step: "01"
  },
  {
    title: "Generate targets",
    text: "Target Builder turns one sentence into clean scrape targets.",
    step: "02"
  },
  {
    title: "Queue and score",
    text: "LeadPilot scrapes, qualifies, and prioritizes accounts automatically.",
    step: "03"
  },
  {
    title: "Export and close",
    text: "Push the list into your outreach stack and start conversations.",
    step: "04"
  },
];

const AGENT_STACK = [
  {
    title: "Target Builder Agent",
    text: "Turn one sentence into clean targets by city and niche.",
    icon: "🎯"
  },
  {
    title: "Auto Message Refresh",
    text: "Regenerates outreach text when you click Regenerate on a lead.",
    icon: "🔄"
  },
  {
    title: "Auto QA Check",
    text: "Cleans risky wording so your message sounds safer and clearer.",
    icon: "🛡️"
  },
];

const TARGET_AUDIENCE = [
  {
    role: "Web Design Agencies",
    icon: "🎨",
    benefit: "Find businesses with outdated sites & low convex.",
  },
  {
    role: "Local SEO Agencies",
    icon: "📍",
    benefit: "Spot map-listed businesses with digital gaps.",
  },
  {
    role: "Freelance Marketers",
    icon: "🚀",
    benefit: "Build prospect lists & outreach drafts fast.",
  },
  {
    role: "Lead-Gen Agencies",
    icon: "⚡",
    benefit: "Scale outbound for dentists, HVAC, etc.",
  },
  {
    role: "Appt Setters",
    icon: "📞",
    benefit: "Get ready leads + scripts to book calls.",
  },
  {
    role: "Small Outbound Teams",
    icon: "🎯",
    benefit: "Sell recurring services to local SMBs.",
  },
];

const FEATURES = [
  {
    title: "Local Gap Scoring",
    desc: "We analyze digital presence to find high-intent targets that others miss.",
    icon: "📊",
    size: "large",
  },
  {
    title: "AI Outreach Writer",
    desc: "Auto-generates personalized first touches based on business data.",
    icon: "✍️",
    size: "large",
  },
  {
    title: "Batch Search",
    desc: "Run city + niche searches in bulk.",
    icon: "🔍",
    size: "small",
  },
  {
    title: "Export Ready",
    desc: "One-click CSV exp to Apollo/Instantly.",
    icon: "📥",
    size: "small",
  },
  {
    title: "No-Setup Start",
    desc: "Browser-based. No complex install.",
    icon: "⚡",
    size: "small",
  },
];

const FAQS = [
  {
    q: "Who is LeadPilot best for?",
    a: "Local agencies and freelancers who need qualified outreach lists fast without building complex data workflows.",
  },
  {
    q: "Is this a full cold-email platform?",
    a: "No. LeadPilot focuses on lead discovery, scoring, and messaging drafts. You can export to your preferred sending stack.",
  },
  {
    q: "How fast can a team start?",
    a: "Most users can sign in, run their first niche target, and export a usable list in under 10 minutes.",
  },
  {
    q: "Do I need technical setup?",
    a: "No technical setup for basic use. Pick a niche and city, run the job, and start outreach.",
  },
];

// --- Components ---

function MockUI() {
  return (
    <div className="w-full h-full bg-[#111] rounded-xl border border-[var(--border-secondary)] flex flex-col overflow-hidden shadow-2xl relative min-h-[300px]">
      {/* Window Controls */}
      <div className="h-8 border-b border-[var(--border-secondary)] bg-[#1A1A1A] flex items-center px-3 gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
      </div>
      
      {/* App Interface Mock */}
      <div className="flex-1 flex text-[10px] sm:text-xs">
        {/* Sidebar */}
        <div className="w-16 sm:w-48 border-r border-[var(--border-secondary)] p-3 space-y-2 hidden sm:block">
           <div className="h-6 w-full bg-[var(--bg-secondary)] rounded mb-4" />
           <div className="h-4 w-3/4 bg-[#1A1A1A] rounded" />
           <div className="h-4 w-1/2 bg-[#1A1A1A] rounded" />
           <div className="h-4 w-2/3 bg-[#1A1A1A] rounded" />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-4 bg-[#050505]">
           <div className="flex justify-between items-center mb-6">
              <div className="h-8 w-32 bg-[#1A1A1A] rounded" /> {/* Title */}
              <div className="h-8 w-24 bg-[var(--text-primary)] rounded" /> {/* CTA */}
           </div>
           
           {/* Table Header */}
           <div className="h-8 w-full border-b border-[var(--border-secondary)] mb-2 flex items-center px-2 gap-4">
              <div className="h-3 w-4 bg-[#222] rounded" />
              <div className="h-3 w-32 bg-[#222] rounded" />
              <div className="h-3 w-20 bg-[#222] rounded" />
              <div className="h-3 w-16 bg-[#222] rounded" />
           </div>

           {/* Table Rows */}
           {[1, 2, 3, 4, 5].map((i) => (
             <div key={i} className="h-10 w-full border-b border-[var(--border-secondary)] flex items-center px-2 gap-4 opacity-60">
                <div className="h-3 w-4 bg-[#1A1A1A] rounded" />
                <div className="h-3 w-24 bg-[#1A1A1A] rounded" />
                <div className="h-3 w-16 bg-[#1A1A1A] rounded" />
                <div className="h-3 w-12 bg-green-900/40 rounded" />
             </div>
           ))}
        </div>
      </div>

      {/* Floating Badge (3D effect element) */}
      <div className="absolute bottom-6 right-6 bg-[#111] border border-[var(--border-highlight)] px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2">
         <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
         <span className="text-[10px] text-[var(--text-secondary)]">Live Scraping...</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-white/20 selection:text-white">
      
      {/* Background Grid */}
      <div className="fixed inset-0 bg-grid z-0 pointer-events-none opacity-40" />
      <div className="fixed inset-0 bg-gradient-to-b from-black via-transparent to-black z-0 pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 h-14 border-b border-[var(--border-primary)] bg-black/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white rounded-sm" />
            <span className="font-semibold text-sm tracking-tight text-white">LeadPilot</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-all">Sign In</Link>
            <Link href="/pricing" className="text-xs bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)]">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-40 px-4 overflow-hidden z-10">
        <div className="max-w-5xl mx-auto text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border-secondary)] bg-[var(--bg-secondary)] mb-8 animate-reveal">
            <span className="text-[10px] font-medium text-[var(--text-secondary)]">New Feature:</span>
            <span className="text-[10px] font-medium text-white">Local Gap Scoring &rarr;</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-6 animate-reveal [animation-delay:100ms] text-gradient">
            Find high-intent leads <br /> before your competitors.
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed animate-reveal [animation-delay:200ms]">
             Automated hyper-local lead generation. We scan maps, social, and web signals to find businesses that actually need your services.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-reveal [animation-delay:300ms]">
            <a href="#preview" className="bg-white text-black px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
              Start Free Search
            </a>
            <Link href="/preview" className="px-6 py-3 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-white border border-[var(--border-secondary)] hover:border-[var(--border-primary)] transition-all">
              View Demo
            </Link>
          </div>

          {/* 3D Mock UI */}
          <div className="mt-20 relative max-w-4xl mx-auto animate-reveal [animation-delay:500ms] perspective-1000">
             <div className="relative transform-style-3d rotate-x-12 scale-90 hover:scale-100 hover:rotate-0 transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] group">
                <div className="absolute inset-0 bg-[var(--accent-glow)] blur-3xl opacity-20 -z-10 group-hover:opacity-40 transition-opacity duration-1000" />
                <div className="aspect-[16/10] w-full">
                    <MockUI />
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Guest Preview Section */}
      <section id="preview" className="relative z-10 py-24 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
               <h2 className="text-2xl font-semibold mb-2">Try for free</h2>
               <p className="text-[var(--text-secondary)] text-sm">No credit card required.</p>
            </div>
            <GuestPreview />
        </div>
      </section>

      {/* Audience Section - Spotlight Cards */}
      <section className="py-32 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
             <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-gradient">Built for Local Hunters</h2>
             <p className="text-[var(--text-secondary)] max-w-xl">
                Stop wasting time on generic databases. LeadPilot is engineered for granular local search.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TARGET_AUDIENCE.map((item, i) => (
              <div key={i} className="spotlight-card group p-6 rounded-2xl relative">
                 <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] flex items-center justify-center text-xl mb-4 group-hover:scale-110 group-hover:border-[var(--border-highlight)] transition-all duration-300">
                    {item.icon}
                 </div>
                 <h3 className="text-lg font-medium mb-2 text-[var(--text-primary)]">{item.role}</h3>
                 <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.benefit}</p>
                 
                 {/* Hover Gradient */}
                 <div className="absolute inset-0 bg-gradient-to-br from-[var(--border-highlight)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section - The Beam */}
      <section className="py-32 relative border-t border-[var(--border-secondary)] bg-[var(--bg-secondary)]/30">
        <div className="max-w-4xl mx-auto px-4 relative">
           <div className="text-center mb-24">
             <div className="inline-block px-3 py-1 rounded-full border border-[var(--border-secondary)] bg-[var(--bg-primary)] mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)]">The Pipeline</span>
             </div>
             <h2 className="text-3xl md:text-5xl font-semibold text-gradient">From Zero to Booked</h2>
           </div>

           <div className="relative">
              {/* Central Beam Line */}
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-[var(--border-secondary)] md:-ml-px">
                 <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[var(--accent-glow)] to-transparent opacity-50" />
              </div>

              <div className="space-y-24">
                 {WORKFLOW.map((step, i) => (
                   <div key={i} className={`relative flex items-center gap-8 md:gap-16 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                      {/* Step Number Bubble */}
                      <div className="absolute left-8 md:left-1/2 -ml-4 md:-ml-5 w-8 h-8 md:w-10 md:h-10 rounded-full bg-[var(--bg-primary)] border border-[var(--border-highlight)] z-10 flex items-center justify-center shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
                         <span className="text-[10px] md:text-xs font-mono font-bold">{step.step}</span>
                      </div>

                      {/* Content Card */}
                      <div className={`flex-1 pl-20 md:pl-0 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                         <h3 className="text-xl font-medium mb-2 text-[var(--text-primary)]">{step.title}</h3>
                         <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step.text}</p>
                      </div>
                      <div className="flex-1 hidden md:block" />
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      {/* Features bento Grid */}
      <section className="py-32 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
           <div className="max-w-2xl mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold mb-6 text-gradient">Everything you need. <br /> Nothing you don't.</h2>
              <p className="text-[var(--text-secondary)]">
                 We stripped away the CRM bloat. LeadPilot is a precision instrument for finding and contacting leads.
              </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {FEATURES.map((feature, i) => (
                <div 
                  key={i}
                  className={`spotlight-card p-8 rounded-2xl relative overflow-hidden group 
                    ${feature.size === 'large' ? 'md:col-span-3 lg:col-span-4' : 'md:col-span-3 lg:col-span-2'}`}
                >
                   <div className="relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-secondary)] flex items-center justify-center text-2xl mb-6 shadow-lg group-hover:border-[var(--border-highlight)] transition-colors">
                         {feature.icon}
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm">{feature.desc}</p>
                   </div>
                   
                   {/* Decorative background elements for large cards */}
                   {feature.size === 'large' && (
                      <div className="absolute right-0 bottom-0 opacity-10 grayscale group-hover:opacity-20 transition-opacity duration-500">
                         {/* Abstract shape */}
                         <div className="w-64 h-64 bg-gradient-to-tl from-white to-transparent rounded-full blur-[100px]" />
                      </div>
                   )}
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 border-t border-[var(--border-secondary)]">
         <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl font-semibold mb-12 text-center">Frequently Asked Questions</h2>
            <div className="space-y-px bg-[var(--border-secondary)] border-b border-[var(--border-secondary)]">
               {FAQS.map((faq, i) => (
                 <div key={i} className="bg-[var(--bg-primary)] p-6 hover:bg-[var(--bg-secondary)] transition-colors cursor-default">
                    <h3 className="text-sm font-medium mb-2 text-[var(--text-primary)]">{faq.q}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{faq.a}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-[var(--border-primary)] relative z-10 bg-[var(--bg-primary)]">
         <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2.5">
               <div className="w-6 h-6 bg-white rounded-sm" />
               <span className="font-semibold tracking-tight">LeadPilot</span>
            </div>
            
            <div className="flex gap-8 text-sm text-[var(--text-secondary)]">
               <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
               <Link href="/login" className="hover:text-white transition-colors">Login</Link>
               <a href="mailto:rishetmehra11@gmail.com" className="hover:text-white transition-colors">Contact</a>
            </div>

            <p className="text-xs text-[var(--text-tertiary)]">
               &copy; {new Date().getFullYear()} LeadPilot Inc.
            </p>
         </div>
      </footer>
    </div>
  );
}
