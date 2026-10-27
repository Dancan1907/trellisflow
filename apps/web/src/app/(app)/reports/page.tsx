'use client';

import Link from 'next/link';
import { TrendingUp, ArrowRightLeft, PieChart, ChevronRight } from 'lucide-react';

const reports = [
  {
    title: 'Net Worth Statement',
    description: 'View your wealth trajectory over time and download a PDF.',
    href: '/reports/net-worth',
    icon: TrendingUp,
  },
  {
    title: 'Cash Flow Statement',
    description: 'See where your money came from and where it went.',
    href: '/reports/cash-flow',
    icon: ArrowRightLeft,
  },
  {
    title: 'Allocation Report',
    description: 'Breakdown of your wealth by container.',
    href: '/reports/allocation',
    icon: PieChart,
  },
];

export default function ReportsLandingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg-primary mb-1">Reports</h1>
        <p className="text-fg-secondary text-sm">Analyze your financial performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.href}
              href={report.href}
              className="group bg-bg-secondary border border-border-subtle rounded-lg p-6 hover:border-border-strong hover:bg-bg-tertiary transition-all flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <div className="p-2 w-fit rounded-md bg-bg-tertiary group-hover:bg-bg-secondary transition-colors mb-4">
                  <Icon size={20} className="text-accent-primary" />
                </div>
                <h3 className="font-medium text-fg-primary mb-1">{report.title}</h3>
                <p className="text-xs text-fg-secondary leading-relaxed">{report.description}</p>
              </div>
              <div className="flex items-center text-xs font-medium text-accent-primary mt-4 group-hover:translate-x-1 transition-transform">
                View Report <ChevronRight size={14} className="ml-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
