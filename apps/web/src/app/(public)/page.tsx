import Link from 'next/link';
import {
  ArrowRight,
  BrainCircuit,
  ShieldCheck,
  FileSearch,
  Wallet,
  TrendingUp,
  Building2,
  ChartNoAxesCombined,
  MessageSquareText,
  Workflow,
  CheckCircle2,
} from 'lucide-react';

const pillars = [
  {
    icon: Wallet,
    title: 'One financial picture',
    description: 'Bring personal accounts, investments, and business finances into one organized workspace while keeping their records distinct.',
  },
  {
    icon: BrainCircuit,
    title: 'AI that explains your numbers',
    description: 'Ask Money Copilot about recorded financial activity, understand patterns, and explore supported what-if scenarios in plain language.',
  },
  {
    icon: FileSearch,
    title: 'Answers grounded in product knowledge',
    description: 'The Help Assistant retrieves approved TrellisFlow documentation and cites the material used to answer product questions.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Planning built on calculations',
    description: 'Explore cash-flow forecasts, budgets, goals, debt strategies, and insights based on recorded data and explicit assumptions.',
  },
];

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-bg-primary">
      <div className="pointer-events-none absolute -left-48 top-20 h-[34rem] w-[34rem] rounded-full bg-accent-primary/10 blur-[150px]" />
      <div className="pointer-events-none absolute -right-48 top-[35rem] h-[32rem] w-[32rem] rounded-full bg-accent-primary/5 blur-[150px]" />

      <section className="relative z-10 px-6 pb-24 pt-20 md:pt-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-3 py-1.5 text-xs font-semibold text-accent-primary">
              <BrainCircuit size={15} /> FINANCIAL MANAGEMENT WITH BUILT-IN INTELLIGENCE
            </div>
            <h1 className="max-w-3xl text-5xl font-display font-bold leading-[1.05] tracking-tight text-fg-primary md:text-7xl">
              Your finances, connected.
              <span className="mt-2 block text-accent-primary">Your decisions, clearer.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-fg-secondary">
              TrellisFlow brings personal money, investments, and business finances together — then adds AI-assisted explanations, document-grounded product help, and data-driven planning to help you understand the bigger picture.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-primary px-7 py-4 text-base font-bold text-bg-primary transition-colors hover:bg-accent-hover">
                Start with TrellisFlow <ArrowRight size={18} />
              </Link>
              <Link href="/features" className="inline-flex items-center justify-center rounded-full border border-border-strong px-7 py-4 text-base font-semibold text-fg-primary transition-colors hover:bg-bg-secondary">
                Explore the intelligence
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-fg-tertiary">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-accent-primary" /> You stay in control</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-accent-primary" /> Review before confirming</span>
              <span className="inline-flex items-center gap-1.5"><Workflow size={14} className="text-accent-primary" /> Calculations stay deterministic</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-8 rounded-full bg-accent-primary/15 blur-[90px]" />
            <div className="relative rounded-3xl border border-border-strong bg-bg-secondary/95 p-4 shadow-2xl backdrop-blur">
              <div className="rounded-2xl border border-border-subtle bg-bg-primary p-5 md:p-7">
                <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                  <div><p className="text-xs text-fg-tertiary">TrellisFlow Intelligence</p><p className="mt-1 text-sm font-semibold text-fg-primary">Your financial overview</p></div>
                  <span className="rounded-full bg-accent-primary/10 px-3 py-1 text-[10px] font-bold text-accent-primary">CONNECTED VIEW</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[{label:'Personal',value:'Accounts'},{label:'Investments',value:'Holdings'},{label:'Businesses',value:'Cash flow'}].map((item) => (
                    <div key={item.label} className="rounded-xl border border-border-subtle bg-bg-secondary p-3">
                      <p className="text-[10px] text-fg-tertiary">{item.label}</p><p className="mt-2 text-xs font-semibold text-fg-primary">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-accent-primary"><MessageSquareText size={15}/> Money Copilot</div>
                  <p className="mt-3 text-sm leading-relaxed text-fg-primary">“Explain what changed in my cash flow and show the main drivers.”</p>
                  <div className="mt-3 rounded-lg bg-bg-secondary p-3 text-xs leading-relaxed text-fg-secondary">Copilot explains the financial context assembled from your recorded data. Figures remain separated by currency and are identified by period.</div>
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-secondary p-3">
                  <FileSearch size={18} className="shrink-0 text-accent-primary"/>
                  <div><p className="text-xs font-semibold text-fg-primary">Help Assistant · Retrieved guidance</p><p className="mt-1 text-[10px] text-fg-tertiary">Answers grounded in approved product documentation</p></div>
                  <CheckCircle2 size={16} className="ml-auto shrink-0 text-accent-primary"/>
                </div>
                <p className="mt-4 text-center text-[10px] text-fg-tertiary">Illustrative product preview · not live financial data</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-border-subtle bg-bg-secondary/50 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-accent-primary">A more intelligent money workspace</p>
            <h2 className="mt-3 text-3xl font-display font-bold text-fg-primary md:text-4xl">More than tracking. Understand what the numbers mean.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {pillars.map((item) => {
              const Icon = item.icon;
              return <article key={item.title} className="rounded-2xl border border-border-subtle bg-bg-primary p-6">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary/10"><Icon size={22} className="text-accent-primary"/></div>
                <h3 className="text-base font-bold text-fg-primary">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fg-secondary">{item.description}</p>
              </article>;
            })}
          </div>
          <div className="mt-8 text-center"><Link href="/features" className="inline-flex items-center gap-2 text-sm font-semibold text-accent-primary hover:underline">See all capabilities <ArrowRight size={16}/></Link></div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-accent-primary">How the intelligence works</p>
            <h2 className="mt-3 text-3xl font-display font-bold text-fg-primary md:text-4xl">AI assistance, grounded in your data — not guesswork.</h2>
            <p className="mt-5 text-base leading-relaxed text-fg-secondary">TrellisFlow separates financial calculations from language-model explanations. The application computes supported financial figures from your records; AI helps explain those figures or find approved product guidance.</p>
            <ul className="mt-7 space-y-4 text-sm text-fg-secondary">
              <li className="flex gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-accent-primary"/> <span><strong className="text-fg-primary">Money Copilot:</strong> natural-language explanations of your recorded finances and supported what-if sensitivities. Chat analysis is read-only.</span></li>
              <li className="flex gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-accent-primary"/> <span><strong className="text-fg-primary">RAG Help Assistant:</strong> retrieves approved help content and grounds product answers in cited sources.</span></li>
              <li className="flex gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-accent-primary"/> <span><strong className="text-fg-primary">Deterministic forecasts:</strong> projected balances are calculated by forecast rules, not generated by an LLM.</span></li>
              <li className="flex gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-accent-primary"/> <span><strong className="text-fg-primary">Human confirmation:</strong> supported AI-assisted transaction drafts must be reviewed; supported writes require explicit confirmation.</span></li>
            </ul>
            <Link href="/how-it-works" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent-primary hover:underline">See how it works <ArrowRight size={16}/></Link>
          </div>
          <div className="rounded-3xl border border-border-subtle bg-bg-secondary p-7 md:p-9">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10"><BrainCircuit className="text-accent-primary"/></div><div><p className="text-sm font-bold text-fg-primary">A clear separation of responsibilities</p><p className="text-xs text-fg-tertiary">Designed for understandable financial assistance</p></div></div>
            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-border-subtle bg-bg-primary p-4"><p className="text-xs font-bold text-fg-primary">1 · Your records</p><p className="mt-1 text-xs text-fg-secondary">Accounts, transactions, holdings, businesses, and settings.</p></div>
              <div className="mx-auto h-4 w-px bg-border-strong"/>
              <div className="rounded-xl border border-border-subtle bg-bg-primary p-4"><p className="text-xs font-bold text-fg-primary">2 · Application calculations & retrieval</p><p className="mt-1 text-xs text-fg-secondary">Currency-aware aggregates, deterministic forecasts, and approved-document retrieval.</p></div>
              <div className="mx-auto h-4 w-px bg-border-strong"/>
              <div className="rounded-xl border border-accent-primary/30 bg-accent-primary/5 p-4"><p className="text-xs font-bold text-accent-primary">3 · AI explanation & guided action</p><p className="mt-1 text-xs text-fg-secondary">Natural-language explanations, source-cited help, and review-first transaction drafts.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-border-subtle bg-bg-secondary/50 px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          <div className="flex gap-3"><Wallet className="mt-1 shrink-0 text-accent-primary"/><div><h3 className="font-bold text-fg-primary">Personal finance</h3><p className="mt-2 text-sm leading-relaxed text-fg-secondary">Accounts, transactions, recurring activity, budgets, savings goals, and debt planning.</p></div></div>
          <div className="flex gap-3"><TrendingUp className="mt-1 shrink-0 text-accent-primary"/><div><h3 className="font-bold text-fg-primary">Investments</h3><p className="mt-2 text-sm leading-relaxed text-fg-secondary">Holdings, recorded buys and sells, dividends, interest, contributions, withdrawals, and portfolio context.</p></div></div>
          <div className="flex gap-3"><Building2 className="mt-1 shrink-0 text-accent-primary"/><div><h3 className="font-bold text-fg-primary">Business finances</h3><p className="mt-2 text-sm leading-relaxed text-fg-secondary">Business accounts, revenue, expenses, profit and loss, net worth, and historical runway estimates.</p></div></div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-accent-primary/30 bg-gradient-to-br from-accent-primary/10 via-bg-secondary to-bg-secondary p-8 text-center md:p-14">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-accent-primary">Bring the whole picture together</p>
          <h2 className="mt-4 text-3xl font-display font-bold text-fg-primary md:text-5xl">Make your financial data work harder for you.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-fg-secondary">Start with the records you already understand. Organize them in TrellisFlow, explore the insights, and use AI assistance when it is enabled and useful.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-primary px-7 py-3.5 text-sm font-bold text-bg-primary hover:bg-accent-hover">Create your account <ArrowRight size={16}/></Link>
            <Link href="/pricing" className="inline-flex items-center justify-center rounded-full border border-border-strong px-7 py-3.5 text-sm font-semibold text-fg-primary hover:bg-bg-primary">View pricing</Link>
          </div>
          <p className="mt-5 text-[11px] text-fg-tertiary">AI capabilities depend on deployment configuration and availability. TrellisFlow provides decision support, not regulated financial advice.</p>
        </div>
      </section>
    </main>
  );
}
