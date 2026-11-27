'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/shared/logo';

const links = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-primary/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Logo href="/" />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-fg-secondary transition-colors hover:text-fg-primary">{link.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <Link href="/login" className="text-sm font-medium text-fg-secondary hover:text-fg-primary">Log in</Link>
          <Link href="/signup" className="rounded-full bg-accent-primary px-5 py-2.5 text-sm font-bold text-bg-primary transition-colors hover:bg-accent-hover">Get started</Link>
        </div>
        <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="rounded-lg p-2 text-fg-primary hover:bg-bg-secondary md:hidden">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-border-subtle bg-bg-secondary px-5 py-4 md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="py-1 text-sm font-medium text-fg-primary">{link.label}</Link>)}
            <div className="my-1 h-px bg-border-subtle" />
            <Link href="/login" onClick={() => setOpen(false)} className="py-1 text-sm text-fg-secondary">Log in</Link>
            <Link href="/signup" onClick={() => setOpen(false)} className="py-1 text-sm font-bold text-accent-primary">Get started</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
