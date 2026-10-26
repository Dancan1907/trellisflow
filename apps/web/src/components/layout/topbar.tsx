'use client';

import { Search, Bell, User as UserIcon, ChevronDown, LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useRouter } from 'next/navigation';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border-subtle bg-bg-secondary">
      <div className="flex items-center gap-2 md:gap-4">
        {/* Hamburger Menu Button - Mobile Only */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-md md:hidden hover:bg-bg-tertiary text-fg-primary transition-colors"
        >
          <Menu size={24} />
        </button>

        {/* Container Switcher */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-subtle hover:bg-bg-tertiary text-sm font-medium text-fg-primary transition-colors">
          Personal
          <ChevronDown size={14} className="text-fg-secondary" />
        </button>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Search Input */}
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

        {/* User Profile & Logout */}
        <button
          onClick={handleLogout}
          title="Click to Log Out"
          className="flex items-center gap-2 p-1 rounded-md hover:bg-bg-tertiary transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center">
            <UserIcon size={16} className="text-accent-primary" />
          </div>
          <span className="text-sm font-medium text-fg-primary hidden md:block">
            {user?.name || 'Account'}
          </span>
          <LogOut size={14} className="text-fg-secondary hidden md:block" />
        </button>
      </div>
    </header>
  );
}
