import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Retrieve token from cookies (checked by setStoredToken or FastAPI session cookie)
  const token = request.cookies.get('nightcast_token')?.value ||
                request.cookies.get('access_token')?.value;

  const isAuthenticated = Boolean(token && token !== 'null' && token !== 'undefined' && token.trim().length > 10);

  const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/register';
  const isProtectedRoute = pathname.startsWith('/profile') || pathname.startsWith('/admin');

  // 1. If authenticated user tries to visit login/signup/register, redirect to home
  if (isAuthenticated && isAuthRoute) {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. If unauthenticated user tries to visit protected routes (/profile or /admin), redirect to /login
  if (!isAuthenticated && isProtectedRoute) {
    const returnUrl = encodeURIComponent(`${pathname}${search}`);
    const loginUrl = new URL(`/login?redirect=${returnUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/profile/:path*',
    '/profile',
    '/admin/:path*',
    '/admin',
    '/login',
    '/signup',
    '/register',
  ],
};
