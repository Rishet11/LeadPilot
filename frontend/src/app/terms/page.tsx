export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-[var(--text-primary)]">
      <h1 className="text-3xl font-bold mb-3">Terms of Service</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-8">Last updated: February 22, 2026</p>

      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">Service Scope</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          LeadPilot is a self-serve SaaS product for data discovery, lead qualification, and export workflows. It is not an outreach sending platform.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">User Obligations</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          You are responsible for compliant usage of extracted data, including applicable anti-spam, privacy, and platform terms in your jurisdiction.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">Prohibited Conduct</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          You may not reverse-engineer, overload, resell, or bypass plan restrictions and security controls without explicit written permission.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">Billing and Plan Limits</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Access, quotas, and feature flags depend on the active subscription tier and account standing. Paid plans renew until cancelled.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Questions about these terms: <a className="underline hover:text-white" href="mailto:rishetmehra11@gmail.com">rishetmehra11@gmail.com</a>.
        </p>
      </section>
    </main>
  );
}
