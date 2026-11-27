'use client';

import { useEffect, useState, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MarketingFooter } from '@/components/layout/marketing-footer';
import { OnboardingManager } from '@/components/features/onboarding/onboarding-manager';
import { MoneyCopilotWidget } from '@/components/features/money-copilot/money-copilot-widget';
import { HelpAssistantWidget } from '@/components/features/help-assistant/help-assistant-widget';
import { useAuthStore } from '@/lib/auth/auth-store';
import { apiFetch } from '@/lib/api/api-client';

type SessionState = 'checking' | 'authenticated' | 'anonymous' | 'error';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const token = useAuthStore((state) => state.token);
  const pathname = usePathname();
  const router = useRouter();

  // Restore the user's desktop sidebar preference without changing server-rendered markup.
  useEffect(() => {
    try {
      setIsSidebarCollapsed(window.localStorage.getItem('trellisflow-sidebar-collapsed') === 'true');
    } catch {
      // The sidebar remains usable with an in-memory preference if storage is unavailable.
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem('trellisflow-sidebar-collapsed', String(next));
      } catch {
        // Keep the current-session toggle working when browser storage is unavailable.
      }
      return next;
    });
  };

  // Do not make an authentication decision until persisted Zustand state is restored.
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
      return;
    }
    return useAuthStore.persist.onFinishHydration(() => setHasHydrated(true));
  }, []);

  // A browser-readable cookie is only a routing hint. Verify the JWT with the API
  // before rendering any authenticated application chrome or protected content.
  useEffect(() => {
    if (!hasHydrated) return;

    if (!token) {
      setSessionState('anonymous');
      return;
    }

    let cancelled = false;
    setSessionState('checking');
    apiFetch<unknown>('/api/users/me')
      .then(() => {
        if (!cancelled) setSessionState('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setSessionState(useAuthStore.getState().token ? 'error' : 'anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, token]);

  useEffect(() => {
    if (hasHydrated && sessionState === 'anonymous') {
      router.replace('/login');
    }
  }, [hasHydrated, sessionState, router]);

  if (!hasHydrated || sessionState === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-sm text-fg-secondary" role="status">
        Verifying your session…
      </div>
    );
  }

  if (sessionState === 'anonymous') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-sm text-fg-secondary" role="status">
        Redirecting to sign in…
      </div>
    );
  }

  if (sessionState === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg-primary px-6 text-center">
        <p className="text-sm text-fg-secondary">We could not verify your session. Check your connection and try again.</p>
        <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} isCollapsed={isSidebarCollapsed} />
      <div className="flex-1 flex flex-col w-full">
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-4 md:p-8">
            <Suspense fallback={null}>
              <OnboardingManager />
            </Suspense>
            {children}
          </div>
          <MarketingFooter />
        </main>
      </div>
      <MoneyCopilotWidget />
      <HelpAssistantWidget />
    </div>
  );
}
