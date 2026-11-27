import Link from 'next/link';
import { Check, Sparkles, ShieldCheck } from 'lucide-react';

const freeFeatures = [
  '1 Personal Container',
  'Up to 5 Accounts',
  '500 Transactions / month',
  'Basic Insights',
  'Access to core personal finance workflows',
];
const proFeatures = [
  'Unlimited Containers',
  'Unlimited Accounts',
  'Unlimited Transactions',
  'Advanced Insights & API',
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-accent-primary">Straightforward plans</p>
          <h1 className="mt-4 text-4xl font-display font-bold text-fg-primary md:text-5xl">Simple, transparent pricing.</h1>
          <p className="mt-5 text-lg text-fg-secondary">Start with the essentials. Choose more capacity when your financial workspace grows.</p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-8">
            <h2 className="text-2xl font-bold text-fg-primary">Free</h2>
            <p className="mt-2 text-sm text-fg-secondary">Get organized and build a clear financial picture.</p>
            <p className="my-7 text-4xl font-bold text-fg-primary">KES 0<span className="text-base font-normal text-fg-secondary"> / month</span></p>
            <ul className="mb-8 space-y-3">{freeFeatures.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm text-fg-primary"><Check size={16} className="mt-0.5 shrink-0 text-accent-primary"/>{feature}</li>)}</ul>
            <Link href="/signup" className="block rounded-lg border border-border-strong py-3 text-center text-sm font-semibold text-fg-primary transition-colors hover:bg-bg-tertiary">Get started free</Link>
          </section>

          <section className="relative overflow-hidden rounded-2xl border border-accent-primary/50 bg-bg-secondary p-8">
            <span className="absolute right-0 top-0 rounded-bl-lg bg-accent-primary px-3 py-1 text-[10px] font-bold text-bg-primary">COMING SOON</span>
            <h2 className="text-2xl font-bold text-fg-primary">Pro</h2>
            <p className="mt-2 text-sm text-fg-secondary">For larger and more complex financial workspaces.</p>
            <p className="my-7 text-4xl font-bold text-fg-primary">KES 999<span className="text-base font-normal text-fg-secondary"> / month</span></p>
            <ul className="mb-8 space-y-3">{proFeatures.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm text-fg-primary"><Check size={16} className="mt-0.5 shrink-0 text-accent-primary"/>{feature}</li>)}</ul>
            <button disabled className="block w-full cursor-not-allowed rounded-lg bg-bg-tertiary py-3 text-sm font-semibold text-fg-secondary">Coming soon</button>
          </section>
        </div>

        <section className="mx-auto mt-10 max-w-3xl rounded-2xl border border-border-subtle bg-bg-secondary p-7">
          <div className="flex items-center gap-3"><Sparkles className="text-accent-primary"/><h2 className="text-lg font-bold text-fg-primary">How AI features are made available</h2></div>
          <p className="mt-3 text-sm leading-relaxed text-fg-secondary">Money Copilot, the RAG Help Assistant, and AI-assisted transaction drafting are controlled by deployment configuration and provider availability. They may be enabled or disabled independently, and usage limits can apply. This page does not promise that every AI capability is enabled for every account or included in a particular paid tier.</p>
          <div className="mt-4 flex items-start gap-2 text-xs text-fg-tertiary"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-accent-primary"/> Provider credentials remain server-side. Financial actions that are supported by AI workflows require review and explicit confirmation.</div>
        </section>
      </div>
    </main>
  );
}
