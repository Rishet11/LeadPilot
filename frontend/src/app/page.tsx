"use client";

import Link from "next/link";
import GuestPreview from "@/components/GuestPreview";

// --- Data Constants ---
const WORKFLOW = [
  {
    title: "Choose your city and niche",
    text: "Pick the local market and business type you want to target.",
    step: "01"
  },
  {
    title: "Run and review results",
    text: "LeadPilot finds leads, scores quality, and drafts first outreach lines.",
    step: "02"
  },
  {
    title: "Save and export",
    text: "Sign in with Google, save leads, and export CSV for your outreach stack.",
    step: "03"
  },
];

const FEATURES = [
  {
    title: "Digital Gap Scoring",
    desc: "Quickly spot businesses with demand but weak online conversion setup.",
    icon: "📊",
  },
  {
    title: "Fast outreach drafts",
    desc: "Get a ready first message and regenerate it with one click.",
    icon: "⚙️",
  },
  {
    title: "Simple CSV exports",
    desc: "Export clean lead lists and plug them into your current tools.",
    icon: "📥",
  },
];

const HERO_STEPS = [
  "1. Pick city + niche",
  "2. Run no-login preview",
  "3. Sign in and scale",
];

const FAQS = [
  {
    q: "Is LeadPilot an agency or a done-for-you service?",
    a: "No. LeadPilot is strictly a self-serve Software-as-a-Service (SaaS) tool. You manage your own subscription, configure your own searches, and export the data yourself via our dashboard.",
  },
  {
    q: "Do you send the cold emails for me?",
    a: "No. We provide the data discovery and formatting software. You export the lists and use your own third-party email sending tools.",
  },
  {
    q: "Do I need technical skills to install this?",
    a: "No installation required. LeadPilot is entirely cloud-based. You simply log into the web app from your browser and start searching.",
  },
];

// --- Mock UI Component ---
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
         <span className="w-2 h-2 rounded-full bg-[#00FF66]" />
         <span className="text-[10px] text-[var(--text-secondary)]">Status: Operational</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-white/20 selection:text-white">
      
      {/* Background Grid & Mesh Gradients */}
      <div className="fixed inset-0 bg-grid z-0 pointer-events-none opacity-20" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-[var(--bg-primary)] to-[var(--bg-primary)] z-0 pointer-events-none" />
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--glow-indigo)] blur-[140px] opacity-40 animate-pulse-glow z-0 pointer-events-none" />
      <div className="fixed top-[10%] right-[-10%] w-[50%] h-[70%] rounded-full bg-[var(--glow-violet)] blur-[150px] opacity-30 animate-pulse-glow z-0 pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/40 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 bg-gradient-to-br from-white to-gray-400 rounded flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:shadow-[0_0_20px_var(--glow-indigo)] transition-shadow">
               <div className="w-2.5 h-2.5 bg-[#030712] rounded-sm" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-indigo-300 transition-all">LeadPilot</span>
          </Link>
          <div className="flex items-center gap-4">
             <a href="#preview" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-white transition-colors hidden sm:block">Try Preview</a>
            <Link href="/login" className="text-xs font-bold text-white px-4 py-2 rounded-lg bg-[var(--border-secondary)] hover:bg-[var(--border-primary)] border border-[var(--border-secondary)] transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]">Sign In</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden z-20 transition-all">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          
          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 animate-reveal leading-[1.05] max-w-4xl text-white">
            Get your first <span className="text-gradient-purple">20 local leads</span> <br className="hidden md:block" />in under 10 minutes.
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed animate-reveal [animation-delay:100ms] font-medium">
             Try the no-login preview first, see real lead quality, then sign in with Google to save, regenerate outreach, and export.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto animate-reveal [animation-delay:200ms]">
            <a href="#preview" className="w-full sm:w-auto btn-primary px-8 py-4 text-[15px] shadow-[0_0_30px_var(--glow-indigo)]">
              Try No-Login Preview
            </a>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-xl text-[15px] font-bold text-white border border-[var(--border-primary)] hover:border-[var(--border-highlight)] hover:bg-[var(--bg-tertiary)] bg-[var(--bg-secondary)] text-center transition-all glass">
              Sign In
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl animate-reveal [animation-delay:260ms]">
            {HERO_STEPS.map((step) => (
              <div key={step} className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-secondary)]">
                {step}
              </div>
            ))}
          </div>

          {/* 3D Mock UI */}
          <div className="mt-28 relative w-full animate-reveal [animation-delay:400ms] perspective-1000 hidden md:block">
             <div className="relative transform-style-3d rotate-x-12 scale-90 transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] group hover:rotate-x-0 hover:scale-[0.98]">
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--glow-indigo)] to-transparent blur-3xl opacity-50 -z-10 group-hover:opacity-80 transition-opacity duration-1000" />
                <div className="aspect-[16/10] w-full glass-glow p-1 rounded-2xl relative overflow-hidden">
                    <MockUI />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-1000" />
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Guest Preview Section */}
      <section id="preview" className="relative z-10 py-24 sm:py-32 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="max-w-4xl mx-auto px-4 lg:px-0">
            <div className="text-center mb-12">
               <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border-secondary)] bg-[var(--bg-primary)] mb-6">
                 <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                 <span className="text-[10px] uppercase font-mono text-[var(--text-secondary)] tracking-wider">Live Software Demo</span>
               </div>
               <h2 className="text-3xl font-semibold mb-4 text-[var(--text-primary)]">Experience the engine.</h2>
               <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto leading-relaxed">
                  Test the scraping tool right now. Enter a city and niche to see the live data output format.
               </p>
            </div>
            <GuestPreview />
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-24 sm:py-32 relative border-t border-[var(--border-secondary)] bg-black">
        <div className="max-w-3xl mx-auto px-4 relative">
           <div className="text-center mb-20 animate-reveal">
             <h2 className="text-3xl md:text-5xl font-semibold text-gradient mb-4">From empty pipeline to ready-to-contact in 3 steps.</h2>
           </div>

           <div className="relative">
              {/* Central Beam Line */}
              <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-[2px] bg-[var(--border-secondary)] sm:-ml-[1px] overflow-hidden rounded-full">
                 <div className="w-full h-32 border-beam opacity-80" />
              </div>

              <div className="space-y-16">
                 {WORKFLOW.map((step, i) => (
                   <div key={i} className={`relative flex items-center gap-8 ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}>
                      {/* Step Number Balloon */}
                      <div className="absolute left-6 sm:left-1/2 -ml-4 sm:-ml-5 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#050505] border border-[var(--border-highlight)] z-10 flex items-center justify-center">
                         <span className="text-[10px] sm:text-xs font-mono font-medium text-white">{step.step}</span>
                      </div>

                      {/* Content Area */}
                      <div className={`flex-1 pl-16 sm:pl-0 ${i % 2 === 0 ? 'sm:text-right' : 'sm:text-left'}`}>
                         <h3 className="text-xl font-medium mb-2 text-[var(--text-primary)]">{step.title}</h3>
                         <p className="text-sm text-[var(--text-secondary)] leading-relaxed bg-[#050505]/80 p-4 rounded-xl border border-[var(--border-secondary)] inline-block text-left">{step.text}</p>
                      </div>
                      <div className="flex-1 hidden sm:block" />
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      {/* Features bento Grid */}
      <section className="py-24 sm:py-40 px-4 relative z-10 border-t border-[var(--border-secondary)] bg-[var(--bg-secondary)]/10">
        <div className="max-w-5xl mx-auto">
           <div className="mb-20 text-center">
              <div className="inline-block px-4 py-1.5 rounded-full border border-[var(--border-secondary)] bg-[var(--bg-secondary)] mb-6 shadow-xl">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-indigo)] to-[var(--accent-violet)]">Core Infrastructure</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Built to eliminate manual database scrubbing.</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feature, i) => (
                <div key={i} className={`spotlight-card p-8 rounded-3xl relative overflow-hidden group glass flex flex-col justify-between ${i === 2 ? 'lg:col-span-3 md:col-span-2' : ''}`}>
                   <div className="relative z-10 flex-1">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-secondary)] flex items-center justify-center text-3xl mb-8 group-hover:border-[var(--border-highlight)] transition-colors shadow-lg group-hover:shadow-[0_0_25px_var(--glow-violet)]">
                         {feature.icon}
                      </div>
                      <h3 className="text-2xl font-bold mb-3 text-white">{feature.title}</h3>
                      <p className="text-[var(--text-secondary)] leading-relaxed font-medium">{feature.desc}</p>
                   </div>
                   {i === 2 && (
                       <div className="absolute right-[-10%] bottom-[-20%] opacity-20 blur-3xl w-96 h-96 bg-gradient-to-tl from-[var(--accent-indigo)] to-transparent group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />
                   )}
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 border-t border-[var(--border-secondary)] bg-black">
         <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-semibold mb-12 text-center text-[var(--text-primary)]">Frequently Asked Questions</h2>
            <div className="space-y-4">
               {FAQS.map((faq, i) => (
                 <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] p-6 rounded-xl hover:border-[var(--border-highlight)] transition-colors">
                    <h3 className="text-base font-medium mb-3 text-[var(--text-primary)]">{faq.q}</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{faq.a}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 relative overflow-hidden border-t border-[var(--border-secondary)] bg-[var(--bg-primary)]">
         <div className="absolute inset-0 bg-gradient-to-t from-[var(--glow-indigo)] to-transparent opacity-10 pointer-events-none" />
         <div className="absolute bottom-[-30%] left-1/2 -translate-x-1/2 w-[80%] h-[70%] rounded-[100%] bg-[var(--glow-violet)] blur-[150px] opacity-30 animate-pulse-glow pointer-events-none" />
         
         <div className="max-w-3xl mx-auto px-4 text-center relative z-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-white leading-[1.1]">Ready to fill your calendar?</h2>
            <p className="text-[var(--text-secondary)] text-lg md:text-xl mb-12 font-medium max-w-xl mx-auto">
               Access the platform and generate your first targeted list in under 10 minutes.
            </p>
            <a href="#preview" className="inline-block px-10 py-5 rounded-xl btn-primary text-[15px] shadow-[0_0_40px_var(--glow-indigo)]">
               Try No-Login Preview <span className="ml-2">→</span>
            </a>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[var(--border-primary)] relative z-10 bg-[var(--bg-primary)]">
         <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
               <div className="w-5 h-5 bg-white rounded-sm" />
               <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)]">LeadPilot</span>
            </div>
            
            <div className="flex gap-6 text-sm text-[var(--text-secondary)]">
               <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
               <Link href="/login" className="hover:text-white transition-colors">Login</Link>
               <a href="mailto:rishetmehra11@gmail.com" className="hover:text-white transition-colors">Contact</a>
            </div>

            <p className="text-xs text-[var(--text-tertiary)]">
               &copy; {new Date().getFullYear()} LeadPilot Inc. All rights reserved.
            </p>
         </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-4 left-4 right-4 z-50 sm:hidden pointer-events-none">
         <a href="#preview" className="block w-full bg-white text-black text-center py-3.5 rounded-xl font-semibold text-sm shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-auto border border-black/10 transition-transform active:scale-95">
           Try Free Preview
         </a>
      </div>
    </div>
  );
}
