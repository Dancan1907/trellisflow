'use client';

import { useState } from 'react';
import {
  BookOpen,
  LayoutDashboard,
  User,
  TrendingUp,
  Building2,
  Wallet,
  Target,
  CreditCard,
  BarChart3,
  ShieldCheck,
  PlayCircle,
  HelpCircle,
  Box,
  PieChart,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth/auth-store';

const SECTIONS = [
  {
    title: 'Getting Started',
    icon: BookOpen,
    items: [
      { id: 'introduction', label: 'Introduction to TrellisFlow' },
      { id: 'dashboard', label: 'Your Dashboard' },
      { id: 'containers', label: 'Understanding Containers' },
    ],
  },
  {
    title: 'Manage Your Money',
    icon: Wallet,
    items: [
      { id: 'personal', label: 'Personal Finance' },
      { id: 'investments', label: 'Investments' },
      { id: 'businesses', label: 'Businesses' },
    ],
  },
  {
    title: 'Plan Your Finances',
    icon: Target,
    items: [
      { id: 'budgets', label: 'Budgets' },
      { id: 'goals', label: 'Savings Goals' },
      { id: 'debt', label: 'Debt Payoff' },
    ],
  },
  {
    title: 'Analyze & Manage',
    icon: BarChart3,
    items: [
      { id: 'reports', label: 'Reports & Insights' },
      { id: 'security', label: 'Security & Privacy' },
    ],
  },
];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('introduction');
  const isAuthenticated = Boolean(useAuthStore((state) => state.token));

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto pb-20">
      <section className="w-full rounded-xl border border-accent-primary/30 bg-bg-secondary p-4 lg:hidden"><p className="text-sm font-semibold text-fg-primary">Need help finding something?</p><p className="mt-1 text-xs text-fg-secondary">{isAuthenticated ? "Use the Help Assistant to ask questions and find the right TrellisFlow page." : "Sign in to unlock the complete user guide and the Help Assistant."}</p>{!isAuthenticated && <Link href="/login" className="mt-2 inline-flex text-sm font-semibold text-accent-primary">Sign in →</Link>}</section>
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 shrink-0">
        <div className="sticky top-24 space-y-6">
          <div className="bg-bg-secondary border border-border-subtle rounded-xl p-4">
            <h2 className="text-sm font-bold text-fg-primary uppercase tracking-wider mb-4 px-2">
              User Guide
            </h2>
            <nav className="space-y-4">
              {SECTIONS.map((section) => (
                <div key={section.title}>
                  <div className="flex items-center gap-2 px-2 mb-2">
                    <section.icon size={14} className="text-fg-tertiary" />
                    <h3 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                  <ul className="space-y-1">
                    {section.items.filter((item) => isAuthenticated || ['introduction', 'dashboard', 'containers'].includes(item.id)).map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          onClick={() => setActiveSection(item.id)}
                          className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                            activeSection === item.id
                              ? 'bg-accent-primary/10 text-accent-primary font-medium'
                              : 'text-fg-secondary hover:bg-bg-tertiary hover:text-fg-primary'
                          }`}
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          {/* Quick Actions */}
          {isAuthenticated && <div className="bg-bg-secondary border border-border-subtle rounded-xl p-4 space-y-2">
            <button
              onClick={() => (window.location.href = '/dashboard?tour=true')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-fg-primary bg-bg-tertiary rounded-md hover:bg-border-subtle transition-colors"
            >
              <PlayCircle size={16} className="text-accent-primary" /> Restart Quick Tour
            </button>
          </div>}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-12 bg-bg-secondary border border-border-subtle rounded-2xl p-6 md:p-10 shadow-lg">
        {/* Introduction */}
        <section id="introduction" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
              <BookOpen className="text-accent-primary" size={20} />
            </div>
            <h1 className="text-2xl font-display font-bold text-fg-primary">
              Welcome to TrellisFlow
            </h1>
          </div>
          <p className="text-fg-secondary leading-relaxed mb-4">
            TrellisFlow is designed to give you a complete, unified view of your financial life.
            Unlike traditional apps that only track personal budgets or only track investments,
            TrellisFlow brings <strong>Personal Finances, Investments, and Businesses</strong>{' '}
            together into a single, intelligent dashboard.
          </p>
          <p className="text-fg-secondary leading-relaxed">
            This guide will walk you through every feature of the platform, explaining not just{' '}
            <em>how</em> to use it, but <em>why</em> it matters for your financial health.
          </p>
        </section>

        <hr className="border-border-subtle" />

        {/* Dashboard */}
        <section id="dashboard" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <LayoutDashboard className="text-accent-primary" size={24} />
            <h2 className="text-xl font-display font-semibold text-fg-primary">Your Dashboard</h2>
          </div>
          <p className="text-fg-secondary leading-relaxed mb-4">
            The Dashboard is your command center. The moment you log in, you get a snapshot of your
            entire net worth, updated in real-time based on the data in your containers.
          </p>
          <ul className="list-disc list-inside text-fg-secondary space-y-2 ml-2">
            <li>
              <strong>Total Net Worth:</strong> The sum of all your assets minus your liabilities
              across every container.
            </li>
            <li>
              <strong>Cash Flow:</strong> Shows how much money came in versus how much went out this
              month.
            </li>
            <li>
              <strong>Portfolio Overview:</strong> A visual breakdown of how your wealth is
              distributed between Personal, Investments, and Businesses.
            </li>
          </ul>
        </section>

        <hr className="border-border-subtle" />

        {/* Containers (MISSING PREVIOUSLY) */}
        <section id="containers" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Box className="text-accent-primary" size={24} />
            <h2 className="text-xl font-display font-semibold text-fg-primary">
              Understanding Containers
            </h2>
          </div>
          <p className="text-fg-secondary leading-relaxed mb-4">
            A <strong>Container</strong> is simply a bucket that holds a specific type of financial
            data. By keeping your Personal money, Investments, and Business finances in separate
            containers, TrellisFlow can give you distinct reports for each while still rolling them
            all up into a single Net Worth figure.
          </p>
          <ul className="list-disc list-inside text-fg-secondary space-y-2 ml-2">
            <li>
              <strong>Personal:</strong> For your everyday accounts, expenses, and income.
            </li>
            <li>
              <strong>Investments:</strong> For tracking assets, portfolios, and market value.
            </li>
            <li>
              <strong>Businesses:</strong> For tracking company revenue, expenses, and runway.
            </li>
          </ul>
        </section>

        <hr className="border-border-subtle" />

        {isAuthenticated && (
          <>
        {/* Personal Finance */}
        <section id="personal" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <User className="text-accent-primary" size={24} />
            <h2 className="text-xl font-display font-semibold text-fg-primary">Personal Finance</h2>
          </div>
          <p className="text-fg-secondary leading-relaxed mb-4">
            Your <strong>Personal</strong> container is where you track the money you use every day.
            It handles your bank accounts, mobile money wallets, and cash.
          </p>
          <div className="bg-bg-tertiary rounded-lg p-4 mb-4">
            <h4 className="text-sm font-bold text-fg-primary mb-2">How to use it:</h4>
            <ol className="list-decimal list-inside text-sm text-fg-secondary space-y-1">
              <li>
                Go to the Personal tab and click <strong>"Add Account"</strong>.
              </li>
              <li>
                Enter your account name, type (e.g., Checking, Mobile Money), and current balance.
              </li>
              <li>
                Use the <strong>"Add Transaction"</strong> button to record income and expenses.
              </li>
            </ol>
          </div>
          <p className="text-sm text-fg-tertiary italic">
            <strong>Tip:</strong> Recording your daily transactions is the most important step for
            building an accurate financial picture.
          </p>
        </section>

        <hr className="border-border-subtle" />

        {/* Investments */}
        <section id="investments" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-accent-primary" size={24} />
            <h2 className="text-xl font-display font-semibold text-fg-primary">Investments</h2>
          </div>
          <p className="text-fg-secondary leading-relaxed mb-4">
            The <strong>Investments</strong> container is your portfolio tracker. It allows you to
            monitor stocks, ETFs, crypto, and real estate, calculating your unrealized gains
            automatically.
          </p>
          <ul className="list-disc list-inside text-fg-secondary space-y-2 ml-2">
            <li>Add a holding (e.g., AAPL or Bitcoin) with the quantity and cost basis.</li>
            <li>
              Enable <strong>Auto-Pricing</strong> to fetch live market prices from our data
              providers.
            </li>
            <li>
              Record events like Buys, Sells, and Dividends to keep your portfolio history accurate.
            </li>
          </ul>
        </section>

        <hr className="border-border-subtle" />

        {/* Businesses */}
        <section id="businesses" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="text-accent-primary" size={24} />
            <h2 className="text-xl font-display font-semibold text-fg-primary">Businesses</h2>
          </div>
          <p className="text-fg-secondary leading-relaxed mb-4">
            Track your business finances side-by-side with your personal wealth. You can run Profit
            & Loss (P&L) reports and monitor your Cash Runway to ensure your business stays healthy.
          </p>
          <p className="text-fg-secondary leading-relaxed">
            If your business operates on an external system, you can convert it to an{' '}
            <strong>External Business</strong> and use our API to push daily summaries directly into
            TrellisFlow.
          </p>
        </section>

        <hr className="border-border-subtle" />

        {/* Planning & Budgets */}
        <section id="budgets" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="text-accent-primary" size={24} />
            <h2 className="text-xl font-display font-semibold text-fg-primary">
              Planning Your Finances
            </h2>
          </div>
          <div className="space-y-6">
            <div id="goals" className="scroll-mt-24">
              <h3 className="text-sm font-bold text-fg-primary mb-1">Budgets & Savings Goals</h3>
              <p className="text-sm text-fg-secondary">
                Set monthly spending limits for specific categories. Create savings goals (e.g., an
                Emergency Fund) and link them to an account. TrellisFlow will project your
                completion date based on your recent savings pace.
              </p>
            </div>
            <div id="debt" className="scroll-mt-24">
              <h3 className="text-sm font-bold text-fg-primary mb-1">Debt Payoff</h3>
              <p className="text-sm text-fg-secondary">
                Simulate Snowball and Avalanche strategies to see exactly when you will be debt-free
                and how much interest you can save.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-border-subtle" />

        {/* Reports & Insights (MISSING PREVIOUSLY) */}
        <section id="reports" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <PieChart className="text-accent-primary" size={24} />
            <h2 className="text-xl font-display font-semibold text-fg-primary">
              Reports & Insights
            </h2>
          </div>
          <p className="text-fg-secondary leading-relaxed mb-4">
            The <strong>Reports</strong> section gives you deep, historical views of your financial
            life. You can generate Net Worth statements, view Cash Flow trends, and analyze your
            Asset Allocation.
          </p>
          <p className="text-fg-secondary leading-relaxed mb-4">
            Meanwhile, the <strong>Insights</strong> engine runs silently in the background,
            scanning your data to alert you to unusual spending, budget overruns, or opportunities
            to optimize your wealth.
          </p>
        </section>

        <hr className="border-border-subtle" />

        {/* Security & Privacy (MISSING PREVIOUSLY) */}
        <section id="security" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="text-accent-primary" size={24} />
            <h2 className="text-xl font-display font-semibold text-fg-primary">
              Security & Privacy
            </h2>
          </div>
          <p className="text-fg-secondary leading-relaxed mb-4">
            Your financial data is highly sensitive. TrellisFlow is built with security at its core.
          </p>
          <ul className="list-disc list-inside text-fg-secondary space-y-2 ml-2">
            <li>
              <strong>Security Settings:</strong> You can change your password and review all active
              sessions (devices) logged into your account from the Settings page. If you see a
              device you don't recognize, you can revoke it instantly.
            </li>
            <li>
              <strong>Data Export:</strong> You own your data. At any time, you can go to Settings
              &gt; Data & Audit to download a complete JSON backup, a CSV of your transactions, or a
              PDF Net Worth statement.
            </li>
            <li>
              <strong>Audit Logs:</strong> Every single change (create, update, delete) is logged.
              You can view this history to see exactly when a transaction or account was modified.
            </li>
          </ul>
          </>
        )}
        </section>
      </main>
    </div>
  );
}
