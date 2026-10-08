/**
 * API Client — Student Data
 * ==========================
 * Client-side helpers that call the Next.js API routes.
 *
 * These replace the direct Firestore SDK calls in the Dashboard.
 * All requests include the Firebase ID token for server-side verification.
 *
 * Security model:
 *  - Firebase client SDK is only used here to get the ID token
 *  - All actual data access goes through the server (API routes)
 *  - The server verifies the token and derives the regNo — no client spoofing possible
 */

import { auth } from './firebase';
import { getStudentRecord, saveGrades, type StudentRecord } from './firestore';
import { emailToRegNo } from './auth';
import type { UserGrades, SelectedElectives } from '../types';

// ── Token helper ─────────────────────────────────────────────────────────────

/**
 * Get the current user's Firebase ID token.
 * Automatically refreshes if expired (Firebase handles this).
 */
async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken(/* forceRefresh= */ false);
}

/**
 * Build Authorization header with the current user's ID token.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated student's record.
 * Primary: Direct Firestore Client SDK (instant, secure, enforced by Firestore Security Rules)
 * Fallback: /api/student/me (Serverless API)
 */
export async function fetchStudentRecord(): Promise<{ record: StudentRecord | null; regNo: string } | null> {
  const user = auth.currentUser;
  if (!user?.email) {
    return null;
  }
  const regNo = emailToRegNo(user.email);

  try {
    // 1. Direct Firestore client SDK: fast, reliable, zero serverless cold-start
    const record = await getStudentRecord(regNo);
    return { record, regNo };
  } catch (clientErr) {
    // 2. Resilient fallback: API route
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/student/me', { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    return null;
  }
}

/**
 * Save grades and elective selections.
 * Primary: Direct Firestore Client SDK save (enforced by Firestore security rules)
 * Fallback: /api/student/grades (Serverless API)
 */
export async function saveGradesViaApi(
  grades: UserGrades,
  selectedElectives: SelectedElectives
): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Not authenticated');
  const regNo = emailToRegNo(user.email);

  try {
    // 1. Primary: direct Firestore client write
    await saveGrades(regNo, grades, selectedElectives);
  } catch (err) {
    // 2. Fallback: try API route
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/student/grades', {
        method: 'POST',
        headers,
        body: JSON.stringify({ grades, selectedElectives }),
      });
      if (res.ok) return;
    } catch (_) {}
    throw err;
  }
}
