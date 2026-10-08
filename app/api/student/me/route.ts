/**
 * GET /api/student/me
 * ====================
 * Returns the authenticated student's Firestore record.
 *
 * Security:
 *  1. Client sends Firebase ID token in Authorization header
 *  2. Server verifies the token cryptographically (Admin SDK)
 *  3. RegNo is derived server-side from the verified email — cannot be spoofed
 *  4. Only the student's own document is returned
 *
 * Request:
 *   Headers: Authorization: Bearer <firebase-id-token>
 *
 * Response 200:
 *   { record: StudentRecord | null }
 *   null = student is authenticated but not yet in the database
 *
 * Response 401: Not authenticated or token invalid
 * Response 403: Email not from university domain
 * Response 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  adminDb,
  verifyIdToken,
  serverEmailToRegNo,
  isUniversityEmail,
  isValidRegNo,
} from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    // ── 3. Derive regNo server-side — client has no input here ────────────────
    const regNo = serverEmailToRegNo(email);
    if (!isValidRegNo(regNo)) {
      return NextResponse.json(
        { error: `Unrecognized student ID format: ${regNo}` },
        { status: 403 }
      );
    }

    // ── 4. Fetch only this student's document ─────────────────────────────────
    const snap = await adminDb.collection('students').doc(regNo).get();
    if (!snap.exists) {
      // Not in DB yet — not an error, student can enter grades manually
      return NextResponse.json({ record: null, regNo });
    }

    return NextResponse.json({ record: snap.data(), regNo });

  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const status = e.status ?? 500;
    const message = e.message ?? 'Internal server error';
    console.error('[API /student/me GET]', err);
    return NextResponse.json({ error: message, fallbackAvailable: true }, { status });
  }
}
