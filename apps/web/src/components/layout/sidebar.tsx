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
  Sparkles,
  CircleHelp,
  Settings,
  LucideIcon,
  X,
  Layers3,
} from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { Logo } from '../shared/logo';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  tourId?: string;
  enabled?: boolean;
}

const navSections: { title: string; tourId?: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tourId: 'tour-dashboard' },
    ],
  },
  {
    title: 'Money',
    items: [
      { label: 'Personal', href: '/personal', icon: User, tourId: 'tour-personal' },
      { label: 'Investments', href: '/investments', icon: TrendingUp, tourId: 'tour-investments' },
      { label: 'Businesses', href: '/businesses', icon: Building2, tourId: 'tour-businesses' },
    ],
  },
  {
    title: 'Plan',
    tourId: 'tour-plan',
    items: [
      { label: 'Budgets', href: '/budgets', icon: Wallet },
      { label: 'Goals', href: '/goals', icon: Target },
      { label: 'Debt', href: '/debts', icon: CreditCard },
    ],
  },
  {
    title: 'Analyze',
    tourId: 'tour-analyze',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3, tourId: 'tour-reports' },
      { label: 'Insights', href: '/insights', icon: Lightbulb, tourId: 'tour-insights' },
      { label: 'Money Copilot', href: '/money-copilot', icon: Sparkles, tourId: 'tour-money-copilot', enabled: process.env.NEXT_PUBLIC_MONEY_COPILOT_ENABLED === 'true' },
      { label: 'Help Centre', href: '/help', icon: CircleHelp, tourId: 'tour-help-centre', enabled: process.env.NEXT_PUBLIC_HELP_ASSISTANT_ENABLED === 'true' },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
}

export function Sidebar({ isOpen, onClose, isCollapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />}

      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-50 w-60 h-screen shrink-0 flex flex-col border-r border-border-subtle bg-bg-secondary transition-[width,transform] duration-300 ease-in-out',
          isCollapsed ? 'md:w-[4.5rem]' : 'md:w-60',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border-subtle">
          <div className={cn(isCollapsed && 'md:hidden')}><Logo /></div>
          {isCollapsed && <div className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary text-white" aria-label="TrellisFlow"><Layers3 size={21} /></div>}
          {/* Close button (Mobile only) */}
          <button
            onClick={onClose}
            className="p-2 rounded-md md:hidden hover:bg-bg-tertiary text-fg-secondary"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={cn("flex-1 overflow-y-auto py-6 space-y-6", isCollapsed ? "px-2" : "px-3")}>
          {navSections.map((section) => (
            <div key={section.title} {...(section.tourId ? { id: section.tourId } : {})}>
              <h3 className={cn("px-3 mb-2 text-xs font-semibold text-fg-tertiary uppercase tracking-wider", isCollapsed && "md:hidden")}>
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.filter((item) => item.enabled !== false).map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={isCollapsed ? item.label : undefined}
                        aria-label={item.label}
                        id={item.tourId ?? (
                          item.href === '/dashboard'
                            ? 'tour-dashboard'
                            : item.href === '/personal'
                              ? 'tour-personal'
                              : item.href === '/investments'
                                ? 'tour-investments'
                                : item.href === '/businesses'
                                  ? 'tour-businesses'
                                  : undefined
                        )}
                        onClick={() => {
                          if (window.innerWidth < 768) onClose();
                        }}
                        className={cn(
                          'flex items-center rounded-md text-sm font-medium transition-colors',
                          isCollapsed ? 'gap-3 px-3 py-2 md:justify-center md:px-2 md:py-3 md:gap-0' : 'gap-3 px-3 py-2',
                          isActive
                            ? 'bg-accent-subtle text-fg-primary'
                            : 'text-fg-secondary hover:bg-bg-tertiary hover:text-fg-primary',
                        )}
                      >
                        <Icon size={19} className={isActive ? 'text-accent-primary' : ''} />
                        <span className={cn(isCollapsed && "md:hidden")}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={cn("border-t border-border-subtle", isCollapsed ? "p-2" : "p-3")}>
          <Link
            href="/settings"
            title={isCollapsed ? 'Settings' : undefined}
            aria-label='Settings'
            onClick={() => {
              if (window.innerWidth < 768) onClose();
            }}
            className={cn(
              'flex items-center rounded-md text-sm font-medium transition-colors',
              isCollapsed ? 'gap-3 px-3 py-2 md:justify-center md:px-2 md:py-3 md:gap-0' : 'gap-3 px-3 py-2',
              pathname.startsWith('/settings')
                ? 'bg-accent-subtle text-fg-primary'
                : 'text-fg-secondary hover:bg-bg-tertiary hover:text-fg-primary',
            )}
          >
            <Settings size={19} />
            <span className={cn(isCollapsed && "md:hidden")}>Settings</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
