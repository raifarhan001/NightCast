import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isTokenValid(rawToken: string | undefined | null): boolean {
  if (!rawToken || rawToken === 'null' || rawToken === 'undefined') return false;
  let token = rawToken.trim();
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  } else if (token.startsWith('Bearer%20')) {
    token = token.slice(9).trim();
  }
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const jsonStr = atob(padded);
    const payload = JSON.parse(jsonStr);

    if (!payload || typeof payload !== 'object') return false;

    // Check expiration
    if (typeof payload.exp === 'number') {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (nowSeconds >= payload.exp) {
        return false;
      }
    }

    return Boolean(payload.sub);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Retrieve token from cookies (checked by setStoredToken or FastAPI session cookie)
  const rawToken = request.cookies.get('nightcast_token')?.value ||
                   request.cookies.get('access_token')?.value;

  const isAuthenticated = isTokenValid(rawToken);

  const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/register';
  const isProtectedRoute = pathname.startsWith('/profile') || pathname.startsWith('/admin');

  // 1. If validly authenticated user tries to visit login/signup/register, redirect to home
  if (isAuthenticated && isAuthRoute) {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. If unauthenticated user tries to visit protected routes (/profile or /admin), redirect to /login
  if (!isAuthenticated && isProtectedRoute) {
    const returnUrl = encodeURIComponent(`${pathname}${search}`);
    const loginUrl = new URL(`/login?redirect=${returnUrl}`, request.url);
    const response = NextResponse.redirect(loginUrl);
    if (rawToken) {
      response.cookies.delete('nightcast_token');
      response.cookies.delete('access_token');
    }
    return response;
  }

  // 3. If unauthenticated and on auth route with a stale/expired cookie, clean up the stale cookie
  if (!isAuthenticated && isAuthRoute && rawToken) {
    const response = NextResponse.next();
    response.cookies.delete('nightcast_token');
    response.cookies.delete('access_token');
    return response;
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
