'use client';

import React from 'react';
import { CloudUpload, RotateCcw, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { getGpaColor } from '../lib/gradeStyles';

interface UnsavedChangesBarProps {
  unsavedCount: number;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  currentGpa?: number;
  savedGpa?: number;
}

export default function UnsavedChangesBar({
  unsavedCount,
  isSaving,
  onSave,
  onDiscard,
  currentGpa,
  savedGpa,
}: UnsavedChangesBarProps) {
  if (unsavedCount <= 0) return null;

  const hasGpa = currentGpa !== undefined && currentGpa > 0;
  const diff = hasGpa && savedGpa !== undefined && savedGpa > 0
    ? Number((currentGpa - savedGpa).toFixed(2))
    : 0;
  const isUp = diff > 0.001;
  const isDown = diff < -0.001;
  const gpaStyle = hasGpa ? getGpaColor(currentGpa) : null;

  return (
    <aside
      aria-label="Unsaved changes notification"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 rounded-[14px] border border-amber-500/30 bg-surface/95 dark:bg-[#141419]/95 px-3 py-2 sm:px-4 sm:py-3 shadow-2xl backdrop-blur-md transition-all">
        {/* Left: Indicator & Status message with Live GPA (strictly single-line, shrink-resistant) */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-amber-500" />
          </span>

          <div className="min-w-0 flex items-center gap-1.5 sm:gap-2 overflow-hidden">
            <span className="text-xs font-semibold text-foreground whitespace-nowrap shrink-0">
              {unsavedCount} <span className="hidden xs:inline sm:inline">{unsavedCount === 1 ? 'change' : 'changes'}</span>
            </span>

            {/* Live GPA Ticker Pill */}
            {hasGpa && (
              <div
                className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full border border-border bg-surface/90 shadow-2xs text-[11px] sm:text-xs font-mono shrink-0 whitespace-nowrap"
                title={savedGpa ? `Live CGPA: ${currentGpa.toFixed(2)} (Saved: ${savedGpa.toFixed(2)})` : `Live CGPA: ${currentGpa.toFixed(2)}`}
              >
                <span className="text-[9px] sm:text-[10px] text-secondary font-sans font-medium uppercase tracking-wider">CGPA</span>
                <span className={`font-bold tabular-nums ${gpaStyle?.text || 'text-foreground'}`}>
                  {currentGpa.toFixed(2)}
                </span>

                {/* Diff indicator */}
                {isUp && (
                  <span className="inline-flex items-center text-[10px] sm:text-[11px] font-bold text-emerald-500 font-sans">
                    <TrendingUp className="h-3 w-3 mr-0.5 shrink-0" strokeWidth={2.5} />
                    +{diff.toFixed(2)}
                  </span>
                )}
                {isDown && (
                  <span className="inline-flex items-center text-[10px] sm:text-[11px] font-bold text-rose-500 font-sans">
                    <TrendingDown className="h-3 w-3 mr-0.5 shrink-0" strokeWidth={2.5} />
                    {diff.toFixed(2)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Discard / Revert */}
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="inline-flex h-8 w-8 sm:w-auto items-center justify-center sm:gap-1.5 rounded-[8px] border border-border bg-surface px-0 sm:px-3 text-xs font-medium text-secondary hover:text-foreground hover:bg-raised transition-colors focus-visible:outline-none disabled:opacity-50 cursor-pointer"
            title="Discard current changes and restore saved grades"
            aria-label="Discard changes"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span className="hidden sm:inline">Discard</span>
          </button>

          {/* Save to Cloud */}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-accent px-2.5 sm:px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-accent-hover transition-all focus-visible:outline-none disabled:opacity-60 cursor-pointer active:scale-[0.98]"
            title="Save changes to your database profile"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" strokeWidth={2} />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <CloudUpload className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                <span className="sm:hidden">Save</span>
                <span className="hidden sm:inline">Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
