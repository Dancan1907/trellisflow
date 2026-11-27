'use client';

import { Modal } from '@/components/ui/modal';
import { Rocket, BookOpen, X } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void; // Skip
  onStartTour: () => void;
  onOpenGuide: () => void;
}

export function WelcomeModal({ isOpen, onClose, onStartTour, onOpenGuide }: WelcomeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      className="max-w-2xl bg-bg-secondary border-border-subtle"
    >
      <div className="text-center pb-4">
        <div className="w-16 h-16 rounded-2xl bg-accent-primary/20 flex items-center justify-center mx-auto mb-6">
          <Rocket className="text-accent-primary" size={32} />
        </div>
        <h2 className="text-2xl font-display font-bold text-fg-primary mb-2">
          Welcome to TrellisFlow!
        </h2>
        <p className="text-fg-secondary max-w-md mx-auto">
          Your financial world, organized in one place — with AI-assisted explanations, document-grounded help, and tools that turn your recorded data into clearer decisions. Let&apos;s get you started.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {/* Quick Tour */}
        <button
          onClick={onStartTour}
          className="flex flex-col items-start p-5 rounded-xl border border-border-subtle bg-bg-tertiary hover:border-accent-primary transition-colors text-left group"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-accent-primary">Quick Tour</span>
            <span className="text-[10px] bg-accent-primary/20 text-accent-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
              Recommended
            </span>
          </div>
          <p className="text-xs text-fg-secondary mb-4 flex-1">
            Explore your dashboard, planning tools, insights, Money Copilot, and Help Assistant in about 3 minutes.
          </p>
          <span className="text-sm font-medium text-fg-primary group-hover:text-accent-primary transition-colors flex items-center gap-1">
            Start quick tour &rarr;
          </span>
        </button>

        {/* Full Guide */}
        <button
          onClick={onOpenGuide}
          className="flex flex-col items-start p-5 rounded-xl border border-border-subtle bg-bg-tertiary hover:border-border-strong transition-colors text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={16} className="text-fg-secondary" />
            <span className="text-sm font-bold text-fg-primary">Full User Guide</span>
          </div>
          <p className="text-xs text-fg-secondary mb-4 flex-1">
            Learn how to manage transactions, investments, businesses, forecasts, and AI tools.
          </p>
          <span className="text-sm font-medium text-fg-secondary flex items-center gap-1">
            Open guide &rarr;
          </span>
        </button>
      </div>

      <div className="mt-8 text-center border-t border-border-subtle pt-4">
        <button
          onClick={onClose}
          className="text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
        >
          Skip for now, I&apos;ll explore on my own
        </button>
      </div>
    </Modal>
  );
}
