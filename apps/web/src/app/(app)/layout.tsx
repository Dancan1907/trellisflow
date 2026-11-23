'use client';

import { useState, Suspense } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MarketingFooter } from '@/components/layout/marketing-footer';
import { OnboardingManager } from '@/components/features/onboarding/onboarding-manager';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col w-full">
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-4 md:p-8">
            {/* Wrapping this in Suspense fixes the Next.js useSearchParams error */}
            <Suspense fallback={null}>
              <OnboardingManager />
            </Suspense>
            {children}
          </div>
          <MarketingFooter />
        </main>
      </div>
    </div>
  );
}
