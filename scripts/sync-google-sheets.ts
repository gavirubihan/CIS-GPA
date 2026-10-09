/**
 * Google Sheets Firestore Sync Script
 * =====================================
 * Professional, robust synchronization tool to import semester results
 * from the official Google Sheets results spreadsheet into Firebase Firestore.
 *
 * Supports Semesters 1 through 8 individually or all at once:
 *   - Fetches live directly from Google Sheets or reads a local .xlsx file
 *   - Smart sheet resolver (matches "Semester 3", "Semester III", "Sem 3", etc.)
 *   - Intelligently merges semester results preserving past semester grades
 *   - Normalizes course codes (e.g. IS-EAP-2101 -> IS-EAP2101) to match courseData.ts
 *   - Validates student registration numbers and grade formats
 *   - Batches Firestore operations safely (< 400 ops per commit)
 *   - Updates student academic year (Year 1: Sem 1-2, Year 2: Sem 3-4, Year 3: Sem 5-6, Year 4: Sem 7-8)
 *   - Comprehensive --dry-run mode for pre-commit verification
 *   - Detailed summary table and audit logging
 *
 * Usage:
 *   npm run sync:sem3
 *   npm run sync:sem3:dry
 *   npm run sync:all
 *   npx tsx scripts/sync-google-sheets.ts --semester 4
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue, WriteBatch } from 'firebase-admin/firestore';
import * as xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Default Configuration ───────────────────────────────────────────────────
const DEFAULT_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1Xq3tsyEkLwBTO7EsFruHdlbXBwETdCOQGSdlZrWzZdo/edit?usp=sharing';
const UNIVERSITY_DOMAIN = 'ms.sab.ac.lk';
const BATCH_SIZE = 400;

// Valid letter grades according to university regulations & Firestore rules
const VALID_GRADES = new Set([
  'A+', 'A', 'A-',
  'B+', 'B', 'B-',
  'C+', 'C', 'C-',
  'D+', 'D',
  'E'
]);

// Roman numeral mappings for semesters
const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
};

// ── Firebase Admin Initialization ───────────────────────────────────────────
function initFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    return initializeApp({
      credential: cert(sa),
      projectId: sa.project_id || process.env.FIREBASE_PROJECT_ID,
    });
  }

  // Fallback to .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) {
        let val = match[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        env[match[1]] = val;
      }
    }

    const projectId = env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    let rawKey = env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && rawKey) {
      if (!rawKey.includes('-----BEGIN') && rawKey.length > 200) {
        try {
          const decoded = Buffer.from(rawKey, 'base64').toString('utf-8');
          if (decoded.includes('-----BEGIN')) rawKey = decoded;
        } catch (_) {}
      }

      const privateKey = rawKey
        .replace(/\\r/g, '')
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n');

      return initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
    }
  }

  throw new Error(
    '❌ Missing Firebase credentials. Place scripts/serviceAccountKey.json or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local'
  );
}

// ── Course code & grade helpers ──────────────────────────────────────────────
function fixCourseCode(rawCode: string): string {
  const trimmed = rawCode.trim().toUpperCase();
  // Transform IS-EAP-2101 -> IS-EAP2101, IS-EGP-1101 -> IS-EGP1101, IS-EAP-2201 -> IS-EAP2201
  return trimmed.replace(/^(IS-[A-Z]+)-(\d+)$/, '$1$2');
}

function normalizeGrade(rawVal: unknown): string | null {
  if (rawVal === null || rawVal === undefined) return null;
  const str = String(rawVal).trim().toUpperCase();
  if (VALID_GRADES.has(str)) return str;
  // Non-letter grades (AB = absent, MC = medical, HOLD = withheld)
  return null;
}

function getProgramme(regNo: string): 'CIS' | 'FIS' {
  const upper = regNo.toUpperCase();
  return upper.includes('FIS') ? 'FIS' : 'CIS';
}

function isValidRegNo(regNo: string): boolean {
  return /^\d{2}(CIS|FIS)\d{3,5}$/i.test(regNo);
}

// ── Smart sheet resolver ────────────────────────────────────────────────────
function resolveSheetName(workbook: xlsx.WorkBook, semInput: number | string): string | null {
  const availableSheets = workbook.SheetNames;
  const num = typeof semInput === 'number' ? semInput : parseInt(String(semInput).replace(/\D/g, ''), 10);

  if (!isNaN(num) && num >= 1 && num <= 8) {
    const roman = ROMAN_NUMERALS[num] || '';
    const candidatePatterns = [
      `Semester ${num}`,
      `Semester ${roman}`,
      `Sem ${num}`,
      `Sem ${roman}`,
      `Semester${num}`,
      `Sem${num}`,
      `Semester ${num.toString().padStart(2, '0')}`,
      `Sem ${num.toString().padStart(2, '0')}`,
    ];

    for (const pattern of candidatePatterns) {
      const match = availableSheets.find(
        (s) => s.trim().toLowerCase() === pattern.toLowerCase()
      );
      if (match) return match;
    }
  }

  // Fallback to literal name match (case-insensitive)
  const inputStr = String(semInput).trim().toLowerCase();
  return (
    availableSheets.find((s) => s.trim().toLowerCase() === inputStr) || null
  );
}

// ── Download Google Sheet as XLSX ───────────────────────────────────────────
async function downloadSpreadsheet(sheetUrl: string, destinationPath: string): Promise<void> {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error(`Invalid Google Sheets URL format: ${sheetUrl}`);
  }
  const spreadsheetId = match[1];
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

  console.log(`🌐 Downloading Google Spreadsheet (ID: ${spreadsheetId})…`);
  const response = await fetch(exportUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CIS-GPA-Sync-Bot/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download spreadsheet: HTTP ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(destinationPath, Buffer.from(arrayBuffer));
  console.log(`💾 Saved spreadsheet to ${destinationPath} (${arrayBuffer.byteLength} bytes)`);
}

// ── Sheet Row Model ──────────────────────────────────────────────────────────
export interface ParsedStudentGrades {
  regNo: string;
  name: string;
  grades: Record<string, string>;
  absentCourses: string[];
}

export interface SheetParseResult {
  sheetName: string;
  semesterNumber: number;
  students: ParsedStudentGrades[];
  courseHeaders: string[];
  courseStats: Record<string, { validGrades: number; absent: number; empty: number }>;
  totalValidGrades: number;
}

// ── Parse Sheet ─────────────────────────────────────────────────────────────
function parseSemesterSheet(
  workbook: xlsx.WorkBook,
  resolvedSheetName: string,
  semesterNumber: number
): SheetParseResult {
  const ws = workbook.Sheets[resolvedSheetName];
  if (!ws) {
    throw new Error(`Sheet "${resolvedSheetName}" not found in workbook.`);
  }

  const rawData: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
  if (rawData.length < 2) {
    return {
      sheetName: resolvedSheetName,
      semesterNumber,
      students: [],
      courseHeaders: [],
      courseStats: {},
      totalValidGrades: 0,
    };
  }

  const headerRow = rawData[0] as string[];
  const courseHeaders: string[] = [];
  const colIndexMap: { col: number; code: string }[] = [];

  for (let c = 2; c < headerRow.length; c++) {
    const rawCode = headerRow[c];
    if (rawCode && String(rawCode).trim()) {
      const fixedCode = fixCourseCode(String(rawCode));
      courseHeaders.push(fixedCode);
      colIndexMap.push({ col: c, code: fixedCode });
    }
  }

  const courseStats: Record<string, { validGrades: number; absent: number; empty: number }> = {};
  for (const h of courseHeaders) {
    courseStats[h] = { validGrades: 0, absent: 0, empty: 0 };
  }

  const students: ParsedStudentGrades[] = [];
  let totalValidGrades = 0;

  for (let r = 1; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row || !row[0]) continue;

    const rawRegNo = String(row[0]).trim().toUpperCase();
    if (!isValidRegNo(rawRegNo)) continue;

    const name = String(row[1] || '').trim();
    const grades: Record<string, string> = {};
    const absentCourses: string[] = [];

    for (const { col, code } of colIndexMap) {
      const cellVal = row[col];
      const normalized = normalizeGrade(cellVal);
      const strVal = cellVal !== null && cellVal !== undefined ? String(cellVal).trim().toUpperCase() : '';

      if (normalized) {
        grades[code] = normalized;
        courseStats[code].validGrades++;
        totalValidGrades++;
      } else if (strVal === 'AB') {
        absentCourses.push(code);
        courseStats[code].absent++;
      } else {
        courseStats[code].empty++;
      }
    }

    students.push({
      regNo: rawRegNo,
      name,
      grades,
      absentCourses,
    });
  }

  return {
    sheetName: resolvedSheetName,
    semesterNumber,
    students,
    courseHeaders,
    courseStats,
    totalValidGrades,
  };
}

// ── Main Synchronization Runner ─────────────────────────────────────────────
export async function runSync(options: {
  semester: number | string;
  sheetUrl?: string;
  filePath?: string;
  dryRun?: boolean;
}) {
  const { semester, dryRun = false } = options;
  const sheetUrl = options.sheetUrl || DEFAULT_SPREADSHEET_URL;

  console.log('\n=============================================================');
  console.log(` 🚀 CIS GPA CALCULATOR - FIRESTORE SYNC BOT`);
  console.log(`    Target: ${semester === 'all' ? 'All Semesters' : `Semester ${semester}`} | Mode: ${dryRun ? '🔍 DRY RUN (NO WRITES)' : '⚡ LIVE SYNC'}`);
  console.log('=============================================================\n');

  // 1. Download or locate workbook
  let targetFile = options.filePath;
  if (!targetFile) {
    const tempDir = path.join(__dirname, '..', '.cache');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    targetFile = path.join(tempDir, 'latest_results.xlsx');
    await downloadSpreadsheet(sheetUrl, targetFile);
  }

  // 2. Read workbook
  const workbook = xlsx.readFile(targetFile);
  console.log(`📁 Available sheets in workbook: ${workbook.SheetNames.join(', ')}`);

  // Determine list of semesters to parse
  const semestersToSync: { sheetName: string; semNum: number }[] = [];

  if (semester === 'all') {
    for (let sem = 1; sem <= 8; sem++) {
      const match = resolveSheetName(workbook, sem);
      if (match) {
        semestersToSync.push({ sheetName: match, semNum: sem });
      }
    }
    if (semestersToSync.length === 0) {
      throw new Error(`No semester sheets found in workbook. Available: ${workbook.SheetNames.join(', ')}`);
    }
  } else {
    const semNum = typeof semester === 'number' ? semester : parseInt(String(semester).replace(/\D/g, ''), 10);
    const resolved = resolveSheetName(workbook, semester);
    if (!resolved) {
      throw new Error(
        `❌ Could not find sheet for Semester "${semester}". Available sheets: ${workbook.SheetNames.join(', ')}`
      );
    }
    semestersToSync.push({ sheetName: resolved, semNum: isNaN(semNum) ? 1 : semNum });
  }

  // 3. Parse all target sheets
  const parsedResults: SheetParseResult[] = [];
  for (const item of semestersToSync) {
    console.log(`\n📄 Parsing "${item.sheetName}" (Semester ${item.semNum})…`);
    const res = parseSemesterSheet(workbook, item.sheetName, item.semNum);
    parsedResults.push(res);

    console.log(`  ✅ Found ${res.students.length} students, ${res.totalValidGrades} valid grade entries.`);
    console.log(`  📚 Courses: ${res.courseHeaders.join(', ') || 'None'}`);

    if (res.courseHeaders.length > 0) {
      console.table(
        Object.entries(res.courseStats).map(([course, stats]) => ({
          Course: course,
          'Valid Grades': stats.validGrades,
          Absent: stats.absent,
          'Empty / Pending': stats.empty,
        }))
      );
    }
  }

  // 4. Connect to Firestore
  initFirebaseAdmin();
  const db = getFirestore();

  console.log('\n🔍 Reading current student records from Firestore…');
  const firestoreSnap = await db.collection('students').get();
  const existingDocs = new Map<string, any>();
  firestoreSnap.forEach((doc) => existingDocs.set(doc.id, doc.data()));
  console.log(`✅ Loaded ${existingDocs.size} existing student documents from Firestore.`);

  // 5. Aggregate changes across all parsed semester sheets
  // Map of regNo -> cumulative updates
  interface AggregatedStudentPlan {
    regNo: string;
    name: string;
    newGrades: Record<string, string>;
    overwrittenGrades: Record<string, { oldVal: string; newVal: string }>;
    finalYear: number;
    isNewDoc: boolean;
  }

  const studentPlans = new Map<string, AggregatedStudentPlan>();

  for (const sheetRes of parsedResults) {
    const semTargetYear = Math.ceil(sheetRes.semesterNumber / 2);

    for (const student of sheetRes.students) {
      let plan = studentPlans.get(student.regNo);
      if (!plan) {
        const existing = existingDocs.get(student.regNo);
        const existingYear = existing?.year || 1;
        plan = {
          regNo: student.regNo,
          name: student.name,
          newGrades: {},
          overwrittenGrades: {},
          finalYear: existing ? Math.max(existingYear, semTargetYear) : semTargetYear,
          isNewDoc: !existing,
        };
        studentPlans.set(student.regNo, plan);
      }

      const existing = existingDocs.get(student.regNo);
      const existingGrades: Record<string, string> = existing?.grades || {};

      for (const [courseCode, grade] of Object.entries(student.grades)) {
        if (existingGrades[courseCode] === undefined) {
          plan.newGrades[courseCode] = grade;
        } else if (existingGrades[courseCode] !== grade) {
          plan.overwrittenGrades[courseCode] = {
            oldVal: existingGrades[courseCode],
            newVal: grade,
          };
        }
      }

      // If sheet has valid grades for this semester, ensure student's year is at least this semester's year
      if (sheetRes.totalValidGrades > 0) {
        plan.finalYear = Math.max(plan.finalYear, semTargetYear);
      }
    }
  }

  // 6. Build Firestore batch writes
  interface PlannedUpdate {
    ref: FirebaseFirestore.DocumentReference;
    data: any;
    diff: {
      regNo: string;
      newGradesCount: number;
      overwrittenCount: number;
      details: string[];
    };
  }

  const plannedUpdates: PlannedUpdate[] = [];
  let studentsUpdated = 0;
  let studentsCreated = 0;
  let totalGradesAdded = 0;
  let totalGradesOverwritten = 0;

  for (const [regNo, plan] of studentPlans) {
    const existing = existingDocs.get(regNo);
    const existingGrades: Record<string, string> = existing?.grades || {};

    const newKeys = Object.keys(plan.newGrades);
    const overwrittenKeys = Object.keys(plan.overwrittenGrades);

    if (newKeys.length === 0 && overwrittenKeys.length === 0 && (!existing || existing.year >= plan.finalYear)) {
      continue;
    }

    const mergedGrades: Record<string, string> = {
      ...existingGrades,
      ...plan.newGrades,
      ...Object.fromEntries(
        Object.entries(plan.overwrittenGrades).map(([k, v]) => [k, v.newVal])
      ),
    };

    const diffDetails: string[] = [];
    for (const [code, grade] of Object.entries(plan.newGrades)) {
      diffDetails.push(`+ ${code}: ${grade}`);
    }
    for (const [code, { oldVal, newVal }] of Object.entries(plan.overwrittenGrades)) {
      diffDetails.push(`~ ${code}: ${oldVal} → ${newVal}`);
    }

    const docRef = db.collection('students').doc(regNo);

    if (plan.isNewDoc) {
      const email = `${regNo.toLowerCase()}@${UNIVERSITY_DOMAIN}`;
      plannedUpdates.push({
        ref: docRef,
        data: {
          regNo,
          nameWithInitials: plan.name,
          fullName: plan.name,
          email,
          programme: getProgramme(regNo),
          year: plan.finalYear,
          grades: mergedGrades,
          selectedElectives: {},
          lastUpdated: FieldValue.serverTimestamp(),
          isSeeded: true,
          isModifiedByStudent: false,
        },
        diff: {
          regNo,
          newGradesCount: newKeys.length,
          overwrittenCount: overwrittenKeys.length,
          details: ['[NEW STUDENT RECORD]', ...diffDetails],
        },
      });
      studentsCreated++;
    } else {
      plannedUpdates.push({
        ref: docRef,
        data: {
          grades: mergedGrades,
          year: Math.max(existing.year || 1, plan.finalYear),
          lastUpdated: FieldValue.serverTimestamp(),
        },
        diff: {
          regNo,
          newGradesCount: newKeys.length,
          overwrittenCount: overwrittenKeys.length,
          details: diffDetails,
        },
      });
      studentsUpdated++;
    }

    totalGradesAdded += newKeys.length;
    totalGradesOverwritten += overwrittenKeys.length;
  }

  // 7. Display diff preview
  console.log('\n📝 Summary of Planned Changes:');
  console.log(`  - Students with new or updated grades: ${studentsUpdated}`);
  console.log(`  - Brand new students to create: ${studentsCreated}`);
  console.log(`  - Total new grade entries to insert: ${totalGradesAdded}`);
  console.log(`  - Total existing grade entries to overwrite: ${totalGradesOverwritten}`);

  if (plannedUpdates.length > 0) {
    console.log('\n🔍 Sample Diff Preview (first 5 students):');
    plannedUpdates.slice(0, 5).forEach((item) => {
      console.log(`  [${item.diff.regNo}]: ${item.diff.details.join(', ') || 'Year updated'}`);
    });
    if (plannedUpdates.length > 5) {
      console.log(`  … and ${plannedUpdates.length - 5} more students`);
    }
  }

  // 8. Commit to Firestore if not dry-run
  if (dryRun) {
    console.log('\n🔒 DRY RUN MODE COMPLETE: No changes were written to Firestore.');
    console.log('💡 Run without --dry-run to commit these changes.');
    return;
  }

  if (plannedUpdates.length === 0) {
    console.log('\n✨ Firestore is already 100% up to date with the selected semester(s). Nothing to write.');
    return;
  }

  console.log(`\n📤 Executing Firestore batch writes for ${plannedUpdates.length} records…`);
  let committedBatches = 0;

  for (let i = 0; i < plannedUpdates.length; i += BATCH_SIZE) {
    const chunk = plannedUpdates.slice(i, i + BATCH_SIZE);
    const batch: WriteBatch = db.batch();

    for (const update of chunk) {
      batch.set(update.ref, update.data, { merge: true });
    }

    await batch.commit();
    committedBatches++;
    console.log(
      `  ⬆ Batch ${committedBatches}: Committed ${Math.min(i + BATCH_SIZE, plannedUpdates.length)} / ${plannedUpdates.length} records`
    );
  }

  console.log('\n🎉 SUCCESS: All semester results synchronized to Firestore cleanly and safely!');
  console.log('Students will see their updated grades immediately upon next login.\n');
}

// ── CLI Execution ────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  let semester: number | string = 3;
  let dryRun = false;
  let sheetUrl: string | undefined = undefined;
  let filePath: string | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--all' || arg === '-a') {
      semester = 'all';
    } else if (arg === '--semester' || arg === '-s') {
      const val = args[++i];
      semester = val === 'all' ? 'all' : parseInt(val, 10) || val;
    } else if (arg === '--url' || arg === '-u') {
      sheetUrl = args[++i];
    } else if (arg === '--file' || arg === '-f') {
      filePath = args[++i];
    }
  }

  await runSync({ semester, dryRun, sheetUrl, filePath });
}

// Only run automatically if invoked as a CLI script
if (process.argv[1] && process.argv[1].endsWith('sync-google-sheets.ts')) {
  main().catch((err) => {
    console.error('\n❌ Sync Failed:', err);
    process.exit(1);
  });
}
