import { MarketingFooter } from '@/components/layout/marketing-footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <div className="flex-1 flex flex-col">{children}</div>
      <MarketingFooter />
    </div>
  );
}
