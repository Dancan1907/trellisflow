import { Wallet, CreditCard, Building2, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { AmountDisplay } from '@/components/shared/amount-display';

interface AccountCardProps {
  account: {
    id: string;
    name: string;
    category: 'ASSET' | 'LIABILITY';
    accountType: string;
    currency: string;
    currentBalance: string;
    institution: string | null;
  };
}

export function AccountCard({ account }: AccountCardProps) {
  const getIcon = () => {
    if (account.accountType === 'MOBILE_MONEY') return Smartphone;
    if (account.accountType === 'CREDIT_CARD') return CreditCard;
    if (account.accountType === 'SAVINGS') return Building2;
    return Wallet;
  };

  const Icon = getIcon();
  const isLiability = account.category === 'LIABILITY';

  return (
    <Link
      href={`/personal/accounts/${account.id}`}
      className="group block bg-bg-secondary border border-border-subtle rounded-lg p-6 hover:border-border-strong hover:bg-bg-tertiary transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-bg-tertiary group-hover:bg-bg-secondary transition-colors">
            <Icon size={20} className="text-accent-primary" />
          </div>
          <div>
            <h3 className="font-medium text-fg-primary">{account.name}</h3>
            {account.institution && (
              <p className="text-xs text-fg-secondary">{account.institution}</p>
            )}
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${isLiability ? 'bg-status-negative/10 text-status-negative' : 'bg-status-positive/10 text-status-positive'}`}
        >
          {account.category}
        </span>
      </div>

      <div>
        <p className="text-xs text-fg-secondary mb-1">Current Balance</p>
        <p className="text-2xl font-semibold text-fg-primary">
          <AmountDisplay value={account.currentBalance} currency={account.currency} />
        </p>
      </div>
    </Link>
  );
}
