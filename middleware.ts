/**
 * Next.js Middleware — COOP Header Fix for Firebase signInWithPopup
 * =================================================================
 * The Cross-Origin-Opener-Policy header must be set to `unsafe-none` (or
 * omitted entirely) for Firebase's signInWithPopup to work correctly.
 *
 * The COOP error "would block the window.closed call" is caused by the header
 * being set to `same-origin` or `same-origin-allow-popups`. Even though
 * `same-origin-allow-popups` seems permissive, browsers still block the
 * Firebase auth iframe (*.firebaseapp.com) from accessing window.closed on the
 * popup it opened, because that iframe is a different origin.
 *
 * Setting COOP: unsafe-none (which is the browser default if no header is
 * sent) allows the cross-origin window communication Firebase needs.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Allow Firebase signInWithPopup to communicate with the OAuth popup window.
  // 'unsafe-none' is the browser default — it allows cross-origin window
  // references which are required for Firebase's window.closed polling.
  response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and images
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
