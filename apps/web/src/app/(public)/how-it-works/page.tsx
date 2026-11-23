export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-bg-primary py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-fg-primary mb-16">
          How TrellisFlow Works
        </h1>

        <div className="space-y-12 text-left">
          <div className="flex gap-6">
            <div className="w-12 h-12 rounded-full bg-accent-primary flex items-center justify-center text-bg-primary font-bold text-xl shrink-0">
              1
            </div>
            <div>
              <h3 className="text-xl font-bold text-fg-primary mb-2">Create your account</h3>
              <p className="text-fg-secondary">
                Sign up for free. You&apos;ll instantly get a Personal container to start tracking
                your everyday money.
              </p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="w-12 h-12 rounded-full bg-accent-primary flex items-center justify-center text-bg-primary font-bold text-xl shrink-0">
              2
            </div>
            <div>
              <h3 className="text-xl font-bold text-fg-primary mb-2">Add your containers</h3>
              <p className="text-fg-secondary">
                Add your Investment portfolio or create a Business. You can track as many containers
                as you need, all in one place.
              </p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="w-12 h-12 rounded-full bg-accent-primary flex items-center justify-center text-bg-primary font-bold text-xl shrink-0">
              3
            </div>
            <div>
              <h3 className="text-xl font-bold text-fg-primary mb-2">Watch your wealth grow</h3>
              <p className="text-fg-secondary">
                Log transactions, track your investments, and watch your unified Net Worth dashboard
                update automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
