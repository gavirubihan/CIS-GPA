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

// ── Singleton lazy init ───────────────────────────────────────────────────────

let _adminApp: App | null = null;

export function getAdminApp(): App | null {
  if (_adminApp) return _adminApp;
  if (getApps().length > 0) {
    _adminApp = getApps()[0]!;
    return _adminApp;
  }

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawKey) {
    console.warn(
      '[firebase-admin] Missing server environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY).'
    );
    return null;
  }

  // Handle Netlify/hosting environment variable formatting nuances:
  // 1. Remove wrapping single or double quotes
  if (
    (rawKey.startsWith('"') && rawKey.endsWith('"')) ||
    (rawKey.startsWith("'") && rawKey.endsWith("'"))
  ) {
    rawKey = rawKey.slice(1, -1);
  }

  // 2. Decode Base64 key if passed as base64 to avoid line break issues in CI/hosting
  if (!rawKey.includes('-----BEGIN') && rawKey.length > 200) {
    try {
      const decoded = Buffer.from(rawKey, 'base64').toString('utf-8');
      if (decoded.includes('-----BEGIN')) {
        rawKey = decoded;
      }
    } catch (_) {}
  }

  // 3. Normalize newlines: unescape \n and remove Windows \r
  const privateKey = rawKey
    .replace(/\\r/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');

  try {
    _adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
    return _adminApp;
  } catch (err) {
    console.error('[firebase-admin] Failed to initialize App with provided credentials:', err);
    return null;
  }
}

export function getAdminDb() {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function getAdminAuth() {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

/**
 * Proxy object for adminDb that delegates to lazy getAdminDb().
 * Prevents module evaluation crashes on cold-start if environment variables are not yet loaded.
 */
export const adminDb = {
  collection(name: string) {
    const db = getAdminDb();
    if (!db) {
      throw Object.assign(
        new Error('Firebase Admin DB is not initialized. Please configure FIREBASE_* environment variables.'),
        { status: 503 }
      );
    }
    return db.collection(name);
  },
};

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
  const auth = getAdminAuth();
  if (!auth) {
    throw Object.assign(
      new Error('Firebase Admin Auth is not configured on server (check environment variables)'),
      { status: 503 }
    );
  }
  try {
    return await auth.verifyIdToken(token, /* checkRevoked= */ true);
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
 * Validate the derived regNo has the expected format (e.g. 22CIS0333, 22FIS0296).
 */
export function isValidRegNo(regNo: string): boolean {
  return /^\d{2}(CIS|FIS)\d{3,5}$/i.test(regNo);
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

/**
 * Compute the audited list of student-modified courses compared to seeded sheet data.
 */
export function computeCourseAudit(
  currentGrades: Record<string, string>,
  seededGrades: Record<string, string> = {},
  seededCourses: string[] = [],
  isSeeded = false
): { studentModifiedCourses: string[]; isModifiedByStudent: boolean } {
  if (!isSeeded && seededCourses.length === 0) {
    const modified = Object.keys(currentGrades).sort();
    return {
      studentModifiedCourses: modified,
      isModifiedByStudent: modified.length > 0,
    };
  }

  const modifiedSet = new Set<string>();

  // 1. Check all courses currently present
  for (const [code, grade] of Object.entries(currentGrades)) {
    const originalGrade = seededGrades[code];
    if (originalGrade === undefined) {
      if (!seededCourses.includes(code)) {
        // Brand new course entered by student
        modifiedSet.add(code);
      }
    } else if (originalGrade !== grade) {
      // Seeded grade was modified by student
      modifiedSet.add(code);
    }
  }

  // 2. Check courses that were seeded but are no longer in currentGrades (cleared)
  for (const code of seededCourses) {
    if (!(code in currentGrades)) {
      modifiedSet.add(code);
    }
  }

  const studentModifiedCourses = Array.from(modifiedSet).sort();
  return {
    studentModifiedCourses,
    isModifiedByStudent: studentModifiedCourses.length > 0,
  };
}
