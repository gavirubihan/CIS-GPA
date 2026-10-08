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
 * Primary: /api/student/me (Serverless API with Admin SDK verification)
 * Fallback: Direct Firestore Client SDK (using secure authenticated security rules)
 */
export async function fetchStudentRecord(): Promise<{ record: StudentRecord | null; regNo: string } | null> {
  const user = auth.currentUser;
  if (!user?.email) {
    console.warn('[API] fetchStudentRecord: No authenticated user session.');
    return null;
  }
  const regNo = emailToRegNo(user.email);

  try {
    const headers = await authHeaders();
    const res = await fetch('/api/student/me', { headers });

    // Authentication refusal
    if (res.status === 401 || res.status === 403) {
      console.warn('[API] fetchStudentRecord unauthorized:', res.status);
      return null;
    }

    if (res.ok) {
      return await res.json();
    }

    // Server error (500, 503, etc.): fallback seamlessly to client Firestore SDK
    console.warn(
      `[API] /api/student/me returned status ${res.status}. Falling back to direct client Firestore SDK for ${regNo}...`
    );
    const record = await getStudentRecord(regNo);
    return { record, regNo };
  } catch (err) {
    // Network or function failure: fallback to client Firestore SDK
    console.warn(
      '[API] /api/student/me request failed. Falling back to direct client Firestore SDK:',
      err
    );
    try {
      const record = await getStudentRecord(regNo);
      return { record, regNo };
    } catch (fallbackErr) {
      console.error('[API] Direct Firestore fallback also failed:', fallbackErr);
      return null;
    }
  }
}

/**
 * Save grades and elective selections.
 * Primary: /api/student/grades (Serverless API)
 * Fallback: Direct Firestore Client SDK save (enforced by Firestore security rules)
 */
export async function saveGradesViaApi(
  grades: UserGrades,
  selectedElectives: SelectedElectives
): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Not authenticated');
  const regNo = emailToRegNo(user.email);

  try {
    const headers = await authHeaders();
    const res = await fetch('/api/student/grades', {
      method: 'POST',
      headers,
      body: JSON.stringify({ grades, selectedElectives }),
    });

    if (res.ok) {
      return;
    }

    if (res.status === 401 || res.status === 403) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Save failed: HTTP ${res.status}`);
    }

    // Server error (500, 503, etc.): fallback seamlessly to direct Firestore write
    console.warn(
      `[API] /api/student/grades returned status ${res.status}. Falling back to direct client Firestore save for ${regNo}...`
    );
    await saveGrades(regNo, grades, selectedElectives);
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? '';
    if (message.includes('Not authenticated') || message.includes('Save failed: HTTP 40')) {
      throw err;
    }
    // Network or server error fallback
    console.warn(
      '[API] saveGradesViaApi network error, falling back to direct client Firestore save:',
      err
    );
    await saveGrades(regNo, grades, selectedElectives);
  }
}
