"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type PlanKey = "free" | "launch" | "starter";

type PlanConfig = {
  key: PlanKey;
  name: string;
  description: string;
  monthlyPriceInr: number;
  firstMonthPriceInr: number;
  monthlyLeadCredits: string;
  leadCreditsRaw: number;
  concurrentJobs: string;
  sources: string;
  support: string;
  cta: string;
  bestFor: string;
  highlighted?: boolean;
  recurringJobs: boolean;
  customIcpScoring: boolean;
  outreachPack: boolean;
  smartCleanup: boolean;
  priorityQueue: boolean;
  features: string[];
};

const FOUNDING_OFFER_CAP = 50;
const TOPUP_PRICE_PER_1000 = 299;

const PLAN_CONFIGS: PlanConfig[] = [
  {
    key: "free",
    name: "Free",
    description: "For testing data quality and workflow fit before paying.",
    monthlyPriceInr: 0,
    firstMonthPriceInr: 0,
    monthlyLeadCredits: "100 credits / month",
    leadCreditsRaw: 100,
    concurrentJobs: "1 running job",
    sources: "Google Maps",
    support: "Email support",
    cta: "Start Free",
    bestFor: "Initial evaluation",
    recurringJobs: false,
    customIcpScoring: false,
    outreachPack: false,
    smartCleanup: false,
    priorityQueue: false,
    features: [
      "100 credits per month",
      "Google Maps collection",
      "Target Builder agent",
      "Basic record scoring + notes",
      "CSV export",
    ],
  },
  {
    key: "launch",
    name: "Launch",
    description: "For solo operators running recurring prospecting campaigns.",
    monthlyPriceInr: 499,
    firstMonthPriceInr: 249,
    monthlyLeadCredits: "500 credits / month",
    leadCreditsRaw: 500,
    concurrentJobs: "2 running jobs",
    sources: "Google Maps + Instagram",
    support: "Standard support",
    cta: "Get Launch",
    bestFor: "Manual prospecting",
    highlighted: true,
    recurringJobs: false,
    customIcpScoring: false,
    outreachPack: false,
    smartCleanup: false,
    priorityQueue: false,
    features: [
      "500 credits per month",
      "Google Maps + Instagram collection",
      "2 concurrent collection jobs",
      "Basic AI scoring",
      "CSV export",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    description: "For teams who want AI-assisted qualification and higher throughput.",
    monthlyPriceInr: 1499,
    firstMonthPriceInr: 749,
    monthlyLeadCredits: "2,500 credits / month",
    leadCreditsRaw: 2500,
    concurrentJobs: "3 running jobs",
    sources: "Google Maps + Instagram",
    support: "Priority support",
    cta: "Upgrade to Starter",
    bestFor: "AI-automated pipeline",
    recurringJobs: true,
    customIcpScoring: true,
    outreachPack: true,
    smartCleanup: true,
    priorityQueue: true,
    features: [
      "2,500 credits per month",
      "Recurring jobs (daily/weekly)",
      "Custom AI ICP scoring (score + reason)",
      "AI outreach pack (opener + angle + first message)",
      "Smart cleanup (dedupe + quality filtering)",
      "Priority queue",
    ],
  },
];

const FAQS = [
  {
    question: "How does the Founding 50 offer work?",
    answer:
      "The first 50 paying customers get 50% off the first billing cycle on paid plans. From the second month, regular plan pricing applies.",
  },
  {
    question: "What counts as a credit?",
    answer:
      "Each record created in your workspace counts as one credit. If your plan quota is exhausted, you can buy top-ups without upgrading your plan.",
  },
  {
    question: "Can I change plans anytime?",
    answer:
      "Yes. You can move between Launch and Starter at any time. Plan changes apply from the next billing cycle unless your payment provider supports proration.",
  },
  {
    question: "Do you send outreach emails from LeadPilot?",
    answer:
      "No. LeadPilot helps with collection, qualification, and export. Sending is handled in your existing outreach tools.",
  },
];

function formatInr(value: number): string {
  if (value === 0) return "Rs 0";
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function capability(value: boolean): string {
  return value ? "Included" : "Not included";
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const checkoutLinks = useMemo(
    () => ({
      launch: process.env.NEXT_PUBLIC_DODO_LAUNCH_URL || "",
      starter: process.env.NEXT_PUBLIC_DODO_STARTER_URL || "",
    }),
    []
  );

  const openCheckout = (plan: PlanConfig) => {
    if (plan.key === "free") {
      window.location.assign("/login");
      return;
    }

    const link = plan.key === "launch" ? checkoutLinks.launch : checkoutLinks.starter;

    if (!link) {
      window.location.assign(`mailto:rishetmehra11@gmail.com?subject=${encodeURIComponent(`LeadPilot ${plan.name} plan`)}`);
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  };

  const getPerThousandCost = (plan: PlanConfig): string => {
    if (plan.monthlyPriceInr <= 0 || plan.leadCreditsRaw <= 0) return "Free";
    const cost = (plan.monthlyPriceInr / plan.leadCreditsRaw) * 1000;
    return `${formatInr(Math.round(cost))} / 1,000 credits`;
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
            India launch pricing for local data ops
          </h1>
          <p className="text-[var(--text-secondary)] max-w-3xl mx-auto text-lg">
            Start with Free, move to Launch for live campaigns, and upgrade to Starter when you need automation and AI-qualified output.
          </p>

          <div className="mt-8 inline-flex flex-col sm:flex-row items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--surface-elevated)] px-4 py-3 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Founding {FOUNDING_OFFER_CAP} offer:</span>
            <span>50% off first month on Launch and Starter. One redemption per account.</span>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {PLAN_CONFIGS.map((plan) => {
              const paid = plan.monthlyPriceInr > 0;

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
                      Best Entry Paid Plan
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
                    {paid ? (
                      <>
                        <p className="text-4xl font-semibold tracking-tight">{formatInr(plan.firstMonthPriceInr)}</p>
                        <p className="text-xs text-[var(--accent)] mt-1">first month with Founding {FOUNDING_OFFER_CAP}</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Then {formatInr(plan.monthlyPriceInr)} / month</p>
                      </>
                    ) : (
                      <>
                        <p className="text-4xl font-semibold tracking-tight">{formatInr(plan.monthlyPriceInr)}</p>
                        <p className="text-sm text-[var(--text-muted)]">/ month</p>
                      </>
                    )}
                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      Effective rate: <span className="text-[var(--text-primary)] font-semibold">{getPerThousandCost(plan)}</span>
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

        <section className="max-w-7xl mx-auto px-6 pb-8">
          <div className="card-static p-6 md:p-7">
            <h3 className="text-xl font-semibold mb-4">Plan comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    <th className="py-3 pr-4 font-medium">Capability</th>
                    {PLAN_CONFIGS.map((plan) => (
                      <th key={`head-${plan.key}`} className="py-3 px-4 font-medium">{plan.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "Credits / month",
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
                      label: "Recurring jobs automation",
                      values: PLAN_CONFIGS.map((plan) => capability(plan.recurringJobs)),
                    },
                    {
                      label: "Custom AI ICP scoring",
                      values: PLAN_CONFIGS.map((plan) => capability(plan.customIcpScoring)),
                    },
                    {
                      label: "AI outreach pack",
                      values: PLAN_CONFIGS.map((plan) => capability(plan.outreachPack)),
                    },
                    {
                      label: "Smart cleanup",
                      values: PLAN_CONFIGS.map((plan) => capability(plan.smartCleanup)),
                    },
                    {
                      label: "Priority queue",
                      values: PLAN_CONFIGS.map((plan) => capability(plan.priorityQueue)),
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

        <section className="max-w-4xl mx-auto px-6 pb-10">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 md:p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Credit top-ups</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Add credits without changing your plan: <span className="text-[var(--text-primary)] font-semibold">{formatInr(TOPUP_PRICE_PER_1000)} per 1,000 credits</span>.
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Top-ups are useful for seasonal spikes so your collection flow does not pause mid-campaign.
            </p>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 pb-14">
          <div className="mb-10 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 md:p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">What happens after purchase?</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
              <li>1. You sign in and start running collection jobs immediately within your plan limits.</li>
              <li>2. You can queue targets, review AI scoring, and export CSV in the same workflow.</li>
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
            Founding {FOUNDING_OFFER_CAP} discount applies to the first billing cycle only, cannot be combined with other offers, and is limited to one redemption per account.
          </p>

          <p className="text-xs text-[var(--text-muted)] mt-4 text-center">
            By purchasing, you agree to our <Link href="/terms" className="underline hover:text-[var(--text-primary)]">Terms</Link>, <Link href="/privacy" className="underline hover:text-[var(--text-primary)]">Privacy Policy</Link>, and <Link href="/acceptable-use" className="underline hover:text-[var(--text-primary)]">Acceptable Use Policy</Link>.
          </p>
        </section>
      </main>
    </div>
  );
}
