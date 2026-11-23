import Link from 'next/link';
import { ArrowRight, Wallet, TrendingUp, Building2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg-primary flex flex-col relative overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent-primary/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-primary/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Simple Logo Mark */}
            <div className="w-8 h-8 rounded-md bg-accent-primary flex items-center justify-center">
              <span className="text-bg-primary font-display font-bold text-lg">T</span>
            </div>
            <span className="text-xl font-display font-semibold tracking-tight text-fg-primary">
              TrellisFlow
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-fg-secondary hover:text-fg-primary transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-md bg-fg-primary text-bg-primary text-sm font-medium hover:bg-white transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl md:text-7xl font-display font-semibold tracking-tight text-fg-primary mb-6 leading-[1.1]">
          See all your money <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-fg-secondary">
            in one place.
          </span>
        </h1>
        <p className="text-lg text-fg-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          TrellisFlow brings your personal finances, investments, and businesses together in a
          single, beautifully unified dashboard. Track what you have, watch what it becomes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 w-full sm:w-auto">
          <Link
            href="/signup"
            className="group w-full sm:w-auto px-6 py-3 rounded-md bg-accent-primary text-bg-primary text-base font-medium hover:bg-accent-hover transition-all inline-flex items-center justify-center gap-2"
          >
            Get started — it&apos;s free
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 rounded-md bg-bg-secondary border border-border-subtle text-fg-primary text-base font-medium hover:bg-bg-tertiary transition-colors text-center"
          >
            View Demo
          </Link>
        </div>

        {/* App Mockup (Pure CSS) */}
        <div className="relative w-full max-w-4xl mx-auto rounded-xl border border-border-subtle bg-bg-secondary/50 backdrop-blur-xl p-2 shadow-2xl">
          <div className="rounded-lg bg-bg-primary border border-border-subtle overflow-hidden flex text-left">
            {/* Fake Sidebar */}
            <div className="w-48 border-r border-border-subtle bg-bg-secondary p-4 hidden md:block">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-border-strong" />
                    <div className="h-3 w-24 bg-border-strong rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Fake Main Content */}
            <div className="flex-1 p-8">
              <div className="mb-8">
                <div className="h-4 w-24 bg-border-strong rounded mb-2" />
                <div className="h-10 w-64 bg-fg-primary/90 rounded" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-32 rounded-lg bg-bg-secondary border border-border-subtle p-4">
                  <div className="h-3 w-16 bg-border-strong rounded mb-4" />
                  <div className="h-8 w-32 bg-accent-primary/20 rounded" />
                </div>
                <div className="h-32 rounded-lg bg-bg-secondary border border-border-subtle p-4">
                  <div className="h-3 w-16 bg-border-strong rounded mb-4" />
                  <div className="h-8 w-32 bg-accent-primary/20 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="relative z-10 border-t border-border-subtle bg-bg-secondary/30">
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-12">
          <Feature
            icon={<Wallet size={24} className="text-accent-primary" />}
            title="Personal finances"
            description="Accounts, transactions, budgets, and savings goals — everything for your day-to-day money, cleanly organized."
          />
          <Feature
            icon={<TrendingUp size={24} className="text-accent-primary" />}
            title="Investments"
            description="Track stocks, crypto, real estate, and other holdings with realized and unrealized gains."
          />
          <Feature
            icon={<Building2 size={24} className="text-accent-primary" />}
            title="Businesses"
            description="Manage your businesses alongside your personal wealth — with P&L, runway, and cross-business views."
          />
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col group">
      <div className="w-12 h-12 rounded-lg bg-bg-primary border border-border-subtle flex items-center justify-center mb-6 group-hover:border-accent-primary/50 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-display font-semibold text-fg-primary mb-2">{title}</h3>
      <p className="text-sm text-fg-secondary leading-relaxed">{description}</p>
    </div>
  );
}
