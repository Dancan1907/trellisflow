export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg-primary py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-fg-primary mb-8">
          About TrellisFlow
        </h1>
        <div className="prose prose-invert prose-lg text-fg-secondary">
          <p className="mb-6">
            Most finance apps focus on a single aspect of your life: budgeting, investing, or
            business management. But in reality, these areas are deeply interconnected.
          </p>
          <p className="mb-6">
            TrellisFlow was built to solve this problem. We wanted a single place to see everything
            — a tool that could handle the complexity of managing personal wealth, stock portfolios,
            and business cash flow without requiring a spreadsheet.
          </p>
          <p className="mb-6">
            Our goal is simple: help you understand where your money is, how it&apos;s performing,
            and how your different financial activities contribute to your overall net worth.
          </p>
          <div className="mt-12 p-8 bg-bg-secondary rounded-2xl border border-border-subtle">
            <h2 className="text-xl font-bold text-fg-primary mb-2">Built with intention.</h2>
            <p className="text-fg-secondary">
              TrellisFlow is designed to be fast, secure, and beautifully simple. We believe that
              managing money shouldn&apos;t feel like a chore.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
