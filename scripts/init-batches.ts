/**
 * Batch Initialization Script
 * ===========================
 * Pre-populates the `batches` collection in Firestore with default cohort settings.
 * Uses `{ merge: true }` so it never overwrites existing configurations or sync records.
 *
 * Usage:
 *   npx tsx scripts/init-batches.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function initFirebaseAdmin() {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    console.log('🔑 Reading credentials from scripts/serviceAccountKey.json');
    const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    return initializeApp({
      credential: cert(sa),
      projectId: sa.project_id || process.env.FIREBASE_PROJECT_ID,
    });
  }

  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    console.log('🔑 Reading credentials from .env.local');
    const raw = fs.readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        env[match[1]] = val.replace(/\\n/g, '\n');
      }
    }

    const projectId = env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      return initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
    }
  }

  console.error(
    '❌ Missing Firebase credentials.\n' +
    '   Either place scripts/serviceAccountKey.json or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local'
  );
  process.exit(1);
}

initFirebaseAdmin();

const db = getFirestore();

const DEFAULT_BATCHES = [
  {
    id: '22_23',
    label: '2022/2023 Batch',
    prefix: '22',
    programmes: ['CIS', 'FIS'],
    googleSheetUrl:
      'https://docs.google.com/spreadsheets/d/1Xq3tsyEkLwBTO7EsFruHdlbXBwETdCOQGSdlZrWzZdo/edit?usp=sharing',
    adminEmails: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: '23_24',
    label: '2023/2024 Batch',
    prefix: '23',
    programmes: ['CIS', 'FIS'],
    googleSheetUrl: '',
    adminEmails: [],
    createdAt: new Date().toISOString(),
  },
];

async function run() {
  console.log('🚀 Initializing batches in Firestore...');

  for (const b of DEFAULT_BATCHES) {
    const docRef = db.collection('batches').doc(b.id);
    const snap = await docRef.get();

    if (!snap.exists) {
      await docRef.set(
        {
          ...b,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`✅ Created batch doc: batches/${b.id}`);
    } else {
      console.log(`ℹ️ Batch batches/${b.id} already exists. Leaving untouched.`);
    }
  }

  console.log('🎉 Batch initialization complete.');
}

run().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
