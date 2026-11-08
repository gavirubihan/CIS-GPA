/**
 * Batch Admin Assignment Script
 * =============================
 * Add or remove batch-scoped admins in Firestore.
 *
 * Usage:
 *   # View current batch admins:
 *   npx tsx scripts/set-batch-admin.ts --list
 *
 *   # Add an admin to a batch:
 *   npx tsx scripts/set-batch-admin.ts --add 23_24 student@ms.sab.ac.lk
 *
 *   # Remove an admin from a batch:
 *   npx tsx scripts/set-batch-admin.ts --remove 23_24 student@ms.sab.ac.lk
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
    const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    return initializeApp({
      credential: cert(sa),
      projectId: sa.project_id || process.env.FIREBASE_PROJECT_ID,
    });
  }

  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
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

  console.error('❌ Missing Firebase credentials.');
  process.exit(1);
}

initFirebaseAdmin();
const db = getFirestore();

async function run() {
  const args = process.argv.slice(2);
  const action = args[0];

  if (!action || action === '--help' || action === '-h') {
    console.log(`
Usage:
  npx tsx scripts/set-batch-admin.ts --list
  npx tsx scripts/set-batch-admin.ts --add <batchId> <email>
  npx tsx scripts/set-batch-admin.ts --remove <batchId> <email>

Examples:
  npx tsx scripts/set-batch-admin.ts --list
  npx tsx scripts/set-batch-admin.ts --add 23_24 23fis0638@ms.sab.ac.lk
    `);
    return;
  }

  if (action === '--list') {
    const snap = await db.collection('batches').get();
    console.log('\n📋 Current Cohort Configurations & Batch Admins:\n');
    snap.forEach((doc) => {
      const data = doc.data();
      console.log(`Batch: ${doc.id} (${data.label || 'Unnamed'})`);
      console.log(`  • Google Sheet: ${data.googleSheetUrl || '(not configured)'}`);
      const admins = Array.isArray(data.adminEmails) ? data.adminEmails : [];
      if (admins.length === 0) {
        console.log(`  • Batch Admins: (none assigned)`);
      } else {
        console.log(`  • Batch Admins (${admins.length}):`);
        admins.forEach((email: string) => console.log(`      - ${email}`));
      }
      console.log('');
    });
    return;
  }

  const batchId = args[1];
  const email = (args[2] || '').trim().toLowerCase();

  if (!batchId || !email) {
    console.error('❌ Please specify both <batchId> and <email>. Example:');
    console.error('   npx tsx scripts/set-batch-admin.ts --add 23_24 student@ms.sab.ac.lk');
    process.exit(1);
  }

  const batchRef = db.collection('batches').doc(batchId);
  const snap = await batchRef.get();

  if (!snap.exists) {
    console.error(`❌ Batch document batches/${batchId} not found in Firestore.`);
    process.exit(1);
  }

  const data = snap.data() || {};
  let admins: string[] = Array.isArray(data.adminEmails)
    ? data.adminEmails.map((e: string) => String(e).trim().toLowerCase())
    : [];

  if (action === '--add') {
    if (admins.includes(email)) {
      console.log(`ℹ️ ${email} is already an admin for batch ${batchId}.`);
      return;
    }
    admins.push(email);
    await batchRef.update({
      adminEmails: admins,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`✅ Successfully assigned ${email} as admin for batch ${batchId}.`);
  } else if (action === '--remove') {
    if (!admins.includes(email)) {
      console.log(`ℹ️ ${email} is not an admin for batch ${batchId}.`);
      return;
    }
    admins = admins.filter((e) => e !== email);
    await batchRef.update({
      adminEmails: admins,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`✅ Successfully removed ${email} from batch ${batchId} admins.`);
  } else {
    console.error(`❌ Unknown action: ${action}. Use --add, --remove, or --list.`);
  }
}

run().catch((err) => {
  console.error('❌ Error:', err?.message || err);
  process.exit(1);
});
