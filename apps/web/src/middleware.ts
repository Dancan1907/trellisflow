import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // We use a lightweight cookie to know if a user is logged in
  const isAuthenticated = request.cookies.has('trellisflow-authenticated');
  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isLandingPage = pathname === '/';

  // 1. If the user is logged in and tries to go to login/signup, send them to the dashboard
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. If the user is logged in and visits the landing page, send them to the dashboard
  if (isAuthenticated && isLandingPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. If the user is trying to access a protected app route without being logged in
  // We protect /dashboard, /personal, /budgets, etc.
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/personal') ||
    pathname.startsWith('/budgets') ||
    pathname.startsWith('/goals') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/insights') ||
    pathname.startsWith('/settings');

  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Run middleware on the landing page, auth pages, and all protected app routes
export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/personal/:path*',
    '/budgets/:path*',
    '/goals/:path*',
    '/reports/:path*',
    '/insights/:path*',
    '/settings/:path*',
  ],
};
