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

let _initError: string | null = null;

export function getAdminInitError(): string | null {
  return _initError;
}

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
    _initError = `Missing required env vars: ${[!projectId && 'FIREBASE_PROJECT_ID', !clientEmail && 'FIREBASE_CLIENT_EMAIL', !rawKey && 'FIREBASE_PRIVATE_KEY'].filter(Boolean).join(', ')}`;
    console.warn('[firebase-admin]', _initError);
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
  } catch (err: unknown) {
    const e = err as { message?: string };
    _initError = e?.message || String(err);
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
 * e.g. "22cis0001@ms.sab.ac.lk" → "22CIS0001"
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

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.replace(/^["']|["']$/g, '').trim().toLowerCase())
    .filter(Boolean);
}

export const ADMIN_EMAILS: string[] = getAdminEmails();

/** Check if an email belongs to a super administrator */
export function isAuthorizedAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.trim().toLowerCase());
}

export interface AdminScope {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  allowedBatches: string[];
}

/**
 * Determine full administrative scope for a given email address.
 * Evaluates Super Admin rights (ADMIN_EMAILS) and batch-scoped rights (batches collection).
 */
export async function getAdminScope(email?: string | null): Promise<AdminScope> {
  if (!email) {
    return { isAdmin: false, isSuperAdmin: false, allowedBatches: [] };
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Super Admin: Full authority across all cohorts
  if (isAuthorizedAdmin(cleanEmail)) {
    return { isAdmin: true, isSuperAdmin: true, allowedBatches: ['*'] };
  }

  // 2. Batch-Specific Admin: Check Firestore batches collection
  try {
    const db = getAdminDb();
    if (!db) {
      return { isAdmin: false, isSuperAdmin: false, allowedBatches: [] };
    }

    const snap = await db.collection('batches').get();
    const allowed: string[] = [];

    snap.forEach((doc) => {
      const data = doc.data();
      const adminList: string[] = Array.isArray(data.adminEmails)
        ? data.adminEmails.map((e: string) => String(e).trim().toLowerCase())
        : [];
      if (adminList.includes(cleanEmail)) {
        allowed.push(doc.id);
      }
    });

    if (allowed.length > 0) {
      return { isAdmin: true, isSuperAdmin: false, allowedBatches: allowed };
    }
  } catch (err) {
    console.warn('[firebase-admin] Could not inspect batch admin access:', err);
  }

  return { isAdmin: false, isSuperAdmin: false, allowedBatches: [] };
}

/**
 * Retrieve batch configuration from Firestore, with fallback to default settings.
 */
export async function getBatchConfig(batchId: string): Promise<any> {
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db.collection('batches').doc(batchId).get();
      if (snap.exists) {
        return { id: batchId, ...snap.data() };
      }
    } catch (err) {
      console.warn(`[firebase-admin] Error reading batch ${batchId} from Firestore:`, err);
    }
  }

  // Fallback default configurations
  const prefix = batchId.split('_')[0] || '22';
  return {
    id: batchId,
    label: `20${prefix}/20${Number(prefix) + 1} Batch`,
    prefix,
    googleSheetUrl:
      batchId === '22_23'
        ? 'https://docs.google.com/spreadsheets/d/1Xq3tsyEkLwBTO7EsFruHdlbXBwETdCOQGSdlZrWzZdo/edit?usp=sharing'
        : 'https://docs.google.com/spreadsheets/d/1Xq3tsyEkLwBTO7EsFruHdlbXBwETdCOQGSdlZrWzZdo/edit?usp=sharing',
    adminEmails: [],
    programmes: ['CIS', 'FIS'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validate the derived regNo has the expected format (e.g. 22CIS0001, 22FIS0001).
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
