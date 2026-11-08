import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from './src/lib/auth.ts';

const PROTECTED_PATHS = ['/my-picks', '/saved-slips', '/results'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/';
      loginUrl.searchParams.set('auth', 'login');
      loginUrl.searchParams.set('next', pathname);
      const res = NextResponse.redirect(loginUrl);
      res.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
      return res;
    }
  }

  const res = NextResponse.next();
  if (isProtected || pathname.startsWith('/api/')) {
    res.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  }
  return res;
}

export const config = {
  matcher: ['/my-picks/:path*', '/saved-slips/:path*', '/results/:path*', '/api/:path*'],
};
