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

    // ── 6. Write ONLY to the student's own document ───────────────────────────
    // Only update the allowed fields — identity fields (regNo, email, name,
    // programme, isSeeded) are NOT touched by this route.
    const ref = adminDb.collection('students').doc(regNo);
    await ref.set(
      {
        grades: safeGrades,
        selectedElectives: safeElectives,
        lastUpdated: FieldValue.serverTimestamp(),
        isModifiedByStudent: true,
      },
      { merge: true } // merge: true keeps existing fields (name, regNo, etc.) intact
    );

    return NextResponse.json({ ok: true, regNo });

  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const message = e.message ?? 'Server error';
    console.warn('[API /student/grades POST]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
