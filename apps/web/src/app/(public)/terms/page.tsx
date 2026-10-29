import Link from 'next/link';
import { MarketingFooter } from '@/components/layout/marketing-footer';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-bg-primary flex flex-col">
      <header className="border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="text-lg font-semibold text-fg-primary">
            TrellisFlow
          </Link>
        </div>
      </header>

      <article className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold text-fg-primary mb-2">Terms of Service</h1>
        <p className="text-sm text-fg-secondary mb-8">Last updated: October 29, 2026</p>

        <div className="space-y-6 text-fg-secondary">
          <section>
            <h2 className="text-xl font-semibold text-fg-primary mb-3">Acceptance</h2>
            <p>
              By creating an account on TrellisFlow, you agree to these terms. If you don&apos;t
              agree, please don&apos;t use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-fg-primary mb-3">Your account</h2>
            <p>
              You are responsible for keeping your password secure and for all activity that happens
              under your account. If you suspect unauthorized access, please change your password
              immediately from{' '}
              <Link href="/settings/security" className="text-accent-primary hover:underline">
                Settings → Security
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-fg-primary mb-3">Acceptable use</h2>
            <p>You agree to use TrellisFlow only for lawful purposes. You may not:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Attempt to access other users&apos; accounts or data</li>
              <li>Interfere with the operation of the service</li>
              <li>Use automated tools to scrape or abuse the API</li>
              <li>Share your account with others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-fg-primary mb-3">Service availability</h2>
            <p>
              TrellisFlow is provided &quot;as is&quot;. We aim for high availability but do not
              guarantee uninterrupted access. We are not responsible for any financial decisions you
              make based on the data shown in the app — always verify critical numbers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-fg-primary mb-3">Termination</h2>
            <p>
              You can delete your account at any time. We reserve the right to suspend or terminate
              accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-fg-primary mb-3">Contact</h2>
            <p>
              Questions? Email{' '}
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

      <MarketingFooter />
    </main>
  );
}
