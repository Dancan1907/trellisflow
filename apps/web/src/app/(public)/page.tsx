import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg-primary flex flex-col">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-accent-primary" />
            <span className="text-lg font-semibold text-fg-primary">TrellisFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-fg-secondary hover:text-fg-primary transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-fg-primary mb-6 leading-tight">
            See all your money
            <br />
            <span className="text-accent-primary">in one place</span>
          </h1>
          <p className="text-lg text-fg-secondary max-w-2xl mx-auto mb-10">
            TrellisFlow brings your personal finances, investments, and businesses together in a
            single dashboard. Track what you have, watch what it becomes, and understand where every
            shilling is going.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group px-6 py-3 rounded-md bg-accent-primary text-white text-base font-medium hover:bg-accent-hover transition-colors inline-flex items-center gap-2"
            >
              Get started — it&apos;s free
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-md border border-border-subtle text-fg-primary text-base font-medium hover:bg-bg-tertiary transition-colors"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="border-t border-border-subtle bg-bg-secondary/40">
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Feature
            title="Personal finances"
            description="Accounts, transactions, budgets, and savings goals — everything for your day-to-day money, cleanly organized."
          />
          <Feature
            title="Investments"
            description="Track stocks, crypto, real estate, and other holdings with realized and unrealized gains. (Coming in Wave 2.)"
          />
          <Feature
            title="Businesses"
            description="Manage your businesses alongside your personal wealth — with P&L, runway, and cross-business views. (Coming in Wave 3.)"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-fg-tertiary">
          <span>© {new Date().getFullYear()} TrellisFlow. All rights reserved.</span>
          <span>Built with care, for people with complex money.</span>
        </div>
      </footer>
    </main>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-fg-primary mb-2">{title}</h3>
      <p className="text-sm text-fg-secondary leading-relaxed">{description}</p>
    </div>
  );
}
