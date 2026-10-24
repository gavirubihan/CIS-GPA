/**
 * /api/admin/batches
 * ===================
 * Endpoint to list and update batch configurations (Google Sheet URLs, batch admins).
 *
 * Security:
 *  - Cryptographic token verification via Firebase Admin SDK
 *  - Super Admins can manage all batches
 *  - Batch Admins can only view and update their assigned batches
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, verifyIdToken, getAdminScope, getBatchConfig } from '@/lib/firebase-admin';
import { SUPPORTED_BATCHES, DEFAULT_22_SHEET_URL } from '@/lib/batch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    const email = decoded.email ?? '';

    const adminScope = await getAdminScope(email);
    if (!adminScope.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = adminDb;
    const snap = await db.collection('batches').get();
    const batchesMap: Record<string, any> = {};

    snap.forEach((doc) => {
      batchesMap[doc.id] = { id: doc.id, ...doc.data() };
    });

    // Ensure default batches exist in the response
    for (const [batchId, meta] of Object.entries(SUPPORTED_BATCHES)) {
      if (!batchesMap[batchId]) {
        batchesMap[batchId] = await getBatchConfig(batchId);
      }
    }

    // Filter to allowed batches if not Super Admin
    let resultBatches = Object.values(batchesMap);
    if (!adminScope.isSuperAdmin) {
      resultBatches = resultBatches.filter((b) => adminScope.allowedBatches.includes(b.id));
    }

    return NextResponse.json({
      batches: resultBatches,
      isSuperAdmin: adminScope.isSuperAdmin,
      allowedBatches: adminScope.allowedBatches,
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json({ error: e.message || 'Server error' }, { status: e.status || 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const decoded = await verifyIdToken(req.headers.get('Authorization'));
    const email = decoded.email ?? '';

    const adminScope = await getAdminScope(email);
    if (!adminScope.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { batchId, googleSheetUrl, adminEmails } = body;

    if (!batchId || typeof batchId !== 'string') {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    if (!adminScope.isSuperAdmin && !adminScope.allowedBatches.includes(batchId)) {
      return NextResponse.json(
        { error: `Forbidden: You do not have permissions to modify batch ${batchId}` },
        { status: 403 }
      );
    }

    const updates: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (typeof googleSheetUrl === 'string' && googleSheetUrl.trim()) {
      updates.googleSheetUrl = googleSheetUrl.trim();
    }

    // Only Super Admins can update admin assignments
    if (Array.isArray(adminEmails) && adminScope.isSuperAdmin) {
      updates.adminEmails = adminEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean);
    }

    const db = adminDb;
    await db.collection('batches').doc(batchId).set(updates, { merge: true });

    return NextResponse.json({ ok: true, batchId, updates });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json({ error: e.message || 'Server error' }, { status: e.status || 500 });
  }
}
