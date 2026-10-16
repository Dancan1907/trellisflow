/**
 * Root layout for TrellisFlow.
 *
 * Every page in the app is wrapped by this layout. It defines the
 * <html> and <body> tags and provides global metadata.
 *
 * Feature-specific layouts ((public), (app), (onboarding)) nest inside this.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TrellisFlow',
  description:
    'Personal wealth platform — track personal money, investments, and businesses in one place.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
