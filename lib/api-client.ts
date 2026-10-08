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
import type { StudentRecord } from './firestore';
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
 * Fetch the authenticated student's record from the server.
 * Returns null if the student exists in Auth but not in the Firestore DB yet.
 */
export async function fetchStudentRecord(): Promise<{ record: StudentRecord | null; regNo: string } | null> {
  try {
    const headers = await authHeaders();
    const res = await fetch('/api/student/me', { headers });

    if (res.status === 401 || res.status === 403) {
      console.warn('[API] fetchStudentRecord unauthorized:', res.status);
      return null;
    }
    if (!res.ok) {
      console.error('[API] fetchStudentRecord failed:', res.status, await res.text());
      return null;
    }

    return res.json();
  } catch (err) {
    console.error('[API] fetchStudentRecord error:', err);
    return null;
  }
}

/**
 * Save grades and elective selections via the server API.
 * The server derives the regNo from the verified ID token — not from any client input.
 */
export async function saveGradesViaApi(
  grades: UserGrades,
  selectedElectives: SelectedElectives
): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch('/api/student/grades', {
    method: 'POST',
    headers,
    body: JSON.stringify({ grades, selectedElectives }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Save failed: HTTP ${res.status}`);
  }
}
