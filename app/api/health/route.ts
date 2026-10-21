import { NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb, getAdminInitError } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const envCheck = {
    nodeVersion: process.version,
    hasProjectId: Boolean(process.env.FIREBASE_PROJECT_ID),
    hasClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
    hasPrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
    privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length ?? 0,
    hasAdminEmails: Boolean(process.env.ADMIN_EMAILS),
    adminEmailsCount: (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean).length,
  };

  let firebaseStatus = 'untested';
  let firebaseError: string | null = null;

  try {
    const app = getAdminApp();
    if (!app) {
      firebaseStatus = 'failed_initialization';
      firebaseError = getAdminInitError();
    } else {
      const auth = getAdminAuth();
      const db = getAdminDb();
      firebaseStatus = auth && db ? 'ready' : 'incomplete';
    }
  } catch (err: unknown) {
    const e = err as { message?: string };
    firebaseStatus = 'exception';
    firebaseError = e?.message || String(err);
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: envCheck,
    firebase: {
      status: firebaseStatus,
      error: firebaseError,
    },
  });
}
