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
import { verifyIdToken, getAdminScope } from '@/lib/firebase-admin';
import { runSyncEngine } from '@/lib/sync-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-side in-memory map of active locks per batch to prevent overlapping sync operations
const activeSyncLocks: Record<string, number> = {};

export async function POST(req: NextRequest) {
  let activeLockKey: string | null = null;
  try {
    // ── 1. Cryptographic Authentication ───────────────────────────────────────
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    const email = decoded.email ?? '';

    // ── 2. Parse Options ──────────────────────────────────────────────────────
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {}

    const batchId = body.batchId || '22_23';
    const semester = body.semester === 'all' || body.semester === undefined ? 'all' : Number(body.semester) || 'all';
    const dryRun = Boolean(body.dryRun);
    const sheetUrl = typeof body.sheetUrl === 'string' && body.sheetUrl.trim() ? body.sheetUrl.trim() : undefined;

    // ── 3. Administrative RBAC Check ──────────────────────────────────────────
    const adminScope = await getAdminScope(email);
    if (!adminScope.isAdmin) {
      console.warn(`[API /admin/sync] Non-admin access attempt by ${email}`);
      return NextResponse.json(
        { error: 'Forbidden: You do not have administrator permissions.' },
        { status: 403 }
      );
    }

    // Verify batch authorization
    if (!adminScope.isSuperAdmin && !adminScope.allowedBatches.includes(batchId)) {
      console.warn(`[API /admin/sync] Unauthorized batch sync attempt by ${email} for batch ${batchId}`);
      return NextResponse.json(
        { error: `Forbidden: You do not have administrator permissions for batch ${batchId}.` },
        { status: 403 }
      );
    }

    // ── 4. Concurrency Lock Guard per Batch ────────────────────────────────────
    const now = Date.now();
    activeLockKey = batchId;
    if (activeSyncLocks[batchId] && now - activeSyncLocks[batchId] < 60000) {
      return NextResponse.json(
        { error: `A database synchronization for batch ${batchId} is already actively running. Please wait.` },
        { status: 409 }
      );
    }

    activeSyncLocks[batchId] = now;

    console.log(`[API /admin/sync] Admin ${email} initiated sync (Batch: ${batchId}, Semester: ${semester}, DryRun: ${dryRun})`);

    // ── 5. Run Sync Engine ───────────────────────────────────────────────────
    const result = await runSyncEngine({
      batchId,
      semester,
      dryRun,
      sheetUrl,
      syncedBy: email,
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
    if (activeLockKey) {
      delete activeSyncLocks[activeLockKey];
    }
  }
}
