'use client';

import React, { useState, useEffect } from 'react';
import { signInWithMicrosoft } from '../lib/auth';
import { 
  GraduationCap, 
  LogIn, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Synchronize theme with localStorage and root element
  useEffect(() => {
    const saved = localStorage.getItem('gpa_calc_theme_v3') as 'dark' | 'light' | null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      if (saved === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      if (initial === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('gpa_calc_theme_v3', next);
    if (next === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithMicrosoft();
      // On success onAuthStateChanged fires and AuthProvider updates the user,
      // which causes this page to unmount — no need to reset loading here.
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        // User dismissed the popup — silent, no error message
      } else if (code === 'auth/wrong-domain') {
        setError('Only student accounts (@ms.sab.ac.lk) are allowed. Please use your student Microsoft account.');
      } else if (code === 'auth/invalid-reg-no') {
        setError((err as Error).message);
      } else if (code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with a different sign-in method.');
      } else {
        setError('Sign-in failed. Please try again.');
        console.error('[Auth] Microsoft sign-in error:', err);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground transition-colors selection:bg-indigo-500 selection:text-white">
      {/* Top Bar with Brand & Theme Toggle */}
      <header className="h-14 w-full border-b border-border bg-background/90 backdrop-blur-md transition-colors">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="CIS GPA Logo" className="h-7 w-7 shrink-0 rounded-[7px]" />
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                GPA Calculator
              </span>
              <span className="hidden sm:inline text-xs text-secondary">
                BSc (Hons) CIS / IS
              </span>
            </div>
          </div>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
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
      </header>

      {/* Main Centered Sign-In Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 w-full max-w-md mx-auto">
        {/* Project Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-secondary font-medium shadow-2xs mb-5">
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
          <span>BSc (Hons) CIS / IS</span>
        </div>

        {/* Hero Logo Mark (Borderless) */}
        <img src="/favicon.svg" alt="CIS GPA Logo" className="h-12 w-12 rounded-[14px] mb-4 shadow-sm" />

        {/* Title & Description */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-center">
          GPA Calculator
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-secondary text-center max-w-sm leading-relaxed">
          Track modules, calculate weighted FGPA &amp; plan target degree classes
        </p>

        {/* Auth Card */}
        <div className="mt-7 w-full rounded-[16px] border border-border bg-surface p-6 sm:p-7 shadow-xs transition-colors">
          <div className="mb-5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Sign in to your account
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Access your preloaded grades, GPA forecasts &amp; transcript view.
            </p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Microsoft Single Sign-On Button */}
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            type="button"
            className="w-full flex items-center justify-center gap-3 rounded-[10px] border border-border bg-surface hover:bg-raised text-foreground text-sm font-medium py-3 px-4 transition-colors duration-150 shadow-2xs active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-secondary" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 21 21" fill="none" className="shrink-0" aria-hidden="true">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
            )}
            <span>{isLoading ? 'Connecting to Microsoft…' : 'Sign in with Microsoft'}</span>
          </button>

          {/* Hairline Divider */}
          <div className="my-5 border-t border-border-hairline" />

          {/* Student Email Instruction Callout */}
          <div className="rounded-[10px] border border-border-hairline bg-raised/50 p-3.5 space-y-2.5 text-xs text-secondary">
            <div className="flex items-start gap-2.5">
              <LogIn className="h-4 w-4 mt-0.5 text-secondary shrink-0" strokeWidth={1.5} />
              <div className="leading-relaxed">
                <span>Sign in with your student index email address:</span>
                <div className="mt-1">
                  <code className="font-mono text-[11px] text-foreground bg-surface border border-border px-2 py-0.5 rounded-[5px] inline-block">
                    22cis0333@ms.sab.ac.lk
                  </code>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pt-2 border-t border-border-hairline">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={1.5} />
              <span className="text-[11px]">Results are private and automatically saved to your profile</span>
            </div>
          </div>
        </div>

        {/* Features Pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-secondary">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Auto Grade Sync</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            <span>Y1–Y4 Weighted FGPA</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>Transcript Export</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center border-t border-border-hairline mt-auto">
        <p className="text-xs text-secondary">
          BSc (Hons) CIS / IS · Student GPA Calculator
        </p>
        <p className="text-[11px] text-secondary/70 mt-1">
          Personal project for calculating and forecasting academic performance
        </p>
      </footer>
    </div>
  );
}
