import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { emailToRegNo } from './auth';
import { UserGrades, SelectedElectives } from '../types';

export interface StudentRecord {
  regNo: string;
  nameWithInitials: string;
  fullName: string;
  email: string;
  programme: 'CIS' | 'FIS' | 'unknown';
  year: number;
  grades: Record<string, string>;
  selectedElectives: SelectedElectives;
  lastUpdated: unknown; // Firestore Timestamp
  isSeeded: boolean;
  isModifiedByStudent: boolean;
}

// ── Valid grade values (must match Firestore rules) ───────────────────────────
const VALID_GRADES = new Set([
  'A+', 'A', 'A-',
  'B+', 'B', 'B-',
  'C+', 'C', 'C-',
  'D+', 'D',
  'E',
]);

/**
 * Sanitize a grades map: remove any keys with invalid values.
 * This mirrors the Firestore rule validation on the client side so we
 * never even attempt to write bad data to the database.
 */
function sanitizeGrades(grades: UserGrades): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [code, grade] of Object.entries(grades)) {
    const g = String(grade).trim();
    // Only keep known course-code format and valid grade values
    if (/^IS[\w-]+$/.test(code) && VALID_GRADES.has(g)) {
      safe[code] = g;
    }
  }
  return safe;
}

/**
 * Sanitize the selectedElectives map: only boolean true values allowed.
 */
function sanitizeElectives(electives: SelectedElectives): Record<string, boolean> {
  const safe: Record<string, boolean> = {};
  for (const [code, val] of Object.entries(electives)) {
    if (/^IS[\w-]+$/.test(code) && val === true) {
      safe[code] = true;
    }
  }
  return safe;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Fetch a student's Firestore record by registration number. */
export async function getStudentRecord(regNo: string): Promise<StudentRecord | null> {
  if (!regNo || !/^22[A-Z]+\d+$/.test(regNo)) {
    console.warn('[Firestore] Invalid regNo format, skipping fetch:', regNo);
    return null;
  }
  try {
    const ref = doc(db, 'students', regNo);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as StudentRecord;
  } catch (err) {
    console.error('[Firestore] getStudentRecord error:', err);
    return null;
  }
}

/**
 * Merge-update only grades and electives (called on every grade change, debounced).
 * Grades are sanitized client-side before writing — the Firestore rules also
 * enforce this server-side as a second layer of defence.
 */
export async function saveGrades(
  regNo: string,
  grades: UserGrades,
  selectedElectives: SelectedElectives
): Promise<void> {
  if (!regNo || !/^22[A-Z]+\d+$/.test(regNo)) {
    throw new Error('Invalid regNo — cannot save grades.');
  }

  // ── Client-side ownership guard (defense-in-depth) ──────────────────────────
  // Verify the regNo we're about to write to matches the currently
  // authenticated user's email. Firestore rules enforce this server-side too —
  // this client check prevents accidental bugs from writing to a wrong document.
  const currentUser = auth.currentUser;
  if (!currentUser?.email) {
    throw new Error('Not authenticated — cannot save grades.');
  }
  const derivedRegNo = emailToRegNo(currentUser.email);
  if (derivedRegNo !== regNo) {
    // This should never happen in normal operation — log and abort
    console.error(
      `[Firestore] Ownership mismatch! Attempted to write to "${regNo}" ` +
      `but authenticated user maps to "${derivedRegNo}". Aborting write.`
    );
    throw new Error('Ownership check failed — write aborted for security.');
  }

  const safeGrades = sanitizeGrades(grades);
  const safeElectives = sanitizeElectives(selectedElectives);

  const ref = doc(db, 'students', regNo);
  try {
    // Try update first (document already exists — either seeded or previously created)
    await updateDoc(ref, {
      grades: safeGrades,
      selectedElectives: safeElectives,
      lastUpdated: serverTimestamp(),
      isModifiedByStudent: true,
    });
  } catch (err: unknown) {
    // Document doesn't exist yet (student not seeded) — create a minimal record
    if ((err as { code?: string }).code === 'not-found') {
      await setDoc(
        ref,
        {
          regNo,
          grades: safeGrades,
          selectedElectives: safeElectives,
          lastUpdated: serverTimestamp(),
          isModifiedByStudent: true,
          isSeeded: false,
        },
        { merge: true }
      );
    } else {
      throw err;
    }
  }
}

/**
 * Create or fully overwrite a student document.
 * Only used by the seeding script (via Admin SDK). This function is
 * kept here for reference but should NOT be called from the client app.
 */
export async function setStudentRecord(
  regNo: string,
  data: Partial<StudentRecord>
): Promise<void> {
  const ref = doc(db, 'students', regNo);
  await setDoc(ref, { ...data, lastUpdated: serverTimestamp() }, { merge: true });
}
