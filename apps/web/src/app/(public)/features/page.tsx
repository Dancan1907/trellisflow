import { Wallet, TrendingUp, Building2, PieChart } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-bg-primary py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-fg-primary mb-6 text-center">
          Everything you need to master your money.
        </h1>
        <p className="text-lg text-fg-secondary text-center mb-16 max-w-2xl mx-auto">
          One platform to track your personal wealth, investments, and business finances.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              icon: Wallet,
              title: 'Personal Finance',
              desc: 'Track accounts, transactions, budgets, and savings goals. Everything for your day-to-day money.',
            },
            {
              icon: TrendingUp,
              title: 'Investments',
              desc: 'Monitor stocks, crypto, real estate, and other holdings with realized and unrealized gains.',
            },
            {
              icon: Building2,
              title: 'Businesses',
              desc: 'Manage your businesses alongside your personal wealth with P&L, runway, and cross-business views.',
            },
            {
              icon: PieChart,
              title: 'Unified Net Worth',
              desc: 'See all your money in one place. A single number that updates automatically as you track.',
            },
          ].map((f, i) => (
            <div key={i} className="bg-bg-secondary border border-border-subtle rounded-2xl p-8">
              <f.icon className="text-accent-primary mb-4" size={32} />
              <h3 className="text-xl font-bold text-fg-primary mb-3">{f.title}</h3>
              <p className="text-fg-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
