/**
 * Multi-Batch Configuration & Registration Helpers
 * =================================================
 * Provides deterministic batch extraction from student registration numbers
 * and manages multi-batch configuration models.
 */

export interface BatchInfo {
  batchId: string;
  batchLabel: string;
  prefix: string;
  programme: 'CIS' | 'FIS' | 'unknown';
}

export interface BatchConfig {
  id: string;                    // e.g. "22_23", "23_24"
  label: string;                 // e.g. "2022/2023 Batch"
  prefix: string;                // e.g. "22", "23"
  googleSheetUrl: string;        // Dedicated Google Sheet URL for this cohort
  adminEmails: string[];         // Batch-specific administrators
  lastSyncedAt?: string | null;  // ISO timestamp of last sync
  lastSyncedBy?: string | null;  // Email of admin who performed last sync
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_22_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1Xq3tsyEkLwBTO7EsFruHdlbXBwETdCOQGSdlZrWzZdo/edit?usp=sharing';

export const SUPPORTED_BATCHES: Record<string, { label: string; prefix: string }> = {
  '22_23': {
    label: '2022/2023 Batch',
    prefix: '22',
  },
  '23_24': {
    label: '2023/2024 Batch',
    prefix: '23',
  },
};

/**
 * Extract batch and programme information from a registration number.
 * e.g. "23FIS0045" -> { batchId: "23_24", batchLabel: "2023/2024 Batch", prefix: "23", programme: "FIS" }
 * e.g. "22CIS0333" -> { batchId: "22_23", batchLabel: "2022/2023 Batch", prefix: "22", programme: "CIS" }
 */
export function getBatchFromRegNo(regNo: string): BatchInfo {
  const upper = regNo.trim().toUpperCase();
  const match = upper.match(/^(\d{2})(CIS|FIS)\d{3,5}$/);

  if (!match) {
    return {
      batchId: 'unknown',
      batchLabel: 'Unknown Batch',
      prefix: '',
      programme: 'unknown',
    };
  }

  const prefix = match[1];
  const programme = match[2] as 'CIS' | 'FIS';
  const batchId = `${prefix}_${Number(prefix) + 1}`;
  const batchLabel = `20${prefix}/20${Number(prefix) + 1} Batch`;

  return {
    batchId,
    batchLabel,
    prefix,
    programme,
  };
}

/**
 * Get human-readable batch label.
 */
export function getBatchLabel(batchId: string): string {
  if (SUPPORTED_BATCHES[batchId]) {
    return SUPPORTED_BATCHES[batchId].label;
  }
  const match = batchId.match(/^(\d{2})_(\d{2})$/);
  if (match) {
    return `20${match[1]}/20${match[2]} Batch`;
  }
  return batchId;
}
