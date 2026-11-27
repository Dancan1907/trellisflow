import Link from 'next/link';
import {
  UserPlus, Database, Calculator, BrainCircuit, FileSearch, ShieldCheck, ArrowRight,
} from 'lucide-react';

const steps = [
  { icon: UserPlus, number: '01', title: 'Bring your financial world together', description: 'Create your account, set your reporting preferences, and organize personal accounts, investment holdings, and business records in their own containers.' },
  { icon: Database, number: '02', title: 'Record and review activity', description: 'Add transactions manually, use supported recurring workflows, or prepare a draft from natural language or an M-Pesa message. Review extracted details and correct them before saving.' },
  { icon: Calculator, number: '03', title: 'Let the application calculate the facts', description: 'TrellisFlow computes balances, currency-aware summaries, investment breakdowns, business metrics, and cash-flow forecasts from recorded data and explicit rules.' },
  { icon: BrainCircuit, number: '04', title: 'Ask questions in plain language', description: 'When enabled, Money Copilot uses backend-assembled financial context to explain your records and supported what-if sensitivities. It does not invent financial facts or perform arbitrary writes.' },
  { icon: FileSearch, number: '05', title: 'Get help grounded in documentation', description: 'The RAG Help Assistant retrieves approved product documentation and cites supporting sections. When the sources do not support an answer, it should say so.' },
  { icon: ShieldCheck, number: '06', title: 'Stay in control', description: 'Review AI-assisted drafts. Supported Money Copilot income or expense actions require a separate preview and explicit confirmation. Forecasts and scenarios remain estimates, not promises.' },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-accent-primary">From records to understanding</p>
          <h1 className="mt-4 text-4xl font-display font-bold text-fg-primary md:text-6xl">How TrellisFlow works</h1>
          <p className="mt-6 text-lg leading-relaxed text-fg-secondary">A connected financial workspace, deterministic calculations, and AI assistance that explains rather than takes control.</p>
        </div>
        <div className="space-y-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return <article key={step.number} className="grid gap-5 rounded-2xl border border-border-subtle bg-bg-secondary p-6 md:grid-cols-[4.5rem_1fr] md:items-start md:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary/10"><Icon size={26} className="text-accent-primary"/></div>
              <div><p className="text-xs font-bold tracking-[.15em] text-accent-primary">STEP {step.number}</p><h2 className="mt-1 text-xl font-bold text-fg-primary">{step.title}</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-fg-secondary">{step.description}</p></div>
            </article>;
          })}
        </div>
        <div className="mt-12 rounded-2xl border border-border-subtle bg-bg-secondary p-7">
          <h2 className="text-lg font-bold text-fg-primary">A note about AI and forecasts</h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-secondary">Language models help explain financial context and answer product questions. The cash-flow forecasting engine calculates projected balances using deterministic rules. The RAG Help Assistant searches approved documentation. These are separate capabilities with different data boundaries. AI features depend on deployment configuration and availability.</p>
        </div>
        <div className="mt-10 text-center"><Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-accent-primary px-7 py-3.5 text-sm font-bold text-bg-primary hover:bg-accent-hover">Get started <ArrowRight size={16}/></Link></div>
      </div>
    </main>
  );
}
