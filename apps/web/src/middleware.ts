import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // This cookie is only a routing hint. The app layout verifies the JWT
  // against the API before rendering authenticated UI.
  const hasAuthHint = request.cookies.get('trellisflow-authenticated')?.value === 'true';
  const pathname = request.nextUrl.pathname;

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

  if (!hasAuthHint && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Do not redirect away from login based on this non-authoritative cookie:
  // an expired token must be able to reach login and establish a new session.
  // /help is intentionally public and its page filters the guide by session.
  return NextResponse.next();
}

export const config = {
  matcher: [
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
