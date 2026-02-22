"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type BillingCycle = "monthly" | "yearly";
type PlanKey = "free" | "starter" | "growth";

type PlanConfig = {
  key: PlanKey;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyLeadCredits: string;
  leadCreditsRaw: number;
  concurrentJobs: string;
  sources: string;
  support: string;
  cta: string;
  bestFor: string;
  highlighted?: boolean;
  features: string[];
};

const PLAN_CONFIGS: PlanConfig[] = [
  {
    key: "free",
    name: "Free",
    description: "For testing your local outbound workflow.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyLeadCredits: "100 / month",
    leadCreditsRaw: 100,
    concurrentJobs: "1 running job",
    sources: "Google Maps",
    support: "Email support",
    cta: "Start Free",
    bestFor: "Validating lead quality",
    features: [
      "100 lead credits per month",
      "Google Maps scraping",
      "Target Builder agent",
      "Lead scoring + notes",
      "CSV export",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    description: "For freelancers and solo operators closing local clients.",
    monthlyPrice: 29,
    yearlyPrice: 290,
    monthlyLeadCredits: "500 / month",
    leadCreditsRaw: 500,
    concurrentJobs: "2 running jobs",
    sources: "Google Maps",
    support: "Standard support",
    cta: "Get Starter",
    bestFor: "Weekly outbound execution",
    features: [
      "500 lead credits per month",
      "2 concurrent scrape jobs",
      "Target Builder agent",
      "AI outreach first-draft generation",
      "Export-ready prospect lists",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    description: "For small teams running outbound every week.",
    monthlyPrice: 79,
    yearlyPrice: 790,
    monthlyLeadCredits: "2,000 / month",
    leadCreditsRaw: 2000,
    concurrentJobs: "3 running jobs",
    sources: "Google Maps + Instagram",
    support: "Priority support",
    cta: "Upgrade to Growth",
    bestFor: "Team-based prospecting at scale",
    highlighted: true,
    features: [
      "2,000 lead credits per month",
      "Google Maps + Instagram scraping",
      "3 concurrent scrape jobs",
      "Target Builder + niche presets",
      "Priority support + faster export flow",
    ],
  },
];

const FAQS = [
  {
    question: "What counts as a lead credit?",
    answer:
      "Each lead record created in your workspace counts as one credit. Scrape jobs are blocked only when your monthly credit pool is exhausted.",
  },
  {
    question: "Can I change plans anytime?",
    answer:
      "Yes. You can upgrade or downgrade at any time. Changes apply to your next billing cycle unless your billing provider supports immediate proration.",
  },
  {
    question: "Do you send emails from LeadPilot?",
    answer:
      "LeadPilot focuses on qualified lead discovery and outreach draft generation. Most customers export to their preferred deliverability-safe outreach stack.",
  },
  {
    question: "Is there a refund policy?",
    answer:
      "If onboarding is clearly blocked due to a product issue, contact rishetmehra11@gmail.com within 7 days and we will review your case quickly.",
  },
];

function formatPrice(value: number): string {
  if (value === 0) return "$0";
  return `$${value.toLocaleString("en-US")}`;
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const checkoutLinks = useMemo(
    () => ({
      starter: process.env.NEXT_PUBLIC_LEMON_STARTER_URL || "",
      growth: process.env.NEXT_PUBLIC_LEMON_GROWTH_URL || "",
    }),
    []
  );

  const openCheckout = (plan: PlanConfig) => {
    if (plan.key === "free") {
      window.location.assign("/login");
      return;
    }

    const link =
      plan.key === "starter"
        ? checkoutLinks.starter
        : checkoutLinks.growth;

    if (!link) {
      window.location.assign(`mailto:rishetmehra11@gmail.com?subject=${encodeURIComponent(`LeadPilot ${plan.name} plan`)}`);
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  };

  const getLeadUnitCost = (plan: PlanConfig): string => {
    const billedPrice = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice / 12;
    if (billedPrice <= 0 || plan.leadCreditsRaw <= 0) return "Free";
    const perLead = billedPrice / plan.leadCreditsRaw;
    return `$${perLead.toFixed(2)} / lead`;
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-base)]/95 backdrop-blur-xl">
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
            <Link href="/login" className="btn-secondary px-4 py-2 text-xs">Log In</Link>
            <Link href="/dashboard" className="btn-primary px-4 py-2 text-xs">Open App</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-8 text-center">
          <p className="font-mono text-xs text-[var(--accent)] tracking-[0.2em] uppercase mb-5">Pricing</p>
          <h1 className="font-display text-4xl md:text-5xl font-medium tracking-[-0.03em] leading-tight mb-4">
            Plans designed to turn prospecting into signed clients
          </h1>
          <p className="text-[var(--text-secondary)] max-w-3xl mx-auto text-lg">
            Choose based on your monthly outreach volume. Start free, validate quality, then scale only when lead flow is working.
          </p>

          <div className="mt-8 inline-flex flex-col sm:flex-row items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Simple ROI benchmark:</span>
            <span>If 1 client is worth $1,500+ MRR, you only need one close to pay for Growth many times over.</span>
          </div>

          <div className="mt-10 inline-flex items-center gap-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-full p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                billingCycle === "monthly" ? "bg-[var(--accent)] text-black" : "text-[var(--text-secondary)]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                billingCycle === "yearly" ? "bg-[var(--accent)] text-black" : "text-[var(--text-secondary)]"
              }`}
            >
              Yearly (2 months free)
            </button>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {PLAN_CONFIGS.map((plan) => {
              const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
              const period = billingCycle === "monthly" ? "/month" : "/year";
              const monthEquivalent =
                billingCycle === "yearly" && plan.yearlyPrice > 0
                  ? `($${Math.round(plan.yearlyPrice / 12)}/mo equivalent)`
                  : "";

              return (
                <article
                  key={plan.key}
                  className={`relative rounded-2xl border p-6 flex flex-col ${
                    plan.highlighted
                      ? "bg-[var(--surface-card)] border-[var(--accent)] shadow-[0_0_30px_var(--accent-glow)]"
                      : "bg-[var(--surface-card)] border-[var(--border-default)]"
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-6 text-[10px] uppercase tracking-[0.18em] font-mono rounded-full bg-[var(--accent)] text-black px-3 py-1">
                      Most Popular
                    </span>
                  )}

                  <div className="mb-5">
                    <h2 className="text-2xl font-semibold">{plan.name}</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">{plan.description}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-2 uppercase tracking-wider font-mono">
                      Best for: {plan.bestFor}
                    </p>
                  </div>

                  <div className="mb-6">
                    <p className="text-4xl font-semibold tracking-tight">{formatPrice(price)}</p>
                    <p className="text-sm text-[var(--text-muted)]">{period}</p>
                    {monthEquivalent && <p className="text-xs text-[var(--text-muted)] mt-1">{monthEquivalent}</p>}
                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      Effective rate: <span className="text-[var(--text-primary)] font-semibold">{getLeadUnitCost(plan)}</span>
                    </p>
                  </div>

                  <ul className="space-y-2.5 text-sm text-[var(--text-secondary)] mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => openCheckout(plan)}
                    className={`mt-auto w-full py-3 rounded-xl text-sm font-medium transition-all ${
                      plan.highlighted
                        ? "btn-primary"
                        : plan.key === "free"
                          ? "btn-secondary"
                          : "bg-[var(--surface-elevated)] border border-[var(--border-default)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-10">
          <div className="card-static p-6 md:p-7">
            <h3 className="text-xl font-semibold mb-4">Plan comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    <th className="py-3 pr-4 font-medium">Capability</th>
                    {PLAN_CONFIGS.map((plan) => (
                      <th
                        key={`head-${plan.key}`}
                        className="py-3 px-4 font-medium"
                      >
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "Lead credits / month",
                      values: PLAN_CONFIGS.map((plan) => plan.monthlyLeadCredits),
                    },
                    {
                      label: "Concurrent jobs",
                      values: PLAN_CONFIGS.map((plan) => plan.concurrentJobs),
                    },
                    {
                      label: "Data sources",
                      values: PLAN_CONFIGS.map((plan) => plan.sources),
                    },
                    {
                      label: "Support",
                      values: PLAN_CONFIGS.map((plan) => plan.support),
                    },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-[var(--border-subtle)] last:border-b-0">
                      <td className="py-3 pr-4 text-[var(--text-secondary)]">{row.label}</td>
                      {row.values.map((value, i) => (
                        <td key={`${row.label}-${i}`} className="py-3 px-4 text-[var(--text-primary)]">{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 pb-14">
          <div className="mb-10 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 md:p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">What happens after purchase?</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
              <li>1. You sign in and start scraping immediately with your plan limits.</li>
              <li>2. You can queue targets, review scoring, and export CSV in the same session.</li>
              <li>3. If setup blocks you, onboarding support is available via email.</li>
            </ul>
          </div>

          <h3 className="text-2xl font-semibold mb-4">FAQ</h3>
          <div className="space-y-3">
            {FAQS.map((item, idx) => {
              const open = openFaq === idx;
              return (
                <div key={item.question} className="border border-[var(--border-default)] rounded-xl bg-[var(--surface-card)]">
                  <button
                    onClick={() => setOpenFaq(open ? null : idx)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between"
                  >
                    <span className="font-medium">{item.question}</span>
                    <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {open && <p className="px-5 pb-5 text-sm text-[var(--text-secondary)]">{item.answer}</p>}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-[var(--text-muted)] mt-8 text-center">
            By purchasing, you agree to our <Link href="/terms" className="underline hover:text-[var(--text-primary)]">Terms</Link>, <Link href="/privacy" className="underline hover:text-[var(--text-primary)]">Privacy Policy</Link>, and <Link href="/acceptable-use" className="underline hover:text-[var(--text-primary)]">Acceptable Use Policy</Link>.
          </p>
        </section>
      </main>
    </div>
  );
}
