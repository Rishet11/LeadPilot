export default function AcceptableUsePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-[var(--text-primary)]">
      <h1 className="text-3xl font-bold mb-3">Acceptable Use Policy</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-8">Last updated: February 22, 2026</p>

      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">Allowed Usage</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Use LeadPilot for lawful prospecting, internal research, and compliant outreach preparation.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">Restricted Usage</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          You may not use LeadPilot for illegal targeting, deceptive campaigns, unauthorized platform abuse, or unsolicited mass messaging that violates law.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">System Integrity</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Attempts to bypass quotas, evade billing limits, or disrupt service reliability are prohibited.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Enforcement</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          We may suspend or terminate accounts that violate this policy and cooperate with lawful requests where required.
        </p>
      </section>
    </main>
  );
}
