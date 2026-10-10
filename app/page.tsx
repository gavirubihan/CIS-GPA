'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import TopBar from '../components/TopBar';
import SummaryCard from '../components/SummaryCard';
import YearTabs from '../components/YearTabs';
import ModuleTable from '../components/ModuleTable';
import ModuleList from '../components/ModuleList';
import TargetPlanner from '../components/TargetPlanner';
import TranscriptView from '../components/TranscriptView';
import LoginPage from '../components/LoginPage';
import UnsavedChangesBar from '../components/UnsavedChangesBar';
import { ToastProvider, useToast } from '../components/Toast';
import { useAuth } from '../components/AuthProvider';
import { fetchStudentRecord, saveGradesViaApi } from '../lib/api-client';
import { calculateAllStats } from '../data/courseData';
import {
  UserGrades,
  SelectedElectives,
  ActiveTab,
  ThemeMode,
} from '../types';

const STORAGE_KEY_GRADES = 'gpa_calc_user_grades_v3';
const STORAGE_KEY_ELECTIVES = 'gpa_calc_selected_electives_v3';
const STORAGE_KEY_THEME = 'gpa_calc_theme_v3';

// ---------------------------------------------------------------------------
// Skeleton Screen shown while resolving authentication
// ---------------------------------------------------------------------------
function AuthSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-xs text-secondary font-medium">Verifying session…</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Screen shown while loading grades from database
// ---------------------------------------------------------------------------
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-pulse">
      {/* Top bar skeleton */}
      <div className="h-14 border-b border-border px-4 sm:px-6 flex items-center justify-between">
        <div className="h-4 w-32 bg-raised rounded" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 bg-raised rounded" />
          <div className="h-8 w-24 bg-raised rounded" />
          <div className="h-8 w-8 bg-raised rounded-full" />
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="h-9 w-64 bg-raised rounded-[8px]" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-48 rounded-[12px] bg-raised border border-border" />
            <div className="h-48 rounded-[12px] bg-raised border border-border" />
          </div>
          <div className="lg:col-span-4">
            <div className="h-72 rounded-[12px] bg-raised border border-border" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Content
// ---------------------------------------------------------------------------
function DashboardInner() {
  const { user, regNo, isValidUniversityAccount } = useAuth();
  const { showToast } = useToast();

  // Active working state for simulation & calculation
  const [userGrades, setUserGrades] = useState<UserGrades>({});
  const [selectedElectives, setSelectedElectives] = useState<SelectedElectives>({});

  // Saved baseline state in cloud database
  const [savedGrades, setSavedGrades] = useState<UserGrades>({});
  const [savedElectives, setSavedElectives] = useState<SelectedElectives>({});

  // Seeded sheet courses & student-modified courses from Firestore
  const [seededCourses, setSeededCourses] = useState<string[]>([]);
  const [studentModifiedCourses, setStudentModifiedCourses] = useState<string[]>([]);
  const [seededGrades, setSeededGrades] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState<ActiveTab>('year1');
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [isMounted, setIsMounted] = useState(false);
  const [dbStudentName, setDbStudentName] = useState<string | undefined>(undefined);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSummaryCardVisible, setIsSummaryCardVisible] = useState(true);

  const hasLoadedToastFired = useRef(false);

  // 1. Initial Theme Setup: System preference with manual override
  useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      if (initial === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }, []);

  // 2. Load Grades: API first, fallback to localStorage
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setIsLoadingFromDb(true);
      try {
        const result = await fetchStudentRecord();
        if (result?.record) {
          const record = result.record;
          const recGrades = (record.grades as UserGrades) || {};
          const recElectives = record.selectedElectives || {};

          setUserGrades(recGrades);
          setSavedGrades(recGrades);
          setSelectedElectives(recElectives);
          setSavedElectives(recElectives);

          const sCourses = record.seededCourses || (record.isSeeded ? Object.keys(recGrades).sort() : []);
          const smCourses = record.studentModifiedCourses || record.modifiedCourses || [];
          const sGrades = record.seededGrades || (record.isSeeded && !record.isModifiedByStudent ? (recGrades as Record<string, string>) : {});

          setSeededCourses(sCourses);
          setStudentModifiedCourses(smCourses);
          setSeededGrades(sGrades);

          // If student has Year 2 grades, default active tab to year2
          const hasYear2 = Object.keys(recGrades).some((k) => k.startsWith('IS3') || k.startsWith('IS4'));
          if (hasYear2) {
            setActiveTab('year2');
          }

          setDbStudentName(record.nameWithInitials || record.fullName);
        } else {
          const localGradesStr = localStorage.getItem(STORAGE_KEY_GRADES);
          const localElectivesStr = localStorage.getItem(STORAGE_KEY_ELECTIVES);
          const localGrades = localGradesStr ? JSON.parse(localGradesStr) : {};
          const localElectives = localElectivesStr ? JSON.parse(localElectivesStr) : {};

          setUserGrades(localGrades);
          setSavedGrades(localGrades);
          setSelectedElectives(localElectives);
          setSavedElectives(localElectives);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to load data from API:', err);
        const localGradesStr = localStorage.getItem(STORAGE_KEY_GRADES);
        const localElectivesStr = localStorage.getItem(STORAGE_KEY_ELECTIVES);
        const localGrades = localGradesStr ? JSON.parse(localGradesStr) : {};
        const localElectives = localElectivesStr ? JSON.parse(localElectivesStr) : {};

        setUserGrades(localGrades);
        setSavedGrades(localGrades);
        setSelectedElectives(localElectives);
        setSavedElectives(localElectives);
      } finally {
        setIsLoadingFromDb(false);
      }
    }

    loadData();
  }, [user]);

  // 3. First load dismissible toast notification
  useEffect(() => {
    if (!isLoadingFromDb && !hasLoadedToastFired.current) {
      hasLoadedToastFired.current = true;
      showToast('Grades loaded from your student profile.');
    }
  }, [isLoadingFromDb, showToast]);

  // 4. Calculate unsaved difference count
  const unsavedCount = useMemo(() => {
    let count = 0;
    const allGradeKeys = new Set([...Object.keys(userGrades), ...Object.keys(savedGrades)]);
    for (const code of allGradeKeys) {
      if ((userGrades[code] || '') !== (savedGrades[code] || '')) {
        count++;
      }
    }
    const allElectiveKeys = new Set([...Object.keys(selectedElectives), ...Object.keys(savedElectives)]);
    for (const code of allElectiveKeys) {
      if (!!selectedElectives[code] !== !!savedElectives[code]) {
        count++;
      }
    }
    return count;
  }, [userGrades, savedGrades, selectedElectives, savedElectives]);

  // 5. Prevent accidental tab close with unsaved changes
  useEffect(() => {
    if (unsavedCount <= 0) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedCount]);

  // 6. Manual Save Action: Commits current simulation to Firestore
  const handleSave = async () => {
    if (!regNo || isSaving || !isValidUniversityAccount) return;
    setIsSaving(true);
    try {
      await saveGradesViaApi(userGrades, selectedElectives);

      // Recompute modified courses list against seeded baseline
      const modifiedSet = new Set<string>();
      for (const [code, grade] of Object.entries(userGrades)) {
        if (!grade) continue;
        const seededGrade = seededGrades[code];
        if (seededGrade === undefined) {
          if (!seededCourses.includes(code)) {
            modifiedSet.add(code);
          }
        } else if (seededGrade !== grade) {
          modifiedSet.add(code);
        }
      }
      for (const code of seededCourses) {
        if (!(code in userGrades) || !userGrades[code]) {
          modifiedSet.add(code);
        }
      }
      const updatedModified = Array.from(modifiedSet).sort();
      setStudentModifiedCourses(updatedModified);

      // Advance baseline to match current state
      setSavedGrades({ ...userGrades });
      setSavedElectives({ ...selectedElectives });

      // Save local backup
      try {
        localStorage.setItem(STORAGE_KEY_GRADES, JSON.stringify(userGrades));
        localStorage.setItem(STORAGE_KEY_ELECTIVES, JSON.stringify(selectedElectives));
      } catch (_) {}

      showToast('Grades successfully saved to your cloud profile.');
    } catch (err) {
      console.error('[Dashboard] Save failed:', err);
      showToast('Failed to save grades. Please check your network connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // 7. Manual Discard Action: Reverts current simulation back to saved grades
  const handleDiscard = () => {
    setUserGrades({ ...savedGrades });
    setSelectedElectives({ ...savedElectives });
    showToast('Unsaved changes discarded.');
  };

  // 8. Track mobile summary card visibility for TopBar compact GPA pill
  useEffect(() => {
    if (isLoadingFromDb) return;
    const el = document.getElementById('summary-card-mobile');
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSummaryCardVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isLoadingFromDb]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem(STORAGE_KEY_THEME, nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const stats = useMemo(
    () => calculateAllStats(userGrades, selectedElectives),
    [userGrades, selectedElectives]
  );

  const handleGradeChange = (code: string, grade: string) => {
    setUserGrades((prev) => {
      const next = { ...prev };
      if (grade) next[code] = grade;
      else delete next[code];
      return next;
    });
  };

  const handleElectiveToggle = (code: string, isChecked: boolean) => {
    setSelectedElectives((prev) => {
      const next = { ...prev };
      if (isChecked) next[code] = true;
      else delete next[code];
      return next;
    });
    if (!isChecked) {
      setUserGrades((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
    }
  };

  const handleExport = () => {
    const payload = {
      version: '2026.1',
      exportedAt: new Date().toISOString(),
      regNo,
      userGrades,
      selectedElectives,
      stats: {
        fgpa: stats.currentFgpa,
        classAward: stats.classAward.name,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GPA-${regNo || 'student'}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Grades exported to JSON.');
  };

  if (isLoadingFromDb) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 pb-16 print:min-h-0 print:pb-0 print:p-0 print:bg-white">
      {/* 56px Top Bar (Hidden in print) */}
      <div className="no-print print:hidden">
        <TopBar
          onExport={handleExport}
          onOpenTranscript={() => setIsTranscriptOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          showCompactGpa={!isSummaryCardVisible}
          compactGpaValue={stats.currentFgpa.toFixed(2)}
          studentName={dbStudentName}
          unsavedCount={unsavedCount}
          isSaving={isSaving}
          onSave={handleSave}
        />
      </div>

      {/* Main Container: Max width 1200px, centered (Hidden in print) */}
      <div id="dashboard-main-content" className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 no-print print:hidden">
        
        {/* Mobile View (<1024px): Summary Card rendered first */}
        <div className="block lg:hidden">
          <SummaryCard
            id="summary-card-mobile"
            stats={stats}
            activeTab={activeTab}
            onSelectYear={(tab) => setActiveTab(tab)}
          />
        </div>

        {/* 2-Column Desktop Layout: Main (8/12) and Sticky Side Panel (4/12) */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12 items-start">
          
          {/* Main Column (8/12) */}
          <main className="lg:col-span-8 space-y-6 sm:space-y-8 min-w-0">
            {/* 1. Year tabs (segmented control including Target Planner) */}
            <YearTabs
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              yearlyStats={stats.yearlyStats}
            />

            {activeTab === 'planner' ? (
              /* Dedicated Target Planner Workspace */
              <div key="tab-planner" className="tab-transition space-y-4">
                <TargetPlanner stats={stats} forceOpen={true} />
              </div>
            ) : (
              <>
                {/* 2. Prominent Target Planner Smart Card positioned ABOVE modules for instant discovery */}
                <TargetPlanner stats={stats} />

                {/* 3. Module table: Desktop table (>=768px) and Mobile stacked list (<768px) with smooth tab transition */}
                <div key={`desktop-${activeTab}`} className="hidden sm:block tab-transition">
                  <ModuleTable
                    activeTab={activeTab}
                    userGrades={userGrades}
                    selectedElectives={selectedElectives}
                    yearlyStats={stats.yearlyStats}
                    onGradeChange={handleGradeChange}
                    onElectiveToggle={handleElectiveToggle}
                    onSelectYear={(tab) => setActiveTab(tab as ActiveTab)}
                    seededCourses={seededCourses}
                    studentModifiedCourses={studentModifiedCourses}
                  />
                </div>

                <div key={`mobile-${activeTab}`} className="block sm:hidden tab-transition">
                  <ModuleList
                    activeTab={activeTab}
                    userGrades={userGrades}
                    selectedElectives={selectedElectives}
                    yearlyStats={stats.yearlyStats}
                    onGradeChange={handleGradeChange}
                    onElectiveToggle={handleElectiveToggle}
                    onSelectYear={(tab) => setActiveTab(tab as ActiveTab)}
                    seededCourses={seededCourses}
                    studentModifiedCourses={studentModifiedCourses}
                  />
                </div>
              </>
            )}
          </main>

          {/* Desktop Sticky Side Panel (4/12) */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-20">
              <SummaryCard
                id="summary-card-desktop"
                stats={stats}
                activeTab={activeTab}
                onSelectYear={(tab) => setActiveTab(tab)}
              />
            </div>
          </aside>

        </div>
      </div>

      {/* Floating Unsaved Changes Action Dock (Hidden in print) */}
      <div id="unsaved-changes-dock" className="no-print print:hidden">
        <UnsavedChangesBar
          unsavedCount={unsavedCount}
          isSaving={isSaving}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
      </div>

      {/* Transcript Modal & Printable Document */}
      <TranscriptView
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        userGrades={userGrades}
        selectedElectives={selectedElectives}
        stats={stats}
        studentName={dbStudentName}
        seededCourses={seededCourses}
        studentModifiedCourses={studentModifiedCourses}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard with Toast Context
// ---------------------------------------------------------------------------
function Dashboard() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  );
}

// ---------------------------------------------------------------------------
// Root Page: Authentication Gate
// ---------------------------------------------------------------------------
export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <AuthSkeleton />;
  if (!user) return <LoginPage />;
  return <Dashboard />;
}
