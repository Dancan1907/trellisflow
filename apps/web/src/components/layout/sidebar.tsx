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
  X,
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
      // TODO: Uncomment in Wave 2
      // { label: 'Investments', href: '/investments', icon: TrendingUp },
      // TODO: Uncomment in Wave 3
      // { label: 'Businesses', href: '/businesses', icon: Building2 },
    ],
  },
  {
    title: 'Plan',
    items: [
      { label: 'Budgets', href: '/budgets', icon: Wallet },
      { label: 'Goals', href: '/goals', icon: Target },
      // TODO: Uncomment in Wave 5.4
      // { label: 'Debt', href: '/debt', icon: CreditCard },
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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />}

      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-50 w-60 h-screen flex flex-col border-r border-border-subtle bg-bg-secondary transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border-subtle">
          <Logo />
          {/* Close button (Mobile only) */}
          <button
            onClick={onClose}
            className="p-2 rounded-md md:hidden hover:bg-bg-tertiary text-fg-secondary"
          >
            <X size={20} />
          </button>
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
                        onClick={() => {
                          if (window.innerWidth < 768) onClose();
                        }}
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
            onClick={() => {
              if (window.innerWidth < 768) onClose();
            }}
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
    </>
  );
}
