'use client';

import { Search, Bell, User as UserIcon, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

export function Topbar() {
  const { user } = useAuthStore();

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border-subtle bg-bg-secondary">
      <div className="flex items-center gap-4">
        {/* Container Switcher Placeholder */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-subtle hover:bg-bg-tertiary text-sm font-medium text-fg-primary transition-colors">
          Personal
          <ChevronDown size={14} className="text-fg-secondary" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            className="w-64 h-9 pl-9 pr-3 rounded-md border border-border-subtle bg-bg-primary text-sm text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-md hover:bg-bg-tertiary text-fg-secondary hover:text-fg-primary transition-colors">
          <Bell size={20} />
        </button>

        {/* User Profile */}
        <button className="flex items-center gap-2 p-1 rounded-md hover:bg-bg-tertiary transition-colors">
          <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center">
            <UserIcon size={16} className="text-accent-primary" />
          </div>
          <span className="text-sm font-medium text-fg-primary hidden md:block">
            {user?.name || 'Account'}
          </span>
          <ChevronDown size={14} className="text-fg-secondary hidden md:block" />
        </button>
      </div>
    </header>
  );
}
