'use client';

import React from 'react';
import { CloudUpload, RotateCcw, Loader2, AlertCircle } from 'lucide-react';

interface UnsavedChangesBarProps {
  unsavedCount: number;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export default function UnsavedChangesBar({
  unsavedCount,
  isSaving,
  onSave,
  onDiscard,
}: UnsavedChangesBarProps) {
  if (unsavedCount <= 0) return null;

  return (
    <aside
      aria-label="Unsaved changes notification"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="flex items-center justify-between gap-3 rounded-[14px] border border-amber-500/30 bg-surface/95 dark:bg-[#141419]/95 px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-2xl backdrop-blur-md transition-all">
        {/* Left: Indicator & Status message */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>

          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
              <span>{unsavedCount} unsaved {unsavedCount === 1 ? 'change' : 'changes'}</span>
              <span className="hidden sm:inline-block text-[11px] font-normal text-secondary">
                (simulation mode)
              </span>
            </p>
            <p className="hidden sm:block text-[11px] text-secondary truncate">
              Click save to sync changes to the database.
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Discard / Revert */}
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-2.5 sm:px-3 text-xs font-medium text-secondary hover:text-foreground hover:bg-raised transition-colors focus-visible:outline-none disabled:opacity-50"
            title="Discard current changes and restore saved grades"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Discard</span>
            <span className="sm:hidden">Reset</span>
          </button>

          {/* Save to Cloud */}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-accent px-3 sm:px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-accent-hover transition-all focus-visible:outline-none disabled:opacity-60 cursor-pointer active:scale-[0.98]"
            title="Save changes to your database profile"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <CloudUpload className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
