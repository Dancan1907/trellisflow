import Link from 'next/link';
import { Check } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg-primary py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-fg-primary mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-fg-secondary">Start for free. Upgrade when you need more.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Tier */}
          <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-fg-primary mb-2">Free</h2>
            <p className="text-fg-secondary mb-6">Everything you need to get started.</p>
            <p className="text-4xl font-bold text-fg-primary mb-6">
              KES 0<span className="text-lg text-fg-secondary font-normal">/mo</span>
            </p>
            <ul className="space-y-3 mb-8">
              {[
                '1 Personal Container',
                'Up to 5 Accounts',
                '500 Transactions / mo',
                'Basic Insights',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-fg-primary">
                  <Check size={16} className="text-accent-primary" /> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block w-full py-3 rounded-md border border-border-strong text-center text-fg-primary font-medium hover:bg-bg-tertiary transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="bg-bg-secondary border border-accent-primary/50 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-accent-primary text-bg-primary text-xs font-bold px-3 py-1 rounded-bl-lg">
              COMING SOON
            </div>
            <h2 className="text-2xl font-bold text-fg-primary mb-2">Pro</h2>
            <p className="text-fg-secondary mb-6">For complex financial lives.</p>
            <p className="text-4xl font-bold text-fg-primary mb-6">
              KES 999<span className="text-lg text-fg-secondary font-normal">/mo</span>
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Unlimited Containers',
                'Unlimited Accounts',
                'Unlimited Transactions',
                'Advanced Insights & API',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-fg-primary">
                  <Check size={16} className="text-accent-primary" /> {f}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="block w-full py-3 rounded-md bg-bg-tertiary text-fg-secondary text-center font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
