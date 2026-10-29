import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // We use a lightweight cookie to know if a user is logged in
  const isAuthenticated = request.cookies.has('trellisflow-authenticated');
  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup');

  // If the user is trying to access the app without being logged in
  if (!isAuthenticated && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If the user is logged in and tries to go to login/signup, send them to the dashboard
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Only run middleware on these paths
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
