"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import GuestPreview from "@/components/GuestPreview";

type DemoLead = {
  name: string;
  city: string;
  category: string;
  score: number;
  rating: number;
  reviews: number;
  status: "Hot" | "Warm";
  opportunity: string;
  signals: string[];
  email: string;
  outreach: string;
};

const QUICK_SEGMENTS = ["Dentist", "Med Spa", "HVAC", "Law Firm", "Gym", "Chiro"];
const CITY_PRESETS = ["Miami", "Austin", "Los Angeles", "Chicago", "Phoenix", "London"];

const PROOF_STRIP = [
  { label: "Time to first list", value: "< 10 min" },
  { label: "Lead scoring dimensions", value: "12 signals" },
  { label: "Outreach starter quality", value: "Research-based" },
  { label: "Best-fit users", value: "Local agencies" },
];

function buildDemoLeads(city: string, category: string): DemoLead[] {
  const brands = ["North", "Blue", "Prime", "Urban", "Summit", "Bright"];
  const suffixes = ["Studio", "Clinic", "Group", "Experts", "Works", "Care"];
  const opportunityAngles = [
    "Weak conversion path from maps traffic",
    "Under-leveraged reviews in outreach funnels",
    "Inconsistent local brand positioning",
    "Lead response speed likely too slow",
    "Strong demand, low website conversion confidence",
  ];
  const signalSets = [
    ["No clear CTA", "Outdated site", "Low review velocity"],
    ["Weak social proof", "No booking link", "Generic positioning"],
    ["Limited local SEO pages", "No nurture flow", "Thin offer messaging"],
    ["No follow-up automation", "Sparse case studies", "Slow first response"],
    ["High demand signal", "Low website trust", "Low offer clarity"],
  ];

  return Array.from({ length: 5 }).map((_, idx) => {
    const brand = brands[(idx + city.length) % brands.length];
    const suffix = suffixes[(idx + category.length) % suffixes.length];
    const name = `${brand} ${category} ${suffix}`;
    const score = 69 + idx * 6;
    const rating = 4.0 + idx * 0.2;
    const reviews = 24 + idx * 39;
    const status = score >= 82 ? "Hot" : "Warm";
    const opportunity = opportunityAngles[idx % opportunityAngles.length];
    const signals = signalSets[idx % signalSets.length];

    return {
      name,
      city,
      category,
      score,
      rating: Number(rating.toFixed(1)),
      reviews,
      status,
      opportunity,
      signals,
      email: `owner@${name.toLowerCase().replace(/\s+/g, "").slice(0, 16)}.com`,
      outreach: `Hey ${name}, spotted your ${rating.toFixed(1)} star reputation in ${city}. You already have demand, but your digital capture flow looks under-optimized. Want a fast teardown with a practical growth plan?`,
    };
  });
}

const WORKFLOW = [
  {
    title: "Set objective",
    text: "Type what you want: niche, city, and lead quality constraints.",
  },
  {
    title: "Generate targets",
    text: "Target Builder turns one sentence into clean scrape targets.",
  },
  {
    title: "Queue and score",
    text: "LeadPilot scrapes, qualifies, and prioritizes accounts automatically.",
  },
  {
    title: "Export and close",
    text: "Push the list into your outreach stack and start conversations.",
  },
];

const VALUE_BLOCKS = [
  {
    title: "Local gap scoring",
    text: "Flags weak digital presence opportunities instead of random directories.",
  },
  {
    title: "Fast outreach drafts",
    text: "Creates personalized first-touch copy so reps start from 80%, not 0%.",
  },
  {
    title: "Batch campaigns",
    text: "Run multi-city, multi-niche queue jobs in one workflow.",
  },
  {
    title: "Agency-ready output",
    text: "Export qualified leads and deliver a clear narrative to clients.",
  },
];

const PLAYBOOKS = [
  {
    niche: "Dentist Playbook",
    target: "Clinics with 4.3+ ratings and weak conversion UX",
    angle: "Turn review credibility into booked consults",
  },
  {
    niche: "Med Spa Playbook",
    target: "Studios with demand but inconsistent offer messaging",
    angle: "Improve premium positioning and funnel clarity",
  },
  {
    niche: "HVAC Playbook",
    target: "Providers with seasonal traffic and weak lead capture",
    angle: "Increase call-to-book conversion during peak windows",
  },
  {
    niche: "Law Firm Playbook",
    target: "Firms with trust signals but low response systems",
    angle: "Convert inquiry intent with faster follow-up flows",
  },
];

const ICP_CARDS = [
  {
    title: "Web design agencies",
    text: "Find businesses with demand but no conversion-ready web presence.",
  },
  {
    title: "Performance marketers",
    text: "Discover local accounts where paid traffic can produce fast wins.",
  },
  {
    title: "Freelance closers",
    text: "Build weekly prospect lists with messaging that sounds researched.",
  },
];

const AGENT_STACK = [
  {
    title: "Target Builder Agent",
    text: "Convert one sentence into niche + city + quality constraints.",
  },
  {
    title: "Lead Research Agent",
    text: "Summarizes signals and drafts context-aware first-touch copy.",
  },
  {
    title: "Follow-up Agent",
    text: "Generates a short follow-up sequence based on status and intent.",
  },
  {
    title: "Campaign QA Agent",
    text: "Flags risky or low-trust copy before you send anything.",
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

export default function LandingPage() {
  const [industry, setIndustry] = useState("Dentist");
  const [city, setCity] = useState("Miami");
  const [leads, setLeads] = useState<DemoLead[]>(buildDemoLeads("Miami", "Dentist"));
  const [avgDealValue, setAvgDealValue] = useState(1500);
  const [monthlyCloses, setMonthlyCloses] = useState(3);
  const [activePlaybook, setActivePlaybook] = useState(PLAYBOOKS[0].niche);

  const runDemo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanedIndustry = industry.trim();
    const cleanedCity = city.trim();
    if (!cleanedIndustry || !cleanedCity) return;
    setLeads(buildDemoLeads(cleanedCity, cleanedIndustry));
  };

  const projectedMonthlyRevenue = useMemo(() => avgDealValue * monthlyCloses, [avgDealValue, monthlyCloses]);
  const growthPlanCost = 99;
  const projectedROI = useMemo(() => {
    if (growthPlanCost <= 0) return 0;
    return Math.round((projectedMonthlyRevenue / growthPlanCost) * 10) / 10;
  }, [projectedMonthlyRevenue]);

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)] relative overflow-x-hidden">
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[70rem] h-[28rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.18)_0%,rgba(212,175,55,0.08)_35%,transparent_72%)] blur-2xl" />
      <div className="pointer-events-none absolute top-[32rem] -left-40 w-[30rem] h-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.08)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute top-[60rem] -right-40 w-[30rem] h-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)]" />

      <div className="relative z-10 bg-[linear-gradient(90deg,rgba(212,175,55,0.18),rgba(212,175,55,0.06))] border-b border-[var(--accent)]/20 text-center py-2.5 text-sm font-medium">
        Built for local agencies that need qualified outreach lists in minutes.
      </div>

      <header className="relative z-10 border-b border-[var(--border-subtle)] bg-[var(--surface-base)]/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-[-0.02em]">LeadPilot</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/pricing" className="btn-secondary px-4 py-2 text-xs">Pricing</Link>
            <Link href="/login" className="btn-primary px-4 py-2 text-xs">Start Free</Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-dim)] mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
                  Local Outbound Copilot
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-medium tracking-[-0.04em] leading-[1.03]">
                Turn one objective into a <span className="text-gold-gradient">revenue-ready local pipeline</span>
              </h1>
              <p className="text-lg text-[var(--text-secondary)] leading-relaxed mt-6 max-w-xl">
                LeadPilot discovers, scores, and drafts outreach for local businesses so agencies can spend less time list-building and more time closing deals.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" className="btn-primary px-6 py-3 text-sm">Start with Google</Link>
                <Link href="/dashboard" className="btn-secondary px-6 py-3 text-sm">See Dashboard</Link>
              </div>

              <div className="mt-7 space-y-2">
                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                  Niche-first targeting for local businesses, not generic B2B lists
                </p>
                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                  AI-generated first-touch drafts with practical offer angles
                </p>
                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                  Export-ready lead packs your team can act on immediately
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PROOF_STRIP.map((item) => (
                  <div key={item.label} className="card-static p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)] mb-1">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-static p-6 lg:p-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-[0.2em] mb-1">Interactive Demo</p>
                  <h2 className="text-lg font-semibold">Preview lead output instantly</h2>
                </div>
                <span className="tag tag-gold font-mono text-[10px]">Live</span>
              </div>

              <form onSubmit={runDemo} className="grid sm:grid-cols-3 gap-3 mb-4">
                <input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="field px-4 py-3 text-sm"
                  placeholder="Industry"
                />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="field px-4 py-3 text-sm"
                  placeholder="City"
                />
                <button type="submit" className="btn-primary px-4 py-3 text-sm">Generate</button>
              </form>

              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_SEGMENTS.map((segment) => (
                  <button
                    key={segment}
                    type="button"
                    onClick={() => setIndustry(segment)}
                    className="tag text-[11px] hover:border-[var(--accent)]"
                  >
                    {segment}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {CITY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCity(preset)}
                    className="tag text-[11px]"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
                {leads.map((lead, idx) => (
                  <div key={`${lead.name}-${idx}`} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3.5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-semibold">{lead.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{lead.category} in {lead.city} · {lead.rating}★ ({lead.reviews} reviews)</p>
                      </div>
                      <div className="text-right">
                        <span className="tag font-mono text-[10px]">Score {lead.score}</span>
                        <p className={`text-[10px] mt-1 font-mono uppercase tracking-wide ${lead.status === "Hot" ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                          {lead.status}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--accent)] mb-2">{lead.opportunity}</p>
                    <p className="text-[11px] text-[var(--text-dim)] mb-2">{lead.email}</p>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{lead.outreach}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {lead.signals.map((signal) => (
                        <span key={signal} className="tag text-[10px]">
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <GuestPreview />

        <section className="border-y border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.0))]">
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="mb-8">
              <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-[0.2em] mb-2">Who It Is For</p>
              <h2 className="font-display text-3xl tracking-[-0.03em]">Built for service teams that sell outcomes</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {ICP_CARDS.map((card) => (
                <article key={card.title} className="card-static p-5">
                  <h3 className="text-sm font-semibold mb-2">{card.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-[0.2em] mb-2">Niche Playbooks</p>
              <h2 className="font-display text-3xl tracking-[-0.03em]">Start from proven local outreach angles</h2>
            </div>
            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">Click any playbook to preview target positioning</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {PLAYBOOKS.map((playbook) => (
                <button
                  key={playbook.niche}
                  type="button"
                  onClick={() => setActivePlaybook(playbook.niche)}
                  className={`card-static p-4 text-left transition-colors ${
                    activePlaybook === playbook.niche ? "border-[var(--accent)]/50 bg-[var(--accent-dim)]" : ""
                  }`}
                >
                  <p className="text-sm font-semibold mb-1">{playbook.niche}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{playbook.target}</p>
                </button>
              ))}
            </div>
            <div className="card-static p-5">
              {PLAYBOOKS.filter((item) => item.niche === activePlaybook).map((item) => (
                <div key={item.niche}>
                  <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-[0.18em] mb-2">Current Playbook</p>
                  <h3 className="text-lg font-semibold mb-2">{item.niche}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">{item.target}</p>
                  <div className="impact-box">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Suggested offer angle</p>
                    <p className="text-sm">{item.angle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-[0.2em] mb-2">How It Works</p>
              <h2 className="font-display text-3xl tracking-[-0.03em] mb-5">From objective to outreach in one flow</h2>
              <div className="space-y-3">
                {WORKFLOW.map((step, idx) => (
                  <div key={step.title} className="card-static p-4">
                    <p className="font-mono text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-1">Step {idx + 1}</p>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-[0.2em] mb-2">Value Layer</p>
              <h2 className="font-display text-3xl tracking-[-0.03em] mb-5">Features that directly support revenue</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {VALUE_BLOCKS.map((block) => (
                  <div key={block.title} className="card-static p-4">
                    <h3 className="text-sm font-semibold mb-1.5">{block.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{block.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                {AGENT_STACK.map((agent) => (
                  <div key={agent.title} className="card-static p-4">
                    <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-wider mb-1">Agent</p>
                    <h3 className="text-sm font-semibold mb-1.5">{agent.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{agent.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 card-static p-5">
                <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-[0.2em] mb-2">Back-of-Napkin ROI</p>
                <h3 className="text-base font-semibold mb-4">What if LeadPilot helps you close a few more each month?</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5">Average client value</label>
                    <input
                      type="range"
                      min={500}
                      max={6000}
                      step={100}
                      value={avgDealValue}
                      onChange={(e) => setAvgDealValue(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-sm mt-1 font-medium">${avgDealValue.toLocaleString()} / client</p>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5">Monthly closes from LeadPilot pipeline</label>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      step={1}
                      value={monthlyCloses}
                      onChange={(e) => setMonthlyCloses(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-sm mt-1 font-medium">{monthlyCloses} closes / month</p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-dim)] p-4">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Projected monthly revenue influenced</p>
                  <p className="text-2xl font-semibold tracking-tight">${projectedMonthlyRevenue.toLocaleString()}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">~{projectedROI}x vs Growth plan (${growthPlanCost}/month)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.015),rgba(255,255,255,0))]">
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="mb-7">
              <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-[0.2em] mb-2">FAQ</p>
              <h2 className="font-display text-3xl tracking-[-0.03em]">Answers teams ask before they buy</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {FAQS.map((faq) => (
                <article key={faq.q} className="card-static p-5">
                  <h3 className="text-sm font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{faq.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--border-subtle)]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="card-static p-8 text-center">
              <p className="font-mono text-[10px] text-[var(--accent)] uppercase tracking-[0.2em] mb-3">Ready To Launch</p>
              <h2 className="font-display text-3xl sm:text-4xl tracking-[-0.03em] mb-3">
                Get qualified local prospects and outreach copy this week
              </h2>
              <p className="text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
                Start with Google sign-in, pick your niche, queue targets, and export a pipeline your sales team can action immediately.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/pricing" className="btn-primary px-6 py-3 text-sm">See Pricing</Link>
                <Link href="/login" className="btn-secondary px-6 py-3 text-sm">Sign In with Google</Link>
                <Link href="/dashboard" className="btn-secondary px-6 py-3 text-sm">Open Dashboard</Link>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-5">
                Questions? Contact <a href="mailto:rishetmehra11@gmail.com" className="text-[var(--accent)] hover:underline">rishetmehra11@gmail.com</a>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
