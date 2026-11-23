import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/query-client';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: 'TrellisFlow',
  description: 'See all your money in one place — even when it lives in many.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-bg-primary text-fg-primary antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
