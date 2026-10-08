'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  Sun, 
  Moon, 
  LogOut, 
  GraduationCap
} from 'lucide-react';
import { ThemeMode } from '../types';
import { useAuth } from './AuthProvider';
import { signOut } from '../lib/auth';

interface TopBarProps {
  onExport: () => void;
  onOpenTranscript: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  showCompactGpa?: boolean;
  compactGpaValue?: string;
  studentName?: string;
}

export default function TopBar({
  onExport,
  onOpenTranscript,
  theme,
  onToggleTheme,
  showCompactGpa = false,
  compactGpaValue = '0.00',
  studentName,
}: TopBarProps) {
  const { user, regNo, programme } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const displayName = studentName || user?.displayName || regNo || 'Student';
  const email = user?.email || '';
  const avatarLetter = (displayName || regNo || 'U').charAt(0).toUpperCase();

  const progLabel = programme === 'CIS'
    ? 'Computing & Information Systems'
    : programme === 'FIS'
    ? 'Information Systems'
    : 'Information Systems';

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

  return (
    <header className="sticky top-0 z-40 h-14 w-full border-b border-border bg-background/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
        
        {/* Left: Logo mark + GPA Calculator + Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <img src="/favicon.svg" alt="CIS GPA Logo" className="h-7 w-7 shrink-0 rounded-[7px]" />

          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-sm font-semibold tracking-tight text-foreground whitespace-nowrap">
              GPA Calculator
            </span>
            <span className="hidden sm:inline text-xs text-secondary truncate">
              BSc (Hons) CIS / IS
            </span>
          </div>

          {/* Mobile-only compact GPA pill shown when summary card is scrolled out of view */}
          {showCompactGpa && (
            <div className="sm:hidden flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs animate-in fade-in duration-200">
              <span className="text-[11px] text-secondary">GPA</span>
              <span className="font-semibold tabular-nums text-foreground">{compactGpaValue}</span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          
          {/* Desktop Controls (>=768px) */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onExport}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-raised transition-colors focus-visible:outline-none"
              title="Export grades as JSON"
            >
              <Download className="h-4 w-4 text-secondary" strokeWidth={1.5} />
              <span>Export</span>
            </button>

            <button
              onClick={onOpenTranscript}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-accent px-3.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors focus-visible:outline-none shadow-2xs"
              title="Open printable transcript"
            >
              <FileText className="h-4 w-4 text-white/90" strokeWidth={1.5} />
              <span>Transcript</span>
            </button>

            <button
              onClick={onToggleTheme}
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-border bg-surface text-secondary hover:text-foreground hover:bg-raised transition-colors focus-visible:outline-none"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Moon className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* Profile Avatar Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              type="button"
              className="flex h-9 items-center gap-2 rounded-[8px] border border-border bg-surface px-2 sm:px-2.5 text-xs font-medium text-foreground hover:bg-raised transition-colors focus-visible:outline-none"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="User account menu"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-[11px] font-semibold text-white shadow-2xs">
                {avatarLetter}
              </span>
              <span className="font-mono text-xs text-foreground truncate max-w-[90px] sm:max-w-none">
                {regNo || 'Account'}
              </span>
            </button>

            {/* Profile Dropdown */}
            {menuOpen && (
              <div 
                className="absolute right-0 top-full mt-1.5 w-64 rounded-[12px] border border-border bg-surface p-2 shadow-lg z-50 text-xs animate-in fade-in duration-150"
                role="menu"
              >
                {/* User info */}
                <div className="px-2.5 py-2">
                  <p className="font-semibold text-foreground truncate">
                    {displayName}
                  </p>
                  {regNo && (
                    <p className="font-mono text-secondary mt-0.5">
                      {regNo}
                    </p>
                  )}
                  {email && (
                    <p className="text-secondary truncate mt-0.5">
                      {email}
                    </p>
                  )}
                  <p className="text-secondary mt-1 text-[11px]">
                    {progLabel}
                  </p>
                </div>

                <div className="my-1 border-t border-border-hairline" />

                {/* Mobile-only menu items */}
                <div className="sm:hidden space-y-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onExport();
                    }}
                    type="button"
                    className="flex w-full min-h-[44px] items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-foreground hover:bg-raised transition-colors text-left"
                    role="menuitem"
                  >
                    <Download className="h-4 w-4 text-secondary" strokeWidth={1.5} />
                    <span>Export data</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenTranscript();
                    }}
                    type="button"
                    className="flex w-full min-h-[44px] items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-foreground hover:bg-raised transition-colors text-left"
                    role="menuitem"
                  >
                    <FileText className="h-4 w-4 text-secondary" strokeWidth={1.5} />
                    <span>View transcript</span>
                  </button>

                  <button
                    onClick={() => {
                      onToggleTheme();
                    }}
                    type="button"
                    className="flex w-full min-h-[44px] items-center justify-between rounded-[8px] px-2.5 py-2 text-foreground hover:bg-raised transition-colors text-left"
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2.5">
                      {theme === 'dark' ? (
                        <Sun className="h-4 w-4 text-secondary" strokeWidth={1.5} />
                      ) : (
                        <Moon className="h-4 w-4 text-secondary" strokeWidth={1.5} />
                      )}
                      <span>Theme</span>
                    </div>
                    <span className="text-secondary capitalize">{theme}</span>
                  </button>

                  <div className="my-1 border-t border-border-hairline" />
                </div>

                {/* Sign Out */}
                <button
                  onClick={handleSignOut}
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-red-500 hover:bg-raised transition-colors text-left"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
