import Link from 'next/link';
import { BrainCircuit, ShieldCheck, Layers3, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-accent-primary">About TrellisFlow</p>
          <h1 className="mt-4 text-4xl font-display font-bold leading-tight text-fg-primary md:text-6xl">Financial clarity for a connected life.</h1>
          <p className="mt-7 text-lg leading-relaxed text-fg-secondary">Your money rarely lives in one place. It moves through personal accounts, investments, and businesses. TrellisFlow brings those parts into one organized workspace and helps you understand how they relate.</p>
        </div>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-border-subtle bg-bg-secondary p-7"><Layers3 className="text-accent-primary" size={27}/><h2 className="mt-5 text-lg font-bold text-fg-primary">Connected, not collapsed</h2><p className="mt-3 text-sm leading-relaxed text-fg-secondary">We bring financial domains together while preserving the records, currencies, and context that make each one different.</p></article>
          <article className="rounded-2xl border border-border-subtle bg-bg-secondary p-7"><BrainCircuit className="text-accent-primary" size={27}/><h2 className="mt-5 text-lg font-bold text-fg-primary">Intelligence with boundaries</h2><p className="mt-3 text-sm leading-relaxed text-fg-secondary">LLM-powered explanations and retrieval-augmented help make information easier to understand. Calculations remain grounded in application data and explicit rules.</p></article>
          <article className="rounded-2xl border border-border-subtle bg-bg-secondary p-7"><ShieldCheck className="text-accent-primary" size={27}/><h2 className="mt-5 text-lg font-bold text-fg-primary">You remain in control</h2><p className="mt-3 text-sm leading-relaxed text-fg-secondary">AI assistance is not unrestricted authority. Supported actions use review and confirmation, and unsupported answers should not be presented as facts.</p></article>
        </section>

        <section className="mt-16 rounded-3xl border border-border-subtle bg-bg-secondary p-8 md:p-10">
          <h2 className="text-2xl font-display font-bold text-fg-primary">Why we are building it</h2>
          <div className="mt-5 max-w-4xl space-y-4 text-sm leading-relaxed text-fg-secondary">
            <p>Traditional tools often split budgeting, investing, and business management into separate products. That makes it difficult to see the full picture, compare periods, and understand how decisions in one area affect the rest of your financial life.</p>
            <p>TrellisFlow is designed to combine a practical financial workspace with a careful intelligence layer: Money Copilot can explain recorded financial context; the Help Assistant retrieves approved product documentation; and deterministic forecasting tools project eligible cash balances from recorded history and assumptions.</p>
            <p>We believe useful financial technology should be understandable. It should distinguish recorded facts from estimates, keep currencies separate when no conversion is available, show where product guidance comes from, and leave important decisions with the person using it.</p>
          </div>
        </section>

        <div className="mt-12 text-center"><Link href="/features" className="inline-flex items-center gap-2 text-sm font-bold text-accent-primary hover:underline">Explore TrellisFlow features <ArrowRight size={16}/></Link></div>
      </div>
    </main>
  );
}
