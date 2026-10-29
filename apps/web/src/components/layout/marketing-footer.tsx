'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function MarketingFooter() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for the auth cookie on the client side to avoid layout hydration mismatch
  useEffect(() => {
    const hasCookie = document.cookie.includes('trellisflow-authenticated=true');
    setIsAuthenticated(hasCookie);
  }, []);

  return (
    <footer className="border-t border-border-subtle bg-bg-primary mt-16 w-full">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          {/* Brand */}
          <div>
            <p className="text-lg font-semibold text-fg-primary mb-2">TrellisFlow</p>
            <p className="text-sm text-fg-secondary max-w-xs">
              See all your money in one place — even when it lives in many.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12">
            {/* ONLY show the Product links if the user is NOT logged in */}
            {!isAuthenticated && (
              <div>
                <h4 className="text-xs font-semibold text-fg-primary uppercase tracking-wider mb-3">
                  Product
                </h4>
                <ul className="space-y-2 text-sm text-fg-secondary">
                  <li>
                    <Link href="/signup" className="hover:text-fg-primary transition-colors">
                      Sign up
                    </Link>
                  </li>
                  <li>
                    <Link href="/login" className="hover:text-fg-primary transition-colors">
                      Log in
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {/* Legal links are always shown */}
            <div>
              <h4 className="text-xs font-semibold text-fg-primary uppercase tracking-wider mb-3">
                Legal
              </h4>
              <ul className="space-y-2 text-sm text-fg-secondary">
                <li>
                  <Link href="/privacy" className="hover:text-fg-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-fg-primary transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-fg-tertiary">
          <span>© {new Date().getFullYear()} TrellisFlow. All rights reserved.</span>
          <span>Built with care, for people with complex money.</span>
        </div>
      </div>
    </footer>
  );
}
