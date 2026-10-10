/**
 * Firestore Seeding Script
 * ========================
 * Reads student grades from the Excel file and uploads to Firestore.
 *
 * Usage:
 *   npx ts-node --esm scripts/seed-firestore.ts
 *   (or: npx tsx scripts/seed-firestore.ts)
 *
 * Prerequisites:
 *   npm install -D tsx xlsx firebase-admin
 *   Place your Firebase service account key at: scripts/serviceAccountKey.json
 */

import * as xlsx from 'xlsx';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Firebase Admin Init ───────────────────────────────────────────────────────
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

  // Fallback to .env.local
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
const UNIVERSITY_DOMAIN = 'ms.sab.ac.lk';

// ── Grade normalization ───────────────────────────────────────────────────────
const VALID_GRADES = new Set(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E']);

function normalizeGrade(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().toUpperCase();
  if (VALID_GRADES.has(trimmed)) return trimmed;
  // AB = absent, HOLD = withheld — treat as not graded
  return null;
}

// ── Column header → course code normalization ─────────────────────────────────
/** Fixes codes like IS-EGP-1101 → IS-EGP1101 to match courseData.ts */
function fixCode(code: string): string {
  return code.replace(/^(IS-[A-Z]+)-(\d+)$/, '$1$2');
}

// ── Parse a single sheet ───────────────────────────────────────────────────────
interface SheetRow {
  regNo: string;
  nameWithInitials: string;
  fullName?: string;
  grades: Record<string, string>;
  programme: 'CIS' | 'FIS';
}

function parseSheet(ws: xlsx.WorkSheet, programme: 'CIS' | 'FIS'): SheetRow[] {
  const rows: SheetRow[] = [];

  // Row 2 (index 1) = column headers
  // IS sheet has 3 name columns (col A=regNo, B=initials, C=full), CIS has 2 (col A=regNo, B=full)
  const hasFull = programme === 'FIS';

  // Extract headers from row 2
  const range = xlsx.utils.decode_range(ws['!ref'] ?? 'A1');
  const headerRow = 2; // 1-indexed
  const headers: string[] = [];
  for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[xlsx.utils.encode_cell({ r: headerRow - 1, c })];
    headers.push(cell ? String(cell.v ?? '').trim() : '');
  }

  // Data starts at row 3
  for (let r = 2; r <= range.e.r; r++) {
    const getCell = (c: number): unknown => {
      const cell = ws[xlsx.utils.encode_cell({ r, c })];
      return cell ? cell.v : null;
    };

    const regNo = String(getCell(0) ?? '').trim().toUpperCase();
    if (!regNo || regNo.length < 5) continue;

    const nameWithInitials = String(getCell(1) ?? '').trim();
    const fullName = hasFull ? String(getCell(2) ?? '').trim() : undefined;

    // Grade columns start at col 3 (IS) or col 2 (CIS)
    const gradeStartCol = hasFull ? 3 : 2;
    const grades: Record<string, string> = {};

    for (let c = gradeStartCol; c <= range.e.c; c++) {
      const rawCode = headers[c];
      if (!rawCode || rawCode === '') continue;

      const fixedCode = fixCode(rawCode);
      const rawGrade = getCell(c);
      const grade = normalizeGrade(rawGrade);
      if (grade) {
        grades[fixedCode] = grade;
      }
    }

    rows.push({ regNo, nameWithInitials, fullName, grades, programme });
  }

  return rows;
}

// ── Upload to Firestore ────────────────────────────────────────────────────────
async function seed() {
  const excelPath = path.join(__dirname, '..', 'Results Semester I,II-Department_of_CIS.xlsx');

  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Excel file not found: ${excelPath}`);
    process.exit(1);
  }

  console.log('📖 Reading Excel file…');
  const wb = xlsx.readFile(excelPath);

  const allRows: SheetRow[] = [];

  // Sheet "IS" → FIS students
  if (wb.SheetNames.includes('IS')) {
    const rows = parseSheet(wb.Sheets['IS'], 'FIS');
    console.log(`  ✅ IS sheet: ${rows.length} students`);
    allRows.push(...rows);
  }

  // Sheet "CIS" → CIS students
  if (wb.SheetNames.includes('CIS')) {
    const rows = parseSheet(wb.Sheets['CIS'], 'CIS');
    console.log(`  ✅ CIS sheet: ${rows.length} students`);
    allRows.push(...rows);
  }

  console.log('\n🔍 Reading existing student documents from Firestore to protect student modifications…');
  const existingSnap = await db.collection('students').get();
  const existingDocs = new Map<string, any>();
  existingSnap.forEach((doc) => existingDocs.set(doc.id, doc.data()));
  console.log(`  ✅ Loaded ${existingDocs.size} existing records from Firestore.`);

  console.log(`\n📤 Processing ${allRows.length} student records for Firestore seeding…`);

  // Batch write (max 500 per batch)
  const BATCH_SIZE = 400;
  let count = 0;
  let totalProtectedGrades = 0;
  let updatedExistingCount = 0;
  let createdNewCount = 0;

  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = allRows.slice(i, i + BATCH_SIZE);

    for (const student of chunk) {
      const email = `${student.regNo.toLowerCase()}@${UNIVERSITY_DOMAIN}`;
      const ref = db.collection('students').doc(student.regNo);
      const sheetGrades = { ...student.grades };
      const seededCourseList = Object.keys(sheetGrades).sort();
      const existing = existingDocs.get(student.regNo);

      if (!existing) {
        // Brand-new student record
        batch.set(ref, {
          regNo: student.regNo,
          nameWithInitials: student.nameWithInitials,
          fullName: student.fullName ?? student.nameWithInitials,
          email,
          programme: student.programme,
          year: 1,
          grades: sheetGrades,
          selectedElectives: {},
          lastUpdated: FieldValue.serverTimestamp(),
          isSeeded: seededCourseList.length > 0,
          seededCourses: seededCourseList,
          seededGrades: sheetGrades,
          isModifiedByStudent: false,
          studentModifiedCourses: [],
        }, { merge: true });

        createdNewCount++;
      } else {
        // 🛡️ Existing student: STUDENT SOVEREIGNTY RULE
        // The Google Sheet/Excel data is maintained unofficially and may contain errors or tentative entries.
        // If a student has already modified or entered their result for a course, their altered result
        // is considered authoritative for them. STOP SEEDING THIS COURSE RESULT TO THIS STUDENT.
        const existingGrades: Record<string, string> = existing.grades || {};
        const existingModifiedList: string[] = Array.isArray(existing.studentModifiedCourses)
          ? existing.studentModifiedCourses
          : [];
        const existingModifiedSet = new Set(existingModifiedList);

        const isCourseModified = (code: string): boolean => {
          if (existingModifiedSet.has(code)) return true;
          if (existing.seededGrades && existing.seededGrades[code] !== undefined) {
            return existingGrades[code] !== undefined && existingGrades[code] !== existing.seededGrades[code];
          }
          return false;
        };

        const mergedGrades: Record<string, string> = { ...existingGrades };
        let studentHasProtected = false;

        for (const [code, sheetGrade] of Object.entries(sheetGrades)) {
          if (isCourseModified(code)) {
            // STOP SEEDING! Student's modified result is authoritative — keep existing student grade!
            totalProtectedGrades++;
            studentHasProtected = true;
          } else {
            // Course was not modified by student -> safe to seed from Excel
            mergedGrades[code] = sheetGrade;
          }
        }

        // Recalculate studentModifiedCourses against the seeded sheet baseline
        const modifiedSet = new Set<string>();
        for (const [code, grade] of Object.entries(mergedGrades)) {
          const sheetVal = sheetGrades[code];
          if (sheetVal === undefined || sheetVal !== grade) {
            modifiedSet.add(code);
          }
        }
        for (const code of seededCourseList) {
          if (!(code in mergedGrades)) {
            modifiedSet.add(code);
          }
        }
        // Ensure previously modified courses remain tagged
        for (const code of existingModifiedList) {
          if (code in mergedGrades) {
            modifiedSet.add(code);
          }
        }

        const studentModifiedCourses = Array.from(modifiedSet).sort();

        batch.set(ref, {
          regNo: student.regNo,
          nameWithInitials: student.nameWithInitials || existing.nameWithInitials,
          fullName: student.fullName ?? existing.fullName ?? student.nameWithInitials,
          email,
          programme: student.programme,
          grades: mergedGrades,
          lastUpdated: FieldValue.serverTimestamp(),
          isSeeded: seededCourseList.length > 0,
          seededCourses: seededCourseList,
          seededGrades: sheetGrades,
          isModifiedByStudent: studentModifiedCourses.length > 0,
          studentModifiedCourses,
        }, { merge: true });

        updatedExistingCount++;
      }

      count++;
    }

    await batch.commit();
    console.log(`  ⬆ Uploaded ${Math.min(i + BATCH_SIZE, allRows.length)} / ${allRows.length}`);
  }

  console.log('\n✅ Seeding complete!');
  console.log(`  - Total records processed: ${count}`);
  console.log(`  - Brand new student records created: ${createdNewCount}`);
  console.log(`  - Existing student records updated: ${updatedExistingCount}`);
  console.log(`  - 🛡️ Student-modified course grades protected (sheet overwrite stopped): ${totalProtectedGrades}`);
  console.log('🎉 Seeding finished safely without overwriting student modifications.');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
