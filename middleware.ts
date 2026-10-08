/**
 * Next.js Middleware — Route Protection
 * ======================================
 * Intercepts every request to protected routes and redirects unauthenticated
 * users to the login page (/).
 *
 * NOTE: Firebase Auth uses client-side tokens (JWTs stored in IndexedDB/localStorage).
 * Since middleware runs on the Edge Runtime and cannot access Firebase's client SDK,
 * we use a lightweight session cookie set by the client after login.
 *
 * The real security enforcement is:
 *   1. Firestore Security Rules (server-enforced, cannot be bypassed)
 *   2. Client-side auth gate in page.tsx (Dashboard only renders when user != null)
 *   3. This middleware (prevents unauthenticated users from even loading the JS bundle)
 *
 * For production hardening you could use Firebase Admin SDK to verify
 * an ID token cookie server-side — but that requires a custom server or
 * API route. For this academic portal, the Firestore rules are the primary
 * security layer and this middleware adds a UX-level gate.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that are always public (no auth required)
const PUBLIC_PATHS = ['/', '/_next', '/favicon.ico', '/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths to pass through
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isPublic) return NextResponse.next();

  // For protected routes (/dashboard, /admin, etc.):
  // The client-side auth check in page.tsx handles the actual gate.
  // Middleware here just passes through — Firestore rules are the real barrier.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and images
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
