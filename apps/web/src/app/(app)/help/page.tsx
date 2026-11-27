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
  Sparkles,
  MessageSquareText,
  FileText,
  PanelLeftClose,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth/auth-store';
import { Logo } from '@/components/shared/logo';

const SECTIONS = [
  {
    title: 'Getting Started',
    icon: BookOpen,
    items: [
      { id: 'introduction', label: 'Introduction to TrellisFlow' },
      { id: 'dashboard', label: 'Your Dashboard' },
      { id: 'containers', label: 'Understanding Containers' },
      { id: 'navigation', label: 'Sidebar & navigation' },
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
      { id: 'reports', label: 'Reports, forecasts & insights' },
    ],
  },
  {
    title: 'AI & Intelligence',
    icon: Sparkles,
    items: [
      { id: 'money-copilot', label: 'Money Copilot' },
      { id: 'help-assistant', label: 'RAG Help Assistant' },
      { id: 'ai-transactions', label: 'AI transaction drafting' },
    ],
  },
  {
    title: 'Account & Privacy',
    icon: ShieldCheck,
    items: [{ id: 'security', label: 'Security & Privacy' }],
  },
];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('introduction');
  const isAuthenticated = Boolean(useAuthStore((state) => state.token));

  return (
    <>
      {!isAuthenticated && (
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-subtle bg-bg-primary px-5 md:px-8">
          <Logo href="/" />
          <nav className="flex items-center gap-3" aria-label="Public navigation">
            <Link href="/login" className="text-sm font-medium text-fg-secondary hover:text-fg-primary">Log in</Link>
            <Link href="/signup" className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white">Get started</Link>
          </nav>
        </header>
      )}
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
                    {section.items.map((item) => (
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
            This guide covers the full product: recording transactions, managing personal and business finances, tracking investments, planning cash flow, and using AI-assisted tools safely. AI features may be unavailable when disabled by the account environment.
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
            The Dashboard is your command center. The moment you log in, you get a snapshot of your recorded net worth and a view of cash flow. Net worth uses the latest saved snapshot; cash flow can be filtered by a recent activity period. The snapshot may lag behind recent account changes until it is recomputed.
          </p>
          <ul className="list-disc list-inside text-fg-secondary space-y-2 ml-2">
            <li>
              <strong>Total Net Worth:</strong> Your reporting-currency assets minus liabilities, using the latest saved snapshot. Amounts in other currencies are presented separately rather than silently converted.
            </li>
            <li>
              <strong>Cash Flow:</strong> Shows posted and reconciled income and expenses for the selected period and reporting currency. Other currencies remain separate.
            </li>
            <li>
              <strong>Portfolio Overview:</strong> A visual breakdown of the reporting-currency net worth across Personal, Investments, and Businesses. Additional currencies are shown separately and are not silently converted.
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

        <section id="navigation" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <PanelLeftClose className="text-accent-primary" size={24} />
            <h2 className="text-xl font-display font-semibold text-fg-primary">Sidebar & navigation</h2>
          </div>
          <p className="text-fg-secondary leading-relaxed mb-4">
            TrellisFlow's sidebar can be expanded to show section names and menu labels, or collapsed to an icon-only rail to give the current page more room. On desktop and tablet, use the sidebar control in the top bar to switch between these layouts. Your preference is saved in this browser and restored on your next visit.
          </p>
          <p className="text-fg-secondary leading-relaxed mb-4">
            In the compact layout, hover over or focus a navigation icon to see its label. Select an icon to open that area. On phones, use the menu button in the top bar to open the navigation drawer; selecting a destination closes the drawer.
          </p>
          <p className="text-sm text-fg-tertiary">The compact setting changes the navigation width, not your permissions or the features available to your account.</p>
        </section>

        <hr className="border-border-subtle" />

        {/* Full product guide is public so visitors can read the documentation before signing in. */}
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
            The <strong>Investments</strong> container is your portfolio tracker. It allows you to manage supported holdings and review recorded investment activity and holding values. Unrealized changes in value are distinct from realized gains and income events.
          </p>
          <ul className="list-disc list-inside text-fg-secondary space-y-2 ml-2">
            <li>Add a holding (e.g., AAPL or Bitcoin) with the quantity and cost basis.</li>
            <li>
              Where a supported market-data source and instrument are available, enable <strong>Auto-Pricing</strong> to refresh market prices. Availability and freshness depend on the configured provider.
            </li>
            <li>
              Record events such as Buys, Sells, Dividends, Interest, Contributions, and Withdrawals to keep your portfolio history accurate. Interest and dividend events are recorded as income linked to the holding and its investment account. Keep realized gains separate from unrealized changes in holding value.
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
                Simulate Snowball and Avalanche strategies to estimate a debt-free date and compare projected interest costs using the assumptions you enter.
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
            The <strong>Reports</strong> section gives you historical views of your financial life. You can review Net Worth statements, Cash Flow statements, and Allocation reports. The Cash-flow Forecast projects eligible liquid-account balances using deterministic rules, posted/reconciled history, pending movements, recurring rules, and known future-dated transactions. It supports scenarios, warnings, indicative uncertainty ranges, and backtesting where enough history exists. It is an estimate, not a guarantee; currencies are forecast separately.
          </p>
          <p className="text-fg-secondary leading-relaxed mb-4">
            Meanwhile, the <strong>Insights</strong> engine runs silently in the background,
            scanning your data to alert you to unusual spending, budget overruns, or opportunities
            to optimize your wealth.
          </p>
        </section>

        <hr className="border-border-subtle" />

        {/* AI & Intelligence */}
        <section id="money-copilot" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="text-accent-primary" size={24} />
            <h2 className="text-xl font-display font-semibold text-fg-primary">Money Copilot</h2>
          </div>
          <p className="text-fg-secondary leading-relaxed mb-4">
            Money Copilot is an AI-powered financial explainer for your signed-in TrellisFlow data. Ask questions in natural language about recorded balances, cash flow, spending categories, investments, business performance, and supported what-if scenarios.
          </p>
          <ul className="list-disc list-inside text-fg-secondary space-y-2 ml-2 mb-4">
            <li>It uses financial context assembled by the backend for your account and explains the facts it receives.</li>
            <li>It keeps currencies separate and distinguishes saved snapshots, current balances, recorded transactions, unrealized gains, and estimates.</li>
            <li>What-if calculations are deterministic sensitivities, not forecasts, probabilities, or personalized financial advice.</li>
            <li>Chat analysis is read-only. A separate, limited income/expense workflow can create a preview; a financial record is written only after you review and explicitly confirm it.</li>
            <li>It cannot make transfers, change accounts, edit holdings, or perform arbitrary financial actions.</li>
          </ul>
          <p className="text-sm text-fg-tertiary">Money Copilot must be enabled by the application operator. If it is not visible in your navigation, it may not be enabled for this deployment.</p>
        </section>

        <hr className="border-border-subtle" />

        <section id="help-assistant" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquareText className="text-accent-primary" size={24} />
            <h2 className="text-xl font-display font-semibold text-fg-primary">RAG Help Assistant</h2>
          </div>
          <p className="text-fg-secondary leading-relaxed mb-4">
            The Help Assistant answers product-usage questions by retrieving relevant passages from approved TrellisFlow documentation. This retrieval-augmented generation (RAG) process grounds answers in the Help Centre rather than searching your private financial records.
          </p>
          <ul className="list-disc list-inside text-fg-secondary space-y-2 ml-2">
            <li>Ask how a feature works or where to find a workflow.</li>
            <li>Review the source references attached to an answer to see which approved guide sections support it.</li>
            <li>If the approved documentation does not support an answer, the assistant should say it cannot verify the answer instead of inventing product behavior.</li>
            <li>It is informational only; it cannot create transactions or change account settings.</li>
          </ul>
        </section>

        <hr className="border-border-subtle" />

        <section id="ai-transactions" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-accent-primary" size={24} />
            <h2 className="text-xl font-display font-semibold text-fg-primary">AI-assisted transaction drafting</h2>
          </div>
          <p className="text-fg-secondary leading-relaxed mb-4">
            Where enabled, natural-language transaction entry and M-Pesa message parsing can turn text you provide into a draft. The AI helps extract details; it does not make the draft a saved financial record.
          </p>
          <ol className="list-decimal list-inside text-fg-secondary space-y-2 ml-2">
            <li>Paste or enter the transaction text in the relevant workflow.</li>
            <li>Review the proposed amount, date, description, account, category, and transaction type.</li>
            <li>Correct anything that was parsed incorrectly.</li>
            <li>Confirm only when the details are accurate. Repeated confirmation requests are protected against duplicate writes when the same confirmation key and payload are retried.</li>
          </ol>
          <p className="mt-3 text-sm text-fg-tertiary">Never paste passwords, API keys, access tokens, or other secrets into an AI feature. Treat all extracted details as suggestions that require review.</p>
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
            Your financial data is sensitive. Use a strong, unique password, keep your sign-in credentials private, and review available account security controls regularly.
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
              <strong>Audit Logs:</strong> Available audit history helps you review recorded changes and investigate account activity. The events shown depend on the audit coverage implemented for each workflow.
            </li>
          </ul>
        </section>
      </main>
      </div>
    </>
  );
}
