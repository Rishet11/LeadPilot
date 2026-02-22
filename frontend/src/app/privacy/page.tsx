export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-[var(--text-primary)]">
      <h1 className="text-3xl font-bold mb-3">Privacy Policy</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-8">Last updated: February 22, 2026</p>

      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">What We Collect</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          LeadPilot stores account identity details (name, email), subscription/usage records, job logs, and lead records you create in the platform.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">How We Use Data</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          We use stored data to authenticate your account, run scraping workflows, calculate plan limits, and render dashboard analytics.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">Third-Party Processing</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          LeadPilot may use third-party providers to execute scraping and AI generation. We only share fields required to fulfill each request.
        </p>
      </section>

      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">Retention and Deletion</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Data is retained while your account is active and as needed for security, billing, and legal compliance. You can request deletion or export support by email.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          For privacy requests, contact <a className="underline hover:text-white" href="mailto:rishetmehra11@gmail.com">rishetmehra11@gmail.com</a>.
        </p>
      </section>
    </main>
  );
}
