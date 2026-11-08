'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  Settings2,
  Save,
  Layers,
  Clock,
  Check
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { triggerDatabaseSync, fetchBatches, updateBatchConfig, type BatchItem } from '../lib/api-client';
import { SyncResult, DEFAULT_SPREADSHEET_URL } from '../types';

interface AdminSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: () => void;
}

export default function AdminSyncModal({
  isOpen,
  onClose,
  onSyncSuccess,
}: AdminSyncModalProps) {
  const { regNo, adminScope, batchId: userBatchId } = useAuth();

  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('22_23');
  const [semester, setSemester] = useState<string>('all');
  const [isDryRun, setIsDryRun] = useState<boolean>(true);
  const [sheetUrl, setSheetUrl] = useState<string>(DEFAULT_SPREADSHEET_URL);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [isSavingUrl, setIsSavingUrl] = useState<boolean>(false);
  const [urlSaveSuccess, setUrlSaveSuccess] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);

  // Load batches configuration when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingBatches(true);

    fetchBatches()
      .then((data) => {
        if (!isMounted) return;
        setBatches(data.batches);

        // Determine default batch
        let initialBatchId = '22_23';
        if (!data.isSuperAdmin && data.allowedBatches.length > 0) {
          initialBatchId = data.allowedBatches[0];
        } else if (userBatchId && data.batches.some((b) => b.id === userBatchId)) {
          initialBatchId = userBatchId;
        }

        setSelectedBatchId(initialBatchId);
        const currentBatch = data.batches.find((b) => b.id === initialBatchId);
        if (currentBatch?.googleSheetUrl) {
          setSheetUrl(currentBatch.googleSheetUrl);
        } else {
          setSheetUrl(initialBatchId === '22_23' ? DEFAULT_SPREADSHEET_URL : '');
          if (initialBatchId !== '22_23') {
            setShowConfig(true);
          }
        }
      })
      .catch((err) => {
        console.warn('[AdminSyncModal] Error fetching batches:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingBatches(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userBatchId]);

  // Update sheet URL when selected batch changes
  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    setResult(null);
    setError(null);
    setUrlSaveSuccess(false);

    const b = batches.find((item) => item.id === batchId);
    if (b?.googleSheetUrl) {
      setSheetUrl(b.googleSheetUrl);
    } else {
      setSheetUrl(batchId === '22_23' ? DEFAULT_SPREADSHEET_URL : '');
      if (batchId !== '22_23') {
        setShowConfig(true);
      }
    }
  };

  const handleSaveSheetUrl = async () => {
    if (!sheetUrl.trim()) return;
    setIsSavingUrl(true);
    setUrlSaveSuccess(false);
    setError(null);

    try {
      await updateBatchConfig({
        batchId: selectedBatchId,
        googleSheetUrl: sheetUrl.trim(),
      });
      setUrlSaveSuccess(true);
      // Update local state
      setBatches((prev) =>
        prev.map((b) => (b.id === selectedBatchId ? { ...b, googleSheetUrl: sheetUrl.trim() } : b))
      );
      setTimeout(() => setUrlSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save spreadsheet URL');
    } finally {
      setIsSavingUrl(false);
    }
  };

  if (!isOpen) return null;

  const handleStartSync = async (forceLive?: boolean) => {
    if (!sheetUrl.trim() && selectedBatchId !== '22_23') {
      setError(`Please configure and save the Google Sheet URL for ${currentBatchMeta?.label || selectedBatchId} before running sync.`);
      setShowConfig(true);
      return;
    }

    const dryRunMode = forceLive ? false : isDryRun;
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await triggerDatabaseSync({
        batchId: selectedBatchId,
        semester: semester === 'all' ? 'all' : Number(semester),
        dryRun: dryRunMode,
        sheetUrl: sheetUrl.trim() || undefined,
      });

      setResult(res);
      if (!dryRunMode && onSyncSuccess) {
        onSyncSuccess();
      }
    } catch (err: unknown) {
      console.error('[AdminSyncModal] Sync error:', err);
      setError((err as Error).message || 'Failed to complete synchronization.');
    } finally {
      setIsRunning(false);
    }
  };

  const currentBatchMeta = batches.find((b) => b.id === selectedBatchId);
  const isSuperAdmin = adminScope?.isSuperAdmin;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-sync-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 sm:px-5 py-3.5 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shrink-0">
              <Database className="h-4 w-4" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="admin-sync-title" className="text-sm font-semibold text-foreground">
                  Database Sync
                </h2>
                <span className="font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                  {regNo || 'Admin'}
                </span>
                {isSuperAdmin && (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Super Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-secondary hover:text-foreground hover:bg-raised transition-colors focus-visible:outline-none cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Target Batch Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3 w-3" />
                Target Batch
              </label>
              {currentBatchMeta?.lastSyncedAt && (
                <span className="text-[10px] text-muted flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  Synced {new Date(currentBatchMeta.lastSyncedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {isSuperAdmin ? (
              /* Super Admin can toggle any batch */
              <div className="grid grid-cols-2 gap-2">
                {batches.length > 0 ? (
                  batches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBatch(b.id)}
                      className={`py-2.5 px-3 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                        selectedBatchId === b.id
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold shadow-2xs'
                          : 'border-border bg-surface text-secondary hover:text-foreground hover:bg-raised'
                      }`}
                    >
                      <div className="font-semibold">{b.label}</div>
                    </button>
                  ))
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSelectBatch('22_23')}
                      className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                        selectedBatchId === '22_23'
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'border-border bg-surface text-secondary'
                      }`}
                    >
                      2022/2023 Batch
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectBatch('23_24')}
                      className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                        selectedBatchId === '23_24'
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'border-border bg-surface text-secondary'
                      }`}
                    >
                      2023/2024 Batch
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Batch-specific Admin: Locked view */
              <div className="p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {currentBatchMeta?.label || (selectedBatchId === '23_24' ? '2023/2024 Batch' : '2022/2023 Batch')}
                  </div>
                  <div className="text-[10px] text-secondary">
                    Scoped batch administrator access
                  </div>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface border border-border text-foreground font-semibold">
                  Batch {selectedBatchId}
                </span>
              </div>
            )}
          </div>

          {/* Target Semester Pills */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
              Semester
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => setSemester('all')}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all text-center cursor-pointer ${
                  semester === 'all'
                    ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'border-border bg-surface text-secondary hover:text-foreground hover:bg-raised'
                }`}
              >
                All (1–8)
              </button>
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSemester(s)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all text-center cursor-pointer ${
                    semester === s
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'border-border bg-surface text-secondary hover:text-foreground hover:bg-raised'
                  }`}
                >
                  Sem {s}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Segmented Control */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
              Mode
            </label>
            <div className="flex p-0.5 rounded-lg border border-border bg-raised/40">
              <button
                type="button"
                onClick={() => setIsDryRun(true)}
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all text-center cursor-pointer ${
                  isDryRun
                    ? 'bg-surface text-foreground font-semibold shadow-2xs border border-border/60'
                    : 'text-secondary hover:text-foreground'
                }`}
              >
                Dry Run Preview
              </button>
              <button
                type="button"
                onClick={() => setIsDryRun(false)}
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all text-center cursor-pointer ${
                  !isDryRun
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold shadow-2xs border border-amber-500/30'
                    : 'text-secondary hover:text-foreground'
                }`}
              >
                Live Sync (Write)
              </button>
            </div>
            <p className="text-[11px] text-secondary">
              {isDryRun
                ? 'Safe mode: compares grades and computes diffs without modifying Firestore.'
                : 'Commit mode: non-destructively merges sheet grades into student documents.'}
            </p>
          </div>

          {/* Discreet Info Note */}
          <div className="flex items-center gap-2 py-1 text-[11px] text-secondary">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Student-modified grades are preserved and never overwritten.</span>
          </div>

          {/* Dedicated Google Sheet Configuration per Batch */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="inline-flex items-center gap-1.5 text-[11px] text-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              <Settings2 className="h-3 w-3" />
              <span>
                {showConfig
                  ? `Hide ${currentBatchMeta?.label || selectedBatchId} spreadsheet URL`
                  : `Configure ${currentBatchMeta?.label || selectedBatchId} spreadsheet URL`}
              </span>
            </button>

            {showConfig && (
              <div className="mt-2 p-3 rounded-xl border border-border bg-raised/30 space-y-2 animate-in fade-in duration-100">
                <div className="text-[11px] font-medium text-foreground">
                  Google Sheet for {currentBatchMeta?.label || selectedBatchId}:
                </div>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="w-full text-[11px] font-mono px-2.5 py-1.5 rounded-md border border-border bg-surface text-foreground focus:outline-none focus:border-indigo-500"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
                
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setSheetUrl(DEFAULT_SPREADSHEET_URL)}
                    className="text-[10px] text-indigo-500 hover:underline cursor-pointer"
                  >
                    Reset to default URL
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSheetUrl}
                    disabled={isSavingUrl}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingUrl ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : urlSaveSuccess ? (
                      <Check className="h-3 w-3 text-emerald-300" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    <span>{urlSaveSuccess ? 'Saved!' : 'Save Sheet URL'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="font-mono text-[11px] leading-tight">{error}</p>
            </div>
          )}

          {/* Sync Results */}
          {result && (
            <div className="rounded-xl border border-border bg-raised/20 p-3.5 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className={`inline-flex items-center gap-1 font-semibold ${
                  result.dryRun ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {result.dryRun ? 'Preview Ready' : 'Database Updated'}
                </span>
                <span className="font-mono text-[11px] text-secondary">
                  {(result.durationMs / 1000).toFixed(2)}s
                </span>
              </div>

              {/* 4-Item Compact Metric Strip */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-lg bg-surface border border-border">
                  <div className="text-[10px] text-secondary">Parsed</div>
                  <div className="text-xs font-bold font-mono text-foreground mt-0.5">
                    {result.totalStudentsParsed}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border">
                  <div className="text-[10px] text-secondary">New</div>
                  <div className="text-xs font-bold font-mono text-emerald-500 mt-0.5">
                    +{result.totalGradesAdded}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border">
                  <div className="text-[10px] text-secondary">Updated</div>
                  <div className="text-xs font-bold font-mono text-amber-500 mt-0.5">
                    ~{result.totalGradesOverwritten}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border">
                  <div className="text-[10px] text-secondary">Protected</div>
                  <div className="text-xs font-bold font-mono text-indigo-500 mt-0.5">
                    {result.totalGradesProtected}
                  </div>
                </div>
              </div>

              {/* Sample Diff List */}
              {result.sampleDiff && result.sampleDiff.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDiff(!showDiff)}
                    className="flex w-full items-center justify-between text-[11px] font-medium text-secondary hover:text-foreground"
                  >
                    <span>Sample changes ({result.sampleDiff.length} students)</span>
                    {showDiff ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {showDiff && (
                    <div className="p-2.5 rounded-lg border border-border bg-surface max-h-40 overflow-y-auto font-mono text-[10.5px] space-y-1 text-secondary">
                      {result.sampleDiff.map((d) => (
                        <div key={d.regNo} className="truncate">
                          <strong className="text-foreground">[{d.regNo}]</strong> {d.details.join(', ') || 'Grades updated'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* One-Click Apply Button from Dry-Run */}
              {result.dryRun && (
                <button
                  type="button"
                  onClick={() => handleStartSync(true)}
                  disabled={isRunning}
                  className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Database className="h-3.5 w-3.5" />
                  <span>Apply & Commit to Firestore</span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 sm:px-5 py-3 bg-surface">
          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="h-8.5 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-secondary hover:text-foreground hover:bg-raised transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleStartSync()}
            disabled={isRunning}
            className={`h-8.5 px-4 rounded-lg text-xs font-semibold text-white shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 ${
              isDryRun
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Syncing…</span>
              </>
            ) : isDryRun ? (
              <>
                <Play className="h-3 w-3 fill-current" />
                <span>Run Preview</span>
              </>
            ) : (
              <>
                <Database className="h-3 w-3" />
                <span>Sync Database</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
