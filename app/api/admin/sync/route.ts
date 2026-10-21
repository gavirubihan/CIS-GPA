/**
 * POST /api/admin/sync
 * =====================
 * Authenticated Administrative endpoint to synchronize Google Sheets results to Firestore.
 *
 * Security:
 *  1. Client sends Firebase ID token in Authorization header
 *  2. Server cryptographically verifies the token using Firebase Admin SDK
 *  3. Server asserts email is an authorized administrative student (configured via ADMIN_EMAILS)
 *  4. In-memory execution: Zero disk writes, safe for serverless runtimes
 *  5. Concurrency protection: Locks against simultaneous duplicate runs
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, isAuthorizedAdmin } from '@/lib/firebase-admin';
import { runSyncEngine } from '@/lib/sync-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-side in-memory mutex to prevent overlapping sync operations
let isSyncInProgress = false;
let syncStartedAt = 0;

export async function POST(req: NextRequest) {
  try {
    // ── 1. Cryptographic Authentication ───────────────────────────────────────
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    const email = decoded.email ?? '';

    // ── 2. Administrative RBAC Check ──────────────────────────────────────────
    if (!isAuthorizedAdmin(email)) {
      console.warn(`[API /admin/sync] Unauthorized access attempt by ${email}`);
      return NextResponse.json(
        { error: 'Forbidden: You do not have administrator permissions to trigger database syncs.' },
        { status: 403 }
      );
    }

    // ── 3. Concurrency Lock Guard ─────────────────────────────────────────────
    const now = Date.now();
    if (isSyncInProgress && now - syncStartedAt < 60000) {
      return NextResponse.json(
        { error: 'A database synchronization is already actively running. Please wait for it to complete.' },
        { status: 409 }
      );
    }

    isSyncInProgress = true;
    syncStartedAt = now;

    // ── 4. Parse Options ──────────────────────────────────────────────────────
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {}

    const semester = body.semester === 'all' || body.semester === undefined ? 'all' : Number(body.semester) || 'all';
    const dryRun = Boolean(body.dryRun);
    const sheetUrl = typeof body.sheetUrl === 'string' && body.sheetUrl.trim() ? body.sheetUrl.trim() : undefined;

    console.log(`[API /admin/sync] Admin ${email} initiated sync (Semester: ${semester}, DryRun: ${dryRun})`);

    // ── 5. Run Sync Engine ───────────────────────────────────────────────────
    const result = await runSyncEngine({
      semester,
      dryRun,
      sheetUrl,
    });

    return NextResponse.json(result, { status: 200 });

  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const status = e.status || 500;
    const message = e.message || 'An unexpected server error occurred during database synchronization.';
    console.error('[API /admin/sync Error]:', err);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  } finally {
    isSyncInProgress = false;
  }
}
