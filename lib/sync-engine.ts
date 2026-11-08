/**
 * Core Google Sheets Synchronization Engine
 * ==========================================
 * High-performance, in-memory spreadsheet ingestion and Firestore sync engine.
 *
 * Designed to be safely invoked from:
 *   1. Next.js Serverless API routes (app/api/admin/sync/route.ts)
 *   2. CLI scripts (scripts/sync-google-sheets.ts)
 *
 * Key guarantees:
 *   - Zero disk dependencies: parses workbooks directly in memory.
 *   - Student Sovereignty: preserves grades that students have customized.
 *   - Granular dry-run mode: generates diff previews before committing.
 *   - Atomic Firestore batches: commits safely in chunks <= 400 ops.
 */

import { FieldValue, WriteBatch } from 'firebase-admin/firestore';
import * as xlsx from 'xlsx';
import { getAdminDb, getBatchConfig, UNIVERSITY_DOMAIN, VALID_GRADES } from './firebase-admin';
import { SyncResult, SyncDiffPreview } from '../types';
import { getBatchFromRegNo } from './batch';

export const DEFAULT_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1Xq3tsyEkLwBTO7EsFruHdlbXBwETdCOQGSdlZrWzZdo/edit?usp=sharing';

const BATCH_SIZE = 400;

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

// ── Course & Grade Helpers ───────────────────────────────────────────────────

function fixCourseCode(rawCode: string): string {
  const trimmed = rawCode.trim().toUpperCase();
  return trimmed.replace(/^(IS-[A-Z]+)-(\d+)$/, '$1$2');
}

function normalizeGrade(rawVal: unknown): string | null {
  if (rawVal === null || rawVal === undefined) return null;
  const str = String(rawVal).trim().toUpperCase();
  if (VALID_GRADES.has(str)) return str;
  return null;
}

function getProgramme(regNo: string): 'CIS' | 'FIS' {
  const upper = regNo.toUpperCase();
  return upper.includes('FIS') ? 'FIS' : 'CIS';
}

function isValidRegNo(regNo: string): boolean {
  return /^\d{2}(CIS|FIS)\d{3,5}$/i.test(regNo);
}

// ── Sheet Name Resolution ───────────────────────────────────────────────────

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

  const inputStr = String(semInput).trim().toLowerCase();
  return availableSheets.find((s) => s.trim().toLowerCase() === inputStr) || null;
}

// ── In-Memory Spreadsheet Fetcher ───────────────────────────────────────────

async function fetchSpreadsheetBuffer(sheetUrl: string): Promise<Buffer> {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error(`Invalid Google Sheets URL format: ${sheetUrl}`);
  }
  const spreadsheetId = match[1];
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(exportUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CIS-GPA-Sync-Bot/2.0',
      },
    });

    if (!res.ok) {
      throw new Error(`Google Sheets export returned HTTP ${res.status}: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Sheet Row Model ──────────────────────────────────────────────────────────

interface ParsedStudentGrades {
  regNo: string;
  name: string;
  grades: Record<string, string>;
  absentCourses: string[];
}

interface SheetParseResult {
  sheetName: string;
  semesterNumber: number;
  students: ParsedStudentGrades[];
  courseHeaders: string[];
  totalValidGrades: number;
}

function parseSemesterSheet(
  workbook: xlsx.WorkBook,
  resolvedSheetName: string,
  semesterNumber: number,
  batchPrefix?: string
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

  const students: ParsedStudentGrades[] = [];
  let totalValidGrades = 0;

  for (let r = 1; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row || !row[0]) continue;

    const rawRegNo = String(row[0]).trim().toUpperCase();
    if (!isValidRegNo(rawRegNo)) continue;

    // Filter to only targeted batch prefix if specified (e.g. "23" or "22")
    if (batchPrefix && !rawRegNo.startsWith(batchPrefix)) {
      continue;
    }

    const name = String(row[1] || '').trim();
    const grades: Record<string, string> = {};
    const absentCourses: string[] = [];

    for (const { col, code } of colIndexMap) {
      const cellVal = row[col];
      const normalized = normalizeGrade(cellVal);
      const strVal = cellVal !== null && cellVal !== undefined ? String(cellVal).trim().toUpperCase() : '';

      if (normalized) {
        grades[code] = normalized;
        totalValidGrades++;
      } else if (strVal === 'AB') {
        absentCourses.push(code);
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
    totalValidGrades,
  };
}

// ── Main Engine Runner ───────────────────────────────────────────────────────

export interface SyncEngineOptions {
  batchId?: string;
  semester: number | string;
  dryRun?: boolean;
  sheetUrl?: string;
  fileBuffer?: Buffer;
  syncedBy?: string;
}

export async function runSyncEngine(options: SyncEngineOptions): Promise<SyncResult> {
  const startTime = Date.now();
  const { semester, dryRun = false } = options;
  const batchId = options.batchId || '22_23';
  const batchConfig = await getBatchConfig(batchId);
  const rawSheetUrl = options.sheetUrl || batchConfig.googleSheetUrl;
  const sheetUrl = rawSheetUrl ? rawSheetUrl.trim() : (batchId === '22_23' ? DEFAULT_SPREADSHEET_URL : '');

  if (!sheetUrl) {
    throw new Error(
      `No Google Sheet URL configured for ${batchConfig.label || batchId}. Please configure and save the Google Sheet URL first in the sync settings.`
    );
  }

  // 1. Acquire Workbook Buffer
  let buffer: Buffer;
  if (options.fileBuffer) {
    buffer = options.fileBuffer;
  } else {
    buffer = await fetchSpreadsheetBuffer(sheetUrl);
  }

  // 2. Read Workbook
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetsFound: string[] = [];

  // 3. Resolve Target Semesters
  const semestersToSync: { sheetName: string; semNum: number }[] = [];

  if (semester === 'all') {
    for (let sem = 1; sem <= 8; sem++) {
      const match = resolveSheetName(workbook, sem);
      if (match) {
        semestersToSync.push({ sheetName: match, semNum: sem });
        sheetsFound.push(match);
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
        `Could not find sheet for Semester "${semester}". Available sheets: ${workbook.SheetNames.join(', ')}`
      );
    }
    semestersToSync.push({ sheetName: resolved, semNum: isNaN(semNum) ? 1 : semNum });
    sheetsFound.push(resolved);
  }

  // 4. Parse Sheets with Batch Prefix Filter
  const parsedResults: SheetParseResult[] = [];
  let totalValidGradesInSheets = 0;

  for (const item of semestersToSync) {
    const res = parseSemesterSheet(workbook, item.sheetName, item.semNum, batchConfig.prefix);
    parsedResults.push(res);
    totalValidGradesInSheets += res.totalValidGrades;
  }

  // 5. Connect to Firestore via Admin SDK
  const db = getAdminDb();
  if (!db) {
    throw new Error('Firestore Admin SDK is not initialized. Please verify FIREBASE_* environment variables.');
  }

  const firestoreSnap = await db.collection('students').get();
  const existingDocs = new Map<string, any>();
  firestoreSnap.forEach((doc) => existingDocs.set(doc.id, doc.data()));

  // 6. Aggregate Changes & Protect Student Sovereignty
  interface AggregatedStudentPlan {
    regNo: string;
    name: string;
    newGrades: Record<string, string>;
    overwrittenGrades: Record<string, { oldVal: string; newVal: string }>;
    protectedGrades: Record<string, { studentVal: string; sheetVal: string }>;
    sheetGrades: Record<string, string>;
    isNewDoc: boolean;
  }

  const studentPlans = new Map<string, AggregatedStudentPlan>();

  for (const sheetRes of parsedResults) {
    for (const student of sheetRes.students) {
      let plan = studentPlans.get(student.regNo);
      if (!plan) {
        const existing = existingDocs.get(student.regNo);
        plan = {
          regNo: student.regNo,
          name: student.name,
          newGrades: {},
          overwrittenGrades: {},
          protectedGrades: {},
          sheetGrades: {},
          isNewDoc: !existing,
        };
        studentPlans.set(student.regNo, plan);
      }

      const existing = existingDocs.get(student.regNo);
      const existingGrades: Record<string, string> = existing?.grades || {};
      const existingModifiedList: string[] = Array.isArray(existing?.studentModifiedCourses)
        ? existing.studentModifiedCourses
        : [];
      const existingModifiedSet = new Set(existingModifiedList);

      const isCourseModifiedByStudent = (code: string): boolean => {
        if (existingModifiedSet.has(code)) return true;
        if (existing?.seededGrades && existing.seededGrades[code] !== undefined) {
          return existingGrades[code] !== undefined && existingGrades[code] !== existing.seededGrades[code];
        }
        return false;
      };

      for (const [courseCode, sheetGrade] of Object.entries(student.grades)) {
        plan.sheetGrades[courseCode] = sheetGrade;

        if (existingGrades[courseCode] === undefined) {
          plan.newGrades[courseCode] = sheetGrade;
        } else if (isCourseModifiedByStudent(courseCode)) {
          // 🛡️ Student Sovereignty: preserve student's active result
          plan.protectedGrades[courseCode] = {
            studentVal: existingGrades[courseCode],
            sheetVal: sheetGrade,
          };
        } else if (existingGrades[courseCode] !== sheetGrade) {
          plan.overwrittenGrades[courseCode] = {
            oldVal: existingGrades[courseCode],
            newVal: sheetGrade,
          };
        }
      }
    }
  }

  // 7. Build Planned Updates
  interface PlannedUpdate {
    ref: FirebaseFirestore.DocumentReference;
    data: any;
    diff: SyncDiffPreview;
  }

  const plannedUpdates: PlannedUpdate[] = [];
  let studentsUpdated = 0;
  let studentsCreated = 0;
  let totalGradesAdded = 0;
  let totalGradesOverwritten = 0;
  let totalGradesProtected = 0;

  for (const [regNo, plan] of studentPlans) {
    const existing = existingDocs.get(regNo);
    const existingGrades: Record<string, string> = existing?.grades || {};
    const existingModifiedList: string[] = Array.isArray(existing?.studentModifiedCourses)
      ? existing.studentModifiedCourses
      : [];

    const newKeys = Object.keys(plan.newGrades);
    const overwrittenKeys = Object.keys(plan.overwrittenGrades);
    const protectedKeys = Object.keys(plan.protectedGrades);

    const existingSeededGrades: Record<string, string> =
      existing?.seededGrades || (existing?.isSeeded ? existingGrades : {});

    const hasNewSeededSnapshotEntries = Object.entries(plan.sheetGrades).some(
      ([c, g]) => existingSeededGrades[c] !== g
    );

    if (
      newKeys.length === 0 &&
      overwrittenKeys.length === 0 &&
      !hasNewSeededSnapshotEntries
    ) {
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
    for (const [code, { studentVal, sheetVal }] of Object.entries(plan.protectedGrades)) {
      diffDetails.push(`🛡️ [PROTECTED] ${code}: student "${studentVal}" kept (sheet: "${sheetVal}")`);
    }
    for (const [code, grade] of Object.entries(plan.newGrades)) {
      diffDetails.push(`+ ${code}: ${grade}`);
    }
    for (const [code, { oldVal, newVal }] of Object.entries(plan.overwrittenGrades)) {
      diffDetails.push(`~ ${code}: ${oldVal} → ${newVal}`);
    }

    const docRef = db.collection('students').doc(regNo);

    if (plan.isNewDoc) {
      const email = `${regNo.toLowerCase()}@${UNIVERSITY_DOMAIN}`;
      const seededCourseList = Object.keys(mergedGrades).sort();
      plannedUpdates.push({
        ref: docRef,
        data: {
          regNo,
          batchId: batchConfig.id,
          nameWithInitials: plan.name,
          fullName: plan.name,
          email,
          programme: getProgramme(regNo),
          grades: mergedGrades,
          selectedElectives: {},
          lastUpdated: FieldValue.serverTimestamp(),
          isSeeded: seededCourseList.length > 0,
          seededCourses: seededCourseList,
          seededGrades: { ...mergedGrades },
          isModifiedByStudent: false,
          studentModifiedCourses: [],
        },
        diff: {
          regNo,
          newGradesCount: newKeys.length,
          overwrittenCount: overwrittenKeys.length,
          protectedCount: 0,
          details: ['[NEW STUDENT RECORD]', ...diffDetails],
        },
      });
      studentsCreated++;
    } else {
      const updatedSeededGrades: Record<string, string> = {
        ...existingSeededGrades,
        ...plan.sheetGrades,
      };

      const updatedSeededCourses = Object.keys(updatedSeededGrades).sort();

      const modifiedSet = new Set<string>();
      for (const [code, grade] of Object.entries(mergedGrades)) {
        const sheetVal = updatedSeededGrades[code];
        if (sheetVal === undefined || sheetVal !== grade) {
          modifiedSet.add(code);
        }
      }
      for (const code of updatedSeededCourses) {
        if (!(code in mergedGrades)) {
          modifiedSet.add(code);
        }
      }
      for (const code of protectedKeys) {
        modifiedSet.add(code);
      }
      for (const code of existingModifiedList) {
        if (code in mergedGrades && mergedGrades[code] !== updatedSeededGrades[code]) {
          modifiedSet.add(code);
        }
      }

      const updatedModifiedCourses = Array.from(modifiedSet).sort();
      const isModified = updatedModifiedCourses.length > 0;

      plannedUpdates.push({
        ref: docRef,
        data: {
          grades: mergedGrades,
          lastUpdated: FieldValue.serverTimestamp(),
          isSeeded: true,
          seededCourses: updatedSeededCourses,
          seededGrades: updatedSeededGrades,
          isModifiedByStudent: isModified,
          studentModifiedCourses: updatedModifiedCourses,
        },
        diff: {
          regNo,
          newGradesCount: newKeys.length,
          overwrittenCount: overwrittenKeys.length,
          protectedCount: protectedKeys.length,
          details: diffDetails,
        },
      });
      studentsUpdated++;
    }

    totalGradesAdded += newKeys.length;
    totalGradesOverwritten += overwrittenKeys.length;
    totalGradesProtected += protectedKeys.length;
  }

  // 8. Commit writes if not dry-run
  if (!dryRun && plannedUpdates.length > 0) {
    for (let i = 0; i < plannedUpdates.length; i += BATCH_SIZE) {
      const chunk = plannedUpdates.slice(i, i + BATCH_SIZE);
      const batch: WriteBatch = db.batch();

      for (const update of chunk) {
        batch.set(update.ref, update.data, { merge: true });
      }

      await batch.commit();
    }

    // Record last sync metadata on batches/{batchId}
    try {
      await db.collection('batches').doc(batchConfig.id).set(
        {
          lastSyncedAt: FieldValue.serverTimestamp(),
          lastSyncedBy: options.syncedBy || 'admin',
          lastSyncStats: {
            totalStudentsParsed: studentPlans.size,
            studentsUpdated,
            studentsCreated,
            totalGradesAdded,
            totalGradesOverwritten,
            totalGradesProtected,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (bErr) {
      console.warn(`[sync-engine] Could not record batch ${batchConfig.id} stats:`, bErr);
    }
  }

  const durationMs = Date.now() - startTime;
  const sampleDiff = plannedUpdates.slice(0, 15).map((p) => p.diff);

  return {
    success: true,
    dryRun,
    batchId: batchConfig.id,
    targetSemester: semester,
    sheetsFound,
    totalStudentsParsed: studentPlans.size,
    totalValidGradesInSheets,
    studentsUpdated,
    studentsCreated,
    totalGradesAdded,
    totalGradesOverwritten,
    totalGradesProtected,
    sampleDiff,
    durationMs,
    timestamp: new Date().toISOString(),
  };
}
