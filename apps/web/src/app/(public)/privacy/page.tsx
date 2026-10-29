import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg-primary flex flex-col">
      <header className="border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="text-lg font-semibold text-fg-primary">
            TrellisFlow
          </Link>
        </div>
      </header>

      <article className="flex-1 max-w-3xl mx-auto px-6 py-16 prose-invert">
        <h1 className="text-3xl font-semibold text-fg-primary mb-2">Privacy Policy</h1>
        <p className="text-sm text-fg-secondary mb-8">Last updated: October 29, 2026</p>

        <div className="space-y-6 text-fg-secondary">
          <section>
            <h2 className="text-xl font-semibold text-fg-primary mb-3">What we collect</h2>
            <p>
              When you use TrellisFlow, we collect the information you provide directly: your name,
              email address, and the financial data you enter (accounts, transactions, budgets,
              goals). We also collect standard technical information like your IP address, browser
              type, and session activity for security purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-fg-primary mb-3">How we use it</h2>
            <p>
              We use your data solely to provide the TrellisFlow service: to display your financial
              information, calculate reports, generate insights, and secure your account. We do not
              sell your data. We do not share it with advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-fg-primary mb-3">How we protect it</h2>
            <p>
              All passwords are hashed with Argon2id. All connections use TLS. Session tokens are
              rotated and can be revoked at any time. Your financial data is isolated per user at
              the database level.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-fg-primary mb-3">Third parties</h2>
            <p>We use the following service providers:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong>Neon</strong> — for database hosting (United States)
              </li>
              <li>
                <strong>Render</strong> — for API hosting (United States)
              </li>
              <li>
                <strong>Vercel</strong> — for frontend hosting (United States)
              </li>
              <li>
                <strong>Resend</strong> — for sending transactional emails
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-fg-primary mb-3">Your rights</h2>
            <p>
              You can request a copy of your data, correct inaccurate information, or delete your
              account entirely by contacting{' '}
              <a
                href="mailto:support@trellisflow.com"
                className="text-accent-primary hover:underline"
              >
                support@trellisflow.com
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
