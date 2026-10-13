import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LottoBet - Odds Filter & Betslip Generator',
  description: 'Multi-bookie odds filter and betslip generator with AI analysis for SportyBet, betPawa, 1xBet, Mozzart Bet, and SportPesa Kenya.',
  openGraph: {
    title: 'LottoBet - Odds Filter & Betslip Generator',
    description: 'Multi-bookie odds filter and betslip generator with AI analysis for SportyBet, betPawa, 1xBet, Mozzart Bet, and SportPesa Kenya.',
    siteName: 'LottoBet',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

