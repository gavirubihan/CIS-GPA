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
  /** List of course codes pre-populated from the results sheet */
  seededCourses: string[];
  /** List of course codes modified, added, or cleared by the student */
  studentModifiedCourses: string[];
  /** Backward-compatibility alias */
  modifiedCourses?: string[];
  /** Snapshot of grades as originally seeded from the sheet (for diffing & integrity) */
  seededGrades?: Record<string, string>;
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

/**
 * Compute the audited list of student-modified courses compared to seeded sheet data.
 *
 * Auditing rules:
 * 1. If unseeded: all entered courses are considered student-modified.
 * 2. If seeded:
 *    - Any course whose current grade differs from its seeded grade is student-modified.
 *    - Any course entered that was not part of the seeded record is student-modified.
 *    - Any course that was originally seeded but removed/cleared by the student is student-modified.
 *    - Courses whose grades match the seeded grades remain un-modified.
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

// ── Public API ────────────────────────────────────────────────────────────────

/** Fetch a student's Firestore record by registration number with normalized audit fields. */
export async function getStudentRecord(regNo: string): Promise<StudentRecord | null> {
  const normalizedReg = regNo?.trim().toUpperCase();
  if (!normalizedReg || !/^\d{2}[A-Z]+\d+$/i.test(normalizedReg)) {
    console.warn('[Firestore] Invalid regNo format, skipping fetch:', regNo);
    return null;
  }
  try {
    const ref = doc(db, 'students', normalizedReg);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data();
    const isSeeded = Boolean(data.isSeeded);
    const isModified = Boolean(data.isModifiedByStudent);
    const grades = (data.grades as Record<string, string>) || {};
    const seededCourses = Array.isArray(data.seededCourses)
      ? data.seededCourses
      : (isSeeded ? Object.keys(data.seededGrades || grades).sort() : []);
    const seededGrades = data.seededGrades || (isSeeded && !isModified ? grades : {});
    const studentModifiedCourses = Array.isArray(data.studentModifiedCourses)
      ? data.studentModifiedCourses
      : (Array.isArray(data.modifiedCourses)
          ? data.modifiedCourses
          : computeCourseAudit(grades, seededGrades, seededCourses, isSeeded).studentModifiedCourses);

    return {
      ...data,
      isSeeded,
      isModifiedByStudent: studentModifiedCourses.length > 0,
      seededCourses,
      studentModifiedCourses,
      modifiedCourses: studentModifiedCourses,
      seededGrades,
    } as StudentRecord;
  } catch (err) {
    console.error('[Firestore] getStudentRecord error:', err);
    return null;
  }
}

/**
 * Merge-update grades and electives with precise course-level modification auditing.
 * Grades are sanitized client-side before writing — the Firestore rules also
 * enforce this server-side as a second layer of defence.
 */
export async function saveGrades(
  regNo: string,
  grades: UserGrades,
  selectedElectives: SelectedElectives
): Promise<void> {
  const normalizedReg = regNo?.trim().toUpperCase();
  if (!normalizedReg || !/^\d{2}[A-Z]+\d+$/i.test(normalizedReg)) {
    throw new Error('Invalid regNo — cannot save grades.');
  }

  // ── Client-side ownership guard (defense-in-depth) ──────────────────────────
  const currentUser = auth.currentUser;
  if (!currentUser?.email) {
    throw new Error('Not authenticated — cannot save grades.');
  }
  const derivedRegNo = emailToRegNo(currentUser.email);
  if (derivedRegNo !== normalizedReg) {
    console.error(
      `[Firestore] Ownership mismatch! Attempted to write to "${normalizedReg}" ` +
      `but authenticated user maps to "${derivedRegNo}". Aborting write.`
    );
    throw new Error('Ownership check failed — write aborted for security.');
  }

  const safeGrades = sanitizeGrades(grades);
  const safeElectives = sanitizeElectives(selectedElectives);

  const ref = doc(db, 'students', normalizedReg);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const existing = snap.data();
    const isSeeded = Boolean(existing.isSeeded);
    const seededCourses: string[] = Array.isArray(existing.seededCourses)
      ? existing.seededCourses
      : (isSeeded ? Object.keys(existing.seededGrades || existing.grades || {}).sort() : []);
    const seededGrades: Record<string, string> =
      existing.seededGrades || (isSeeded && !existing.isModifiedByStudent ? existing.grades || {} : {});

    const audit = computeCourseAudit(safeGrades, seededGrades, seededCourses, isSeeded);

    const updatePayload: Record<string, unknown> = {
      grades: safeGrades,
      selectedElectives: safeElectives,
      lastUpdated: serverTimestamp(),
      isModifiedByStudent: audit.isModifiedByStudent,
      studentModifiedCourses: audit.studentModifiedCourses,
    };

    // Auto-backfill legacy documents that lacked seeded metadata
    if (!existing.seededCourses && isSeeded) {
      updatePayload.seededCourses = seededCourses;
    }
    if (!existing.seededGrades && isSeeded && Object.keys(seededGrades).length > 0) {
      updatePayload.seededGrades = seededGrades;
    }

    await updateDoc(ref, updatePayload);
  } else {
    // Document doesn't exist yet (student not seeded) — create a minimal record
    const audit = computeCourseAudit(safeGrades, {}, [], false);
    await setDoc(
      ref,
      {
        regNo: normalizedReg,
        grades: safeGrades,
        selectedElectives: safeElectives,
        lastUpdated: serverTimestamp(),
        isSeeded: false,
        seededCourses: [],
        seededGrades: {},
        isModifiedByStudent: audit.isModifiedByStudent,
        studentModifiedCourses: audit.studentModifiedCourses,
      },
      { merge: true }
    );
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
