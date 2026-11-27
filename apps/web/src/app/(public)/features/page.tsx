import Link from 'next/link';
import {
  Wallet, TrendingUp, Building2, PieChart, BrainCircuit, FileSearch,
  MessageSquareText, ReceiptText, ChartNoAxesCombined, ShieldCheck, ArrowRight,
} from 'lucide-react';

const groups = [
  {
    eyebrow: 'CONNECTED FINANCES',
    title: 'Your whole financial life, organized.',
    items: [
      { icon: Wallet, title: 'Personal finance', description: 'Track accounts, cash, mobile money, income, expenses, transfers, recurring activity, budgets, savings goals, and debt.' },
      { icon: TrendingUp, title: 'Investment tracking', description: 'Manage holdings and recorded buys, sells, dividends, interest, contributions, and withdrawals. Keep realized gains distinct from unrealized value changes.' },
      { icon: Building2, title: 'Business finance', description: 'Track business accounts, transactions, profit and loss, net worth, and historical cash-runway estimates alongside personal finances.' },
      { icon: PieChart, title: 'Consolidated net worth', description: 'See a reporting-currency headline with other currency balances preserved separately. TrellisFlow does not silently add unlike currencies or invent exchange rates.' },
    ],
  },
  {
    eyebrow: 'AI & FINANCIAL INTELLIGENCE',
    title: 'A smarter way to understand your records.',
    items: [
      { icon: BrainCircuit, title: 'Money Copilot', description: 'Ask natural-language questions about your recorded finances. The backend assembles the financial context; an LLM explains it and supports selected deterministic what-if sensitivities.' },
      { icon: FileSearch, title: 'RAG Help Assistant', description: 'Retrieval-augmented generation searches approved TrellisFlow documentation and grounds product answers in cited source passages.' },
      { icon: ReceiptText, title: 'AI-assisted transaction drafts', description: 'Natural-language transaction entry and M-Pesa message parsing can extract details into a draft. You review and correct the details before confirmation.' },
      { icon: ChartNoAxesCombined, title: 'Cash-flow forecasting', description: 'A deterministic forecasting engine uses account balances, transaction history, recurring rules, pending movements, and known future transactions to project eligible liquid balances.' },
    ],
  },
  {
    eyebrow: 'CONTROL & RELIABILITY',
    title: 'Useful intelligence without handing over control.',
    items: [
      { icon: ShieldCheck, title: 'Review-first financial actions', description: 'Money Copilot chat is read-only. Its limited income and expense action workflow uses a preview and explicit confirmation before creating a record.' },
      { icon: MessageSquareText, title: 'Grounded product answers', description: 'The Help Assistant withholds unsupported answers when retrieved documentation cannot provide a valid source citation.' },
      { icon: ChartNoAxesCombined, title: 'Clear financial assumptions', description: 'Forecasts, what-if scenarios, historical estimates, and recorded values are distinguished so an estimate is not mistaken for a guaranteed outcome.' },
      { icon: PieChart, title: 'Currency-aware reporting', description: 'Accounts, business metrics, investment activity, and cash-flow summaries preserve currency boundaries instead of silently converting values.' },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-accent-primary">TrellisFlow capabilities</p>
          <h1 className="mt-4 text-4xl font-display font-bold text-fg-primary md:text-6xl">Financial management, strengthened by intelligence.</h1>
          <p className="mt-6 text-lg leading-relaxed text-fg-secondary">Connect your financial records, understand them with AI-assisted tools, and plan with calculations that make their assumptions clear.</p>
        </div>

        <div className="space-y-20">
          {groups.map((group) => (
            <section key={group.eyebrow}>
              <div className="mb-8">
                <p className="text-xs font-bold tracking-[.18em] text-accent-primary">{group.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-display font-bold text-fg-primary md:text-3xl">{group.title}</h2>
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return <article key={item.title} className="rounded-2xl border border-border-subtle bg-bg-secondary p-6">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary/10"><Icon size={22} className="text-accent-primary"/></div>
                    <h3 className="text-base font-bold text-fg-primary">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-fg-secondary">{item.description}</p>
                  </article>;
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-20 rounded-3xl border border-accent-primary/30 bg-accent-primary/5 p-8 text-center md:p-12">
          <h2 className="text-3xl font-display font-bold text-fg-primary">Intelligence that supports your decisions.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-fg-secondary">AI features are controlled by deployment configuration and may not be enabled in every environment. Money Copilot is decision support, not a substitute for reviewing your financial records or seeking professional advice.</p>
          <Link href="/how-it-works" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-accent-primary hover:underline">See how TrellisFlow works <ArrowRight size={16}/></Link>
        </div>
      </div>
    </main>
  );
}
