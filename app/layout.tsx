import './globals.css';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from './components/auth-context';
import { AuthModal } from './components/auth-modal';
import { Footer } from './components/footer';
import { TopBar } from './components/top-bar';

const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body' });

export const metadata = { title: 'Lotto Bet', description: 'Football betting slip builder with live odds and booking codes.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <TopBar />
          <div className="flex-1">{children}</div>
          <Footer />
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
