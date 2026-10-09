'use client';

import React, { useMemo } from 'react';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
import { OverallStats, UserGrades, SelectedElectives, Grade } from '../types';
import { courseData, gradePoints } from '../data/courseData';
import { useAuth } from './AuthProvider';

interface TranscriptViewProps {
  isOpen: boolean;
  onClose: () => void;
  userGrades: UserGrades;
  selectedElectives: SelectedElectives;
  stats: OverallStats;
  studentName?: string;
}

export default function TranscriptView({
  isOpen,
  onClose,
  userGrades,
  selectedElectives,
  stats,
  studentName,
}: TranscriptViewProps) {
  const { user, regNo, programme } = useAuth();

  const displayName = studentName || user?.displayName || regNo || 'Undergraduate Student';

  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const documentRef = useMemo(() => {
    const safeReg = regNo ? regNo.replace(/[^a-zA-Z0-9]/g, '') : 'STUDENT';
    const year = new Date().getFullYear();
    return `TR-${safeReg}-${year}`;
  }, [regNo]);

  const degreeProgrammeName = useMemo(() => {
    if (programme === 'CIS') return 'B.Sc. (Hons) in Computing & Information Systems';
    if (programme === 'FIS') return 'B.Sc. (Hons) in Information Systems';
    return 'B.Sc. (Hons) in Computing & Information Systems / Information Systems';
  }, [programme]);

  // Count total completed modules
  const completedCoursesCount = useMemo(() => {
    let count = 0;
    for (const yKey of ['year1', 'year2', 'year3', 'year4'] as const) {
      const year = courseData[yKey];
      for (const semKey in year.semesters) {
        const sem = year.semesters[semKey];
        sem.courses.forEach((c) => {
          const isElective = c.type === 'Elective';
          const isSelected = !isElective || !!selectedElectives[c.code];
          if (isSelected && userGrades[c.code] && userGrades[c.code] !== '—') {
            count++;
          }
        });
      }
    }
    return count;
  }, [userGrades, selectedElectives]);

  if (!isOpen) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanReg = regNo ? regNo.replace(/[^a-zA-Z0-9_-]/g, '') : '';
    document.title = cleanReg ? `Unofficial_Academic_Transcript_${cleanReg}` : 'Unofficial_Academic_Transcript';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div
      id="transcript-modal-root"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-xs transition-opacity transcript-modal-overlay print:static print:inset-auto print:z-auto print:block print:p-0 print:overflow-visible print:bg-white print:backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-label="Unofficial Academic Transcript"
    >
      <div
        id="transcript-modal-card"
        className="relative w-full max-w-4xl rounded-xl border border-border bg-surface shadow-2xl my-auto overflow-hidden transcript-modal-card print:static print:w-full print:max-w-none print:rounded-none print:border-none print:bg-white print:shadow-none print:overflow-visible print:my-0 print:p-0"
      >
        {/* Modal Top Toolbar (Hidden during print) */}
        <div className="no-print print:hidden flex items-center justify-between border-b border-border px-5 py-3.5 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <FileText className="h-4 w-4" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Academic Transcript Preview
                </h2>
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500 border border-amber-500/20">
                  Unofficial Record
                </span>
              </div>
              <p className="text-xs text-secondary">
                Curriculum statement & performance summary
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-accent px-4 text-xs font-semibold text-white hover:bg-accent-hover transition-colors focus-visible:outline-none shadow-sm cursor-pointer"
            >
              <Printer className="h-4 w-4 text-white" strokeWidth={2} />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-border bg-surface text-secondary hover:text-foreground hover:bg-raised transition-colors focus-visible:outline-none cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Modal PDF Export Tip Banner (Hidden during print) */}
        <div className="no-print print:hidden px-5 py-2.5 bg-accent/5 border-b border-accent/10 flex items-center justify-between text-xs text-secondary">
          <div className="flex items-center gap-2">
            <span className="text-accent">💡</span>
            <span>
              <strong>Tip:</strong> In the print preview dialog, select <strong>Destination: Save as PDF</strong> to download a clean, professional vector PDF.
            </span>
          </div>
          <span className="hidden sm:inline text-[11px] text-secondary font-mono">
            {documentRef}
          </span>
        </div>

        {/* Printable Document Body */}
        <div
          id="transcript-printable"
          className="p-6 sm:p-10 max-h-[80vh] overflow-y-auto transcript-print-container bg-white text-slate-900 print:p-0 print:max-h-none print:overflow-visible print:bg-white print:text-slate-900"
        >
          {/* Header Block */}
          <div className="transcript-header-block border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-slate-100 text-slate-800 border border-slate-300 mb-1.5">
                  <span>Unofficial Academic Record</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 uppercase">
                  Academic Transcript
                </h1>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Curriculum Progress & Cumulative Performance Summary
                </p>
              </div>

              <div className="text-left sm:text-right font-mono text-[11px] text-slate-600 space-y-0.5">
                <div>
                  <span className="text-slate-400 font-sans">Date of Issue: </span>
                  <strong className="text-slate-800 font-sans">{currentDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Grade Scale: </span>
                  <strong className="text-slate-800">4.00 Max (Weighted FGPA)</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Document Ref: </span>
                  <span className="font-semibold text-slate-800">{documentRef}</span>
                </div>
              </div>
            </div>

            {/* Unofficial Notice Banner */}
            <div className="mt-3.5 p-2.5 rounded bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
              <span className="font-bold text-amber-800 shrink-0 uppercase tracking-wide text-[10px] mt-0.5">
                Notice:
              </span>
              <p>
                This document is a computer-generated <strong>unofficial academic record</strong> compiled for personal planning and academic self-evaluation. It is not an official university transcript, does not carry an institutional seal or authorized registrar signature, and does not confer formal academic certification.
              </p>
            </div>

            {/* Student & Programme Details Grid */}
            <div className="mt-4 pt-3.5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  Student Name
                </span>
                <div className="font-bold text-slate-900 text-sm leading-tight">
                  {displayName}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  Student ID / Reg. No
                </span>
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {regNo || '—'}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  Degree Programme
                </span>
                <div className="font-semibold text-slate-800 text-[11.5px] leading-snug">
                  {degreeProgrammeName}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  Academic Standing
                </span>
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline shrink-0" />
                  <span>Undergraduate (Active)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Performance Highlights KPI Strip */}
          <div className="transcript-metrics-block mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Cumulative FGPA
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {stats.currentFgpa.toFixed(2)}
                <span className="text-[10px] font-normal text-slate-500 ml-1">/ 4.00</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Standing Award
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1 truncate" title={stats.classAward.name}>
                {stats.classAward.name}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Graded Credits
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {stats.overallGradedCredits}
                <span className="text-[10px] font-normal text-slate-500 ml-1">/ 120</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Completed Modules
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {completedCoursesCount}
                <span className="text-[10px] font-normal text-slate-500 ml-1">Courses</span>
              </div>
            </div>
          </div>

          {/* Academic Coursework Tables per Year */}
          <div className="mt-6 space-y-6">
            {(['year1', 'year2', 'year3', 'year4'] as const).map((yKey) => {
              const year = courseData[yKey];
              const yStat = stats.yearlyStats[yKey];
              const weightPercent = Math.round(year.weight * 100);

              return (
                <div key={yKey} className="transcript-year-block space-y-3 pt-5 border-t border-slate-200">
                  {/* Year Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-800 pb-1.5 gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        {year.title}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        Curriculum Weight: {weightPercent}%
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-600 flex items-center gap-3">
                      <span>
                        Year GPA:{' '}
                        <strong className="text-slate-900">
                          {yStat?.gradedCredits > 0 ? yStat.gpa.toFixed(2) : '—'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Graded Credits:{' '}
                        <strong className="text-slate-900">{yStat?.gradedCredits || 0}</strong>
                      </span>
                      {yStat?.totalPoints > 0 && (
                        <>
                          <span>•</span>
                          <span>
                            Quality Points:{' '}
                            <strong className="text-slate-900">{yStat.totalPoints.toFixed(2)}</strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Semesters in Year */}
                  <div className="space-y-4">
                    {Object.entries(year.semesters).map(([semKey, sem]) => {
                      const semCourses = sem.courses.filter((course) => {
                        const isElective = course.type === 'Elective';
                        return !isElective || !!selectedElectives[course.code];
                      });

                      if (semCourses.length === 0) return null;

                      return (
                        <div key={semKey} className="transcript-semester-block">
                          {/* Semester Subheading */}
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-50 border-y border-slate-200 px-2.5 py-1 flex items-center justify-between">
                            <span>{sem.name}</span>
                            <span className="text-[9.5px] font-normal text-slate-500 normal-case">
                              {semCourses.length} modules
                            </span>
                          </div>

                          <table className="w-full text-left text-xs transcript-table border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/50">
                                <th className="py-1.5 pr-2 pl-2 font-semibold w-24">Code</th>
                                <th className="py-1.5 px-2 font-semibold">Module Title</th>
                                <th className="py-1.5 px-2 font-semibold text-center w-16">Type</th>
                                <th className="py-1.5 px-2 font-semibold text-center w-14">Credits</th>
                                <th className="py-1.5 px-2 font-semibold text-center w-16">Grade</th>
                                <th className="py-1.5 pl-2 pr-2 font-semibold text-right w-20">Points</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {semCourses.map((course) => {
                                const grade = userGrades[course.code] || '—';
                                const hasGrade = grade && grade !== '—';
                                const points = hasGrade && gradePoints[grade as Grade] !== undefined
                                  ? (gradePoints[grade as Grade] * course.credits).toFixed(2)
                                  : '—';

                                return (
                                  <tr key={course.code} className="h-7 hover:bg-slate-50/50">
                                    <td className="py-1 pr-2 pl-2 font-mono text-[11px] font-medium text-slate-700">
                                      {course.code}
                                    </td>
                                    <td className="py-1 px-2 text-[11px] text-slate-900">
                                      {course.title}
                                    </td>
                                    <td className="py-1 px-2 text-center text-[10px] text-slate-500 font-medium">
                                      {course.type === 'Compulsory' ? 'Core' : 'Elective'}
                                    </td>
                                    <td className="py-1 px-2 text-center font-mono text-[11px] tabular-nums text-slate-700">
                                      {course.credits}
                                    </td>
                                    <td className="py-1 px-2 text-center font-mono text-[11px] tabular-nums font-bold text-slate-900">
                                      {grade}
                                    </td>
                                    <td className="py-1 pl-2 pr-2 text-right font-mono text-[11px] tabular-nums text-slate-700">
                                      {course.gpa ? (
                                        points
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic">Non-GPA</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>

                  {/* Year Subtotal Footer */}
                  <div className="pt-1 text-right text-[10.5px] font-mono text-slate-600">
                    <span>
                      {year.title} Summary: {yStat?.gradedCredits || 0} Graded Credits •{' '}
                      {yStat?.totalPoints ? yStat.totalPoints.toFixed(2) : '0.00'} Quality Points •{' '}
                      Year GPA: <strong className="text-slate-900">{yStat?.gradedCredits > 0 ? yStat.gpa.toFixed(2) : '—'}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cumulative Standing & Weighted FGPA Summary */}
          <div className="transcript-summary-block mt-8 pt-5 border-t-2 border-slate-900">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center justify-between">
              <span>Cumulative Degree Standing & FGPA Summary</span>
              <span className="text-[10px] font-mono text-slate-500 normal-case">
                Scale: 4.00 Maximum
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded border border-slate-200">
              <div className="border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
                <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  Cumulative Weighted FGPA
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {stats.currentFgpa.toFixed(2)}
                  <span className="text-xs font-normal text-slate-500 ml-1">/ 4.00</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Curriculum Weight Completed: {Math.round(stats.completedWeightSum * 100)}%
                </div>
              </div>

              <div className="border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
                <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  Honours Classification Standing
                </div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {stats.classAward.name}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Based on earned module grades to date
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  Graded Credit Progress
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {stats.overallGradedCredits}
                  <span className="text-xs font-normal text-slate-500 ml-1">/ 120 Total Credits</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {stats.overallPointsSum > 0
                    ? `${stats.overallPointsSum.toFixed(2)} Total Quality Points`
                    : 'Curriculum in progress'}
                </div>
              </div>
            </div>

            {/* Year-by-Year Contribution Breakdown Table */}
            <div className="mt-3.5 border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs transcript-table border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] uppercase tracking-wider font-semibold">
                    <th className="py-1.5 px-3">Curriculum Tier</th>
                    <th className="py-1.5 px-2 text-center w-24">Weight</th>
                    <th className="py-1.5 px-2 text-center w-28">Year GPA</th>
                    <th className="py-1.5 px-2 text-center w-28">Graded Credits</th>
                    <th className="py-1.5 px-3 text-right w-36">Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(['year1', 'year2', 'year3', 'year4'] as const).map((yKey) => {
                    const year = courseData[yKey];
                    const yStat = stats.yearlyStats[yKey];
                    const weightPercent = Math.round(year.weight * 100);
                    const hasGpa = yStat && yStat.gradedCredits > 0;
                    const contribution = hasGpa ? (yStat.gpa * year.weight).toFixed(3) : '—';

                    return (
                      <tr key={yKey} className="h-6.5 text-[11px]">
                        <td className="py-1 px-3 font-medium text-slate-800">{year.title}</td>
                        <td className="py-1 px-2 text-center font-mono text-slate-600">
                          {weightPercent}%
                        </td>
                        <td className="py-1 px-2 text-center font-mono font-semibold text-slate-900">
                          {hasGpa ? yStat.gpa.toFixed(2) : '—'}
                        </td>
                        <td className="py-1 px-2 text-center font-mono text-slate-600">
                          {yStat?.gradedCredits || 0}
                        </td>
                        <td className="py-1 px-3 text-right font-mono font-medium text-slate-800">
                          {contribution}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-[11px]">
                    <td className="py-2 px-3 text-slate-900" colSpan={4}>
                      Weighted Cumulative FGPA
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-900 text-xs">
                      {stats.currentFgpa.toFixed(2)} / 4.00
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-2 text-[10px] text-slate-500 font-mono">
              Formula: Weighted FGPA = (Y1 GPA × 0.20) + (Y2 GPA × 0.20) + (Y3 GPA × 0.30) + (Y4 GPA × 0.30)
            </div>
          </div>

          {/* Grading System & Honors Classification Standards (Legend) */}
          <div className="transcript-legend-block mt-5 pt-4 border-t border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-2">
              Academic Grading System & Classification Standards
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-[10px]">
              {/* Grading Scale */}
              <div className="md:col-span-7 bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="font-semibold text-slate-700 mb-1">Grade Point Scale (4.00 Max)</div>
                <div className="grid grid-cols-6 gap-x-2 gap-y-1 font-mono text-[9.5px]">
                  <div><strong className="text-slate-900 font-sans">A+</strong> = 4.00</div>
                  <div><strong className="text-slate-900 font-sans">A</strong> = 4.00</div>
                  <div><strong className="text-slate-900 font-sans">A-</strong> = 3.70</div>
                  <div><strong className="text-slate-900 font-sans">B+</strong> = 3.30</div>
                  <div><strong className="text-slate-900 font-sans">B</strong> = 3.00</div>
                  <div><strong className="text-slate-900 font-sans">B-</strong> = 2.70</div>
                  <div><strong className="text-slate-900 font-sans">C+</strong> = 2.30</div>
                  <div><strong className="text-slate-900 font-sans">C</strong> = 2.00</div>
                  <div><strong className="text-slate-900 font-sans">C-</strong> = 1.70</div>
                  <div><strong className="text-slate-900 font-sans">D+</strong> = 1.30</div>
                  <div><strong className="text-slate-900 font-sans">D</strong> = 1.00</div>
                  <div><strong className="text-slate-900 font-sans">E</strong> = 0.00</div>
                </div>
              </div>

              {/* Honours Classification */}
              <div className="md:col-span-5 bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="font-semibold text-slate-700 mb-1">Degree Honours Class Criteria</div>
                <div className="space-y-0.5 text-[9.5px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">First Class Honours:</span>
                    <span className="font-mono font-semibold text-slate-900">FGPA ≥ 3.70</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Second Class (Upper):</span>
                    <span className="font-mono font-semibold text-slate-900">3.30 ≤ FGPA &lt; 3.70</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Second Class (Lower):</span>
                    <span className="font-mono font-semibold text-slate-900">3.00 ≤ FGPA &lt; 3.30</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pass Degree:</span>
                    <span className="font-mono font-semibold text-slate-900">2.00 ≤ FGPA &lt; 3.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer & Verification Footnote */}
          <div className="transcript-disclaimer-block mt-4 pt-3 border-t border-slate-200 text-[9.5px] text-slate-500 leading-relaxed space-y-1.5">
            <div className="p-2 rounded bg-slate-100/70 border border-slate-200 text-slate-700">
              <strong className="uppercase text-[9px] font-bold tracking-wider text-slate-800">
                Unofficial Academic Record Disclaimer:
              </strong>{' '}
              This document is an unofficial student summary compiled electronically for personal record-keeping, self-evaluation, and academic planning purposes only. It is <strong>NOT</strong> an official academic transcript and carries no institutional seal, registrar signature, or legal degree certification. Official academic transcripts must be requested directly from the competent Examination Branch.
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[9px] text-slate-400 font-mono pt-1">
              <div>Generated: {currentDate} • Student ID: {regNo || 'N/A'}</div>
              <div>Document Ref: {documentRef} • Unofficial Student Record</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
