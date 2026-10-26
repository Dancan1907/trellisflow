'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  TrendingUp,
  Building2,
  Wallet,
  Target,
  CreditCard,
  BarChart3,
  Lightbulb,
  Settings,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { Logo } from '../shared/logo';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Money',
    items: [
      { label: 'Personal', href: '/personal', icon: User },
      { label: 'Investments', href: '/investments', icon: TrendingUp },
      { label: 'Businesses', href: '/businesses', icon: Building2 },
    ],
  },
  {
    title: 'Plan',
    items: [
      { label: 'Budgets', href: '/budgets', icon: Wallet },
      { label: 'Goals', href: '/goals', icon: Target },
      { label: 'Debt', href: '/debt', icon: CreditCard },
    ],
  },
  {
    title: 'Analyze',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3 },
      { label: 'Insights', href: '/insights', icon: Lightbulb },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 h-screen flex flex-col border-r border-border-subtle bg-bg-secondary">
      <div className="h-16 flex items-center px-6 border-b border-border-subtle">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <h3 className="px-3 mb-2 text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent-subtle text-fg-primary'
                          : 'text-fg-secondary hover:bg-bg-tertiary hover:text-fg-primary',
                      )}
                    >
                      <Icon size={18} className={isActive ? 'text-accent-primary' : ''} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border-subtle">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-accent-subtle text-fg-primary'
              : 'text-fg-secondary hover:bg-bg-tertiary hover:text-fg-primary',
          )}
        >
          <Settings size={18} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
