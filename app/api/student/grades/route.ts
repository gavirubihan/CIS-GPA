/**
 * POST /api/student/grades
 * =========================
 * Saves the authenticated student's grades and elective selections.
 *
 * Security:
 *  1. Client sends Firebase ID token in Authorization header
 *  2. Server verifies the token cryptographically (Admin SDK)
 *  3. RegNo is derived server-side from the verified email — client has NO say
 *  4. Grade values are sanitized server-side (only A+, A, A-, B+… E allowed)
 *  5. Only the student's own document is written — no parameter for regNo in body
 *  6. Identity fields (regNo, email, name, programme) are immutable from this route
 *
 * Request:
 *   Headers: Authorization: Bearer <firebase-id-token>
 *   Body: { grades: Record<string, string>, selectedElectives: Record<string, boolean> }
 *
 * Response 200: { ok: true, regNo: string }
 * Response 400: Bad request body
 * Response 401: Not authenticated or token invalid
 * Response 403: Email not from university domain
 * Response 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  adminDb,
  verifyIdToken,
  serverEmailToRegNo,
  isUniversityEmail,
  isValidRegNo,
  sanitizeGrades,
  sanitizeElectives,
  computeCourseAudit,
} from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // ── 1. Verify ID token ────────────────────────────────────────────────────
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    const email = decoded.email ?? '';

    // ── 2. Validate university domain ─────────────────────────────────────────
    if (!isUniversityEmail(email)) {
      return NextResponse.json(
        { error: 'Only Sabaragamuwa University accounts are allowed.' },
        { status: 403 }
      );
    }

    // ── 3. Derive regNo server-side ───────────────────────────────────────────
    // The client sends NO regNo — we compute it from the verified token.
    // This makes it IMPOSSIBLE for a student to write to another student's doc.
    const regNo = serverEmailToRegNo(email);
    if (!isValidRegNo(regNo)) {
      return NextResponse.json(
        { error: `Unrecognized student ID format: ${regNo}` },
        { status: 403 }
      );
    }

    // ── 4. Parse and validate request body ────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { grades, selectedElectives } = body as {
      grades?: Record<string, string>;
      selectedElectives?: Record<string, boolean>;
    };

    if (!grades || typeof grades !== 'object' || Array.isArray(grades)) {
      return NextResponse.json({ error: 'grades must be an object' }, { status: 400 });
    }

    // ── 5. Sanitize — strip any invalid grade values or course codes ──────────
    const safeGrades = sanitizeGrades(grades);
    const safeElectives = sanitizeElectives(selectedElectives ?? {});

    // ── 6. Write ONLY to the student's own document with course audit ───────────
    const ref = adminDb.collection('students').doc(regNo);
    const snap = await ref.get();

    let isSeeded = false;
    let seededCourses: string[] = [];
    let seededGrades: Record<string, string> = {};

    if (snap.exists) {
      const existing = snap.data();
      isSeeded = Boolean(existing?.isSeeded);
      seededCourses = Array.isArray(existing?.seededCourses)
        ? existing.seededCourses
        : (isSeeded ? Object.keys(existing?.seededGrades || existing?.grades || {}).sort() : []);
      seededGrades = existing?.seededGrades || (isSeeded && !existing?.isModifiedByStudent ? existing?.grades || {} : {});
    }

    const audit = computeCourseAudit(safeGrades, seededGrades, seededCourses, isSeeded);

    const updatePayload: Record<string, unknown> = {
      grades: safeGrades,
      selectedElectives: safeElectives,
      lastUpdated: FieldValue.serverTimestamp(),
      isModifiedByStudent: audit.isModifiedByStudent,
      studentModifiedCourses: audit.studentModifiedCourses,
    };

    if (!snap.exists) {
      updatePayload.regNo = regNo;
      updatePayload.isSeeded = false;
      updatePayload.seededCourses = [];
      updatePayload.seededGrades = {};
    } else {
      const existing = snap.data();
      if (!existing?.seededCourses && isSeeded) {
        updatePayload.seededCourses = seededCourses;
      }
      if (!existing?.seededGrades && isSeeded && Object.keys(seededGrades).length > 0) {
        updatePayload.seededGrades = seededGrades;
      }
    }

    await ref.set(updatePayload, { merge: true });

    return NextResponse.json({ ok: true, regNo, studentModifiedCourses: audit.studentModifiedCourses });

  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const message = e.message ?? 'Server error';
    console.warn('[API /student/grades POST]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
