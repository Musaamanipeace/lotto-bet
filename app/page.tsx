import { cookies } from 'next/headers';
import { SESSION_COOKIE, userForToken } from '@/lib/auth.ts';
import { getAuthStore } from '@/lib/auth-store.ts';
import { Builder } from './components/builder';
import { HeroSection } from './components/hero-section';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let signedIn = false;
  try {
    const token = cookies().get(SESSION_COOKIE)?.value ?? null;
    if (token) {
      const user = await userForToken(getAuthStore(), token);
      signedIn = Boolean(user);
    }
  } catch {
    signedIn = false;
  }

  return (
    <>
      {!signedIn && <HeroSection initialSignedIn={false} />}
      <div className="mt-4">
        <Builder />
      </div>
    </>
  );
}
