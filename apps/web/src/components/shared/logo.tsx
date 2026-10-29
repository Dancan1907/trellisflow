import { Layers } from 'lucide-react';
import Link from 'next/link';

export function Logo({ size = 'default' }: { size?: 'default' | 'large' }) {
  const textSize = size === 'large' ? 'text-2xl' : 'text-lg';
  const iconSize = size === 'large' ? 32 : 24;

  return (
    <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent-primary">
        <Layers size={iconSize} className="text-white" />
      </div>
      <span className={`font-sans font-semibold tracking-tight text-fg-primary ${textSize}`}>
        TrellisFlow
      </span>
    </Link>
  );
}
