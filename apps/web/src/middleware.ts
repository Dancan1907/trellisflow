import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // This cookie is a lightweight routing hint only. The app layout verifies
  // the JWT with the API before rendering authenticated UI.
  const isAuthenticated = request.cookies.has('trellisflow-authenticated');
  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isLandingPage = pathname === '/';

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isAuthenticated && isLandingPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/personal') ||
    pathname.startsWith('/investments') ||
    pathname.startsWith('/businesses') ||
    pathname.startsWith('/budgets') ||
    pathname.startsWith('/goals') ||
    pathname.startsWith('/debts') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/insights') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/money-copilot');

  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // /help is intentionally public; its page filters documentation by session.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/personal/:path*',
    '/investments/:path*',
    '/businesses/:path*',
    '/budgets/:path*',
    '/goals/:path*',
    '/debts/:path*',
    '/reports/:path*',
    '/insights/:path*',
    '/settings/:path*',
    '/money-copilot/:path*',
  ],
};
