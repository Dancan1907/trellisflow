'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  User as UserIcon,
  ChevronDown,
  LogOut,
  Menu,
  Wallet,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/api-client';
import { AmountDisplay } from '@/components/shared/amount-display';

interface TopbarProps {
  onMenuClick: () => void;
}

interface Container {
  id: string;
  name: string;
  type: 'PERSONAL' | 'INVESTMENT' | 'INTERNAL_BUSINESS' | 'EXTERNAL_BUSINESS';
  currency: string;
}

interface TransactionResult {
  id: string;
  description: string;
  amount: string;
  currency: string;
  accountId: string;
  date: string;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border-subtle bg-bg-secondary relative z-40">
      <div className="flex items-center gap-2 md:gap-4">
        {/* Hamburger Menu Button - Mobile Only */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-md md:hidden hover:bg-bg-tertiary text-fg-primary transition-colors"
        >
          <Menu size={24} />
        </button>

        {/* Container Switcher Dropdown */}
        <ContainerSwitcher />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Global Search */}
        <GlobalSearch />

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

// ============================================================================
// Sub-components
// ============================================================================

function ContainerSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: containers, isLoading } = useQuery({
    queryKey: ['containers'],
    queryFn: () => apiFetch<Container[]>('/api/containers'),
  });

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (container: Container) => {
    setIsOpen(false);
    if (container.type === 'PERSONAL') router.push('/personal');
    else if (container.type === 'INVESTMENT') router.push('/investments');
    else router.push('/businesses'); // For businesses, maybe pass ?id= or go to list
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-subtle hover:bg-bg-tertiary text-sm font-medium text-fg-primary transition-colors"
      >
        Containers
        <ChevronDown
          size={14}
          className={`text-fg-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-bg-secondary border border-border-subtle rounded-lg shadow-lg overflow-hidden py-1">
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-fg-secondary">Loading...</div>
          ) : (
            containers?.map((c) => {
              const Icon =
                c.type === 'PERSONAL' ? Wallet : c.type === 'INVESTMENT' ? TrendingUp : Building2;
              return (
                <button
                  key={c.id}
                  onClick={() => handleNavigate(c)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-bg-tertiary text-sm text-fg-primary transition-colors text-left"
                >
                  <Icon size={16} className="text-fg-secondary shrink-0" />
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () =>
      apiFetch<{ items: TransactionResult[] }>(
        `/api/transactions?search=${encodeURIComponent(debouncedQuery)}&limit=5`,
      ),
    enabled: debouncedQuery.length > 1,
  });

  return (
    <div className="relative hidden md:block" ref={dropdownRef}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
        <input
          type="text"
          placeholder="Search transactions..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.length > 1) setIsOpen(true);
          }}
          className="w-64 h-9 pl-9 pr-3 rounded-md border border-border-subtle bg-bg-primary text-sm text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors"
        />
      </div>

      {/* Search Results Dropdown */}
      {isOpen && debouncedQuery.length > 1 && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-bg-secondary border border-border-subtle rounded-lg shadow-lg overflow-hidden py-2 z-50">
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-fg-secondary text-center">Searching...</div>
          ) : !results?.items || results.items.length === 0 ? (
            <div className="px-4 py-2 text-sm text-fg-secondary text-center">No results found.</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <p className="px-3 pb-1 text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
                Transactions
              </p>
              {results.items.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => {
                    setIsOpen(false);
                    setQuery('');
                    router.push(`/personal/accounts/${tx.accountId}`);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-bg-tertiary transition-colors text-left"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm text-fg-primary truncate">{tx.description}</p>
                    <p className="text-xs text-fg-tertiary">
                      {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <AmountDisplay
                      value={Number(tx.amount)}
                      currency={tx.currency}
                      className="text-sm font-medium"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
