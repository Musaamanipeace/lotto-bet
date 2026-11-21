import './globals.css';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import { SESSION_COOKIE, userForToken } from '@/lib/auth.ts';
import { getAuthStore } from '@/lib/auth-store.ts';
import { AuthProvider } from './components/auth-context';
import { AuthModal } from './components/auth-modal';
import { FilterProvider } from './components/filter-context';
import { Footer } from './components/footer';
import { PwaRegister } from './components/pwa-register';
import { TopBar } from './components/top-bar';

const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Lotto Bet',
  description: 'Football betting slip builder with live odds and booking codes.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LottoBet',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#060a18',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let initialUser = null;
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value ?? null;
    if (token) {
      initialUser = await userForToken(getAuthStore(), token);
    }
  } catch {
    initialUser = null;
  }

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <PwaRegister />
        <AuthProvider initialUser={initialUser}>
          <FilterProvider>
            <TopBar />
            <div className="flex-1">{children}</div>
            <Footer />
            <AuthModal />
          </FilterProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
