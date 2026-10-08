/**
 * Firebase Admin SDK — SERVER ONLY
 * ==================================
 * This file MUST only be imported in:
 *   - app/api/...  (Next.js API routes)
 *   - scripts/...  (seeding scripts)
 *
 * NEVER import this in components, pages, or any client-side code.
 * The Admin SDK has full database access with no security rules.
 *
 * Credentials come from environment variables (never committed to git):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *
 * How to get these values:
 *   Firebase Console → Project Settings → Service Accounts
 *   → Generate new private key → download JSON
 *   → copy project_id, client_email, private_key into .env.local
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// ── Singleton init ────────────────────────────────────────────────────────────

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Netlify & hosting env vars can be wrapped in quotes or have escaped newlines
  let rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (rawKey && rawKey.startsWith('"') && rawKey.endsWith('"')) {
    rawKey = rawKey.slice(1, -1);
  }
  const privateKey = rawKey?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      '[firebase-admin] Missing environment variables.\n' +
      'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local\n' +
      'Get them from: Firebase Console → Project Settings → Service Accounts'
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const adminApp = getAdminApp();

/** Firestore instance — full admin access, no security rules */
export const adminDb   = getFirestore(adminApp);

/** Auth instance — can verify ID tokens and manage users */
export const adminAuth = getAuth(adminApp);

// ── Constants ─────────────────────────────────────────────────────────────────
export const UNIVERSITY_DOMAIN = 'ms.sab.ac.lk';
export const VALID_GRADES = new Set([
  'A+', 'A', 'A-',
  'B+', 'B', 'B-',
  'C+', 'C', 'C-',
  'D+', 'D',
  'E',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verify a Firebase ID token from the Authorization header.
 * Returns the decoded token (contains uid, email, etc.) or throws.
 */
export async function verifyIdToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing or malformed Authorization header'), { status: 401 });
  }
  const token = authHeader.slice(7);
  try {
    return await adminAuth.verifyIdToken(token, /* checkRevoked= */ true);
  } catch {
    throw Object.assign(new Error('Invalid or expired ID token'), { status: 401 });
  }
}

/**
 * Derive the Firestore document ID (regNo) from an email — server-side.
 * e.g. "22cis0333@ms.sab.ac.lk" → "22CIS0333"
 */
export function serverEmailToRegNo(email: string): string {
  return email.split('@')[0].toUpperCase();
}

/**
 * Validate the email belongs to the university domain.
 */
export function isUniversityEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${UNIVERSITY_DOMAIN}`);
}

/**
 * Validate the derived regNo has the expected format.
 */
export function isValidRegNo(regNo: string): boolean {
  return /^22(CIS|FIS)\d{4}$/.test(regNo);
}

/**
 * Sanitize a grades map — removes invalid grade values.
 */
export function sanitizeGrades(grades: Record<string, string>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [code, grade] of Object.entries(grades)) {
    const g = String(grade).trim();
    if (/^IS[\w-]+$/.test(code) && VALID_GRADES.has(g)) {
      safe[code] = g;
    }
  }
  return safe;
}

/**
 * Sanitize the selectedElectives map.
 */
export function sanitizeElectives(electives: Record<string, boolean>): Record<string, boolean> {
  const safe: Record<string, boolean> = {};
  for (const [code, val] of Object.entries(electives)) {
    if (/^IS[\w-]+$/.test(code) && val === true) {
      safe[code] = true;
    }
  }
  return safe;
}
