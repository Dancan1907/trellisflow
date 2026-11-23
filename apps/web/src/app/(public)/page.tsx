'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Play, CheckCircle2, Menu, X } from 'lucide-react';

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-bg-primary flex flex-col relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-accent-primary/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent-primary/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-primary/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center glow-effect">
              <span className="text-bg-primary font-display font-bold text-lg">T</span>
            </div>
            <span className="text-xl font-display font-semibold tracking-tight text-fg-primary">
              TrellisFlow
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-fg-secondary">
            <Link href="/features" className="hover:text-fg-primary transition-colors">
              Features
            </Link>
            <Link href="/how-it-works" className="hover:text-fg-primary transition-colors">
              How It Works
            </Link>
            <Link href="/pricing" className="hover:text-fg-primary transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="hover:text-fg-primary transition-colors">
              About
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-fg-secondary hover:text-fg-primary transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-full bg-accent-primary text-bg-primary text-sm font-bold hover:bg-accent-hover transition-colors"
            >
              Sign up
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-fg-primary"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-bg-secondary border-b border-border-subtle py-4 px-6 flex flex-col gap-4 shadow-xl">
            <Link
              href="/features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-medium text-fg-primary"
            >
              Features
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-medium text-fg-primary"
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-medium text-fg-primary"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-medium text-fg-primary"
            >
              About
            </Link>
            <div className="h-px w-full bg-border-subtle my-2" />
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-medium text-fg-secondary"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-bold text-accent-primary"
            >
              Sign up
            </Link>
          </div>
        )}
      </header>

      {/* ... Keep the rest of your Hero Section, Benefits Banner exactly the same ... */}
      <section className="relative z-10 pt-24 pb-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-fg-primary mb-6 leading-[1.05]">
              See all your money <br />
              <span className="text-accent-primary">in one place.</span>
            </h1>
            <p className="text-lg text-fg-secondary max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              TrellisFlow brings your personal finances, investments, and businesses together in a
              single, beautifully unified dashboard. Track what you have, watch what it becomes.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link
                href="/signup"
                className="group px-8 py-4 rounded-full bg-accent-primary text-bg-primary text-base font-bold hover:bg-accent-hover transition-all inline-flex items-center gap-2 glow-effect"
              >
                Get started — it&apos;s free
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 rounded-full border border-border-strong text-fg-primary text-base font-semibold hover:bg-bg-secondary transition-colors inline-flex items-center gap-2"
              >
                <Play size={18} fill="currentColor" /> View Demo
              </Link>
            </div>
          </div>

          <div className="flex-1 relative perspective-1000">
            <div className="relative transform lg:rotate-y-[-10deg] lg:rotate-x-[5deg] transition-transform duration-500 hover:rotate-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[80%] bg-accent-primary/20 blur-[80px] rounded-full pointer-events-none" />
              <div className="relative bg-bg-secondary border border-border-strong rounded-2xl p-2 shadow-2xl backdrop-blur-xl">
                <div className="bg-bg-primary rounded-xl overflow-hidden border border-border-subtle p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent-primary" />
                      <div className="h-2 w-20 bg-border-strong rounded" />
                    </div>
                    <div className="h-6 w-6 rounded-full bg-border-strong" />
                  </div>
                  <div className="h-40 bg-gradient-to-t from-accent-primary/20 to-transparent rounded-lg border border-border-subtle relative overflow-hidden mb-6 flex items-end">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <path
                        d="M0,100 L0,80 Q20,70 30,50 T60,40 T100,10 L100,100 Z"
                        fill="url(#grad)"
                        opacity="0.2"
                      />
                      <path
                        d="M0,80 Q20,70 30,50 T60,40 T100,10"
                        fill="none"
                        stroke="var(--accent-primary)"
                        strokeWidth="2"
                      />
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-primary)" />
                          <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute top-4 left-4 bg-bg-secondary/80 backdrop-blur px-3 py-1 rounded-md border border-border-subtle">
                      <p className="text-xs text-fg-secondary">Total Balance</p>
                      <p className="text-lg font-bold text-fg-primary">KES 245,750</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-bg-tertiary p-3 rounded-lg border border-border-subtle">
                      <p className="text-xs text-fg-secondary mb-1">Income</p>
                      <p className="text-sm font-bold text-accent-primary">+ KES 15,000</p>
                    </div>
                    <div className="bg-bg-tertiary p-3 rounded-lg border border-border-subtle">
                      <p className="text-xs text-fg-secondary mb-1">Expenses</p>
                      <p className="text-sm font-bold text-negative">- KES 5,200</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-border-subtle bg-bg-secondary/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              'Modern, clean design with consistent green theme',
              'Clearer data visualization (charts & graphs)',
              'Personalized greeting & date filters',
              'Mobile-friendly layout',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="text-accent-primary shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-fg-primary font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
