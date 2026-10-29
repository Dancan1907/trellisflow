'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Sliders, Shield, Database } from 'lucide-react';

const tabs = [
  { name: 'Profile', href: '/settings', icon: User },
  { name: 'Preferences', href: '/settings/preferences', icon: Sliders },
  { name: 'Security', href: '/settings/security', icon: Shield },
  { name: 'Data & Audit', href: '/settings/data', icon: Database },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg-primary mb-1">Settings</h1>
        <p className="text-fg-secondary text-sm">Manage your account and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <nav className="w-full md:w-64 flex-shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            // The Profile tab is exactly /settings. Others are sub-routes.
            const isActive =
              tab.href === '/settings' ? pathname === '/settings' : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-subtle text-fg-primary'
                    : 'text-fg-secondary hover:bg-bg-tertiary hover:text-fg-primary'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-accent-primary' : ''} />
                {tab.name}
              </Link>
            );
          })}
        </nav>

        {/* Content Area */}
        <div className="flex-1 bg-bg-secondary border border-border-subtle rounded-lg p-6 md:p-8 min-h-[400px]">
          {children}
        </div>
      </div>
    </div>
  );
}
