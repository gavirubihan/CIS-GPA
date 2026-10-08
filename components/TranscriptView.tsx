'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';
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
  const { user, regNo } = useAuth();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const displayName = studentName || user?.displayName || regNo || 'Undergraduate Student';
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-label="Academic Transcript"
    >
      <div className="relative w-full max-w-3xl rounded-[12px] border border-border bg-surface shadow-2xl my-auto overflow-hidden">
        
        {/* Modal Top Controls (Hidden during print) */}
        <div className="no-print flex items-center justify-between border-b border-border px-5 py-3.5 bg-surface">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Academic Transcript
            </h2>
            <p className="text-xs text-secondary">
              Official curriculum statement preview
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-accent px-3.5 text-xs font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] transition-colors focus-visible:outline-none"
            >
              <Printer className="h-4 w-4" strokeWidth={1.5} />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-border bg-surface text-secondary hover:text-foreground hover:bg-raised transition-colors focus-visible:outline-none"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 max-h-[80vh] overflow-y-auto transcript-print-container bg-surface text-foreground">
          
          {/* Header */}
          <div className="border-b border-border pb-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-secondary font-semibold">
                  Sabaragamuwa University of Sri Lanka
                </p>
                <h1 className="text-base sm:text-lg font-semibold text-foreground mt-0.5">
                  Faculty of Applied Sciences · Department of CIS
                </h1>
                <p className="text-xs text-secondary mt-0.5">
                  B.Sc. (Hons) in Information Systems
                </p>
              </div>

              <div className="text-xs text-secondary sm:text-right font-mono">
                <div>Date: {currentDate}</div>
                <div>Scale: 4.00 Max</div>
              </div>
            </div>

            {/* Student details */}
            <div className="mt-4 pt-3 border-t border-border-hairline flex flex-wrap justify-between gap-3 text-xs">
              <div>
                <span className="text-secondary">Student: </span>
                <span className="font-semibold text-foreground">{displayName}</span>
              </div>
              {regNo && (
                <div>
                  <span className="text-secondary">Registration No: </span>
                  <span className="font-mono font-semibold text-foreground">{regNo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Academic Tables per year */}
          <div className="mt-6 space-y-6">
            {(['year1', 'year2', 'year3', 'year4'] as const).map((yKey) => {
              const year = courseData[yKey];
              const yStat = stats.yearlyStats[yKey];
              const weightPercent = Math.round(year.weight * 100);

              return (
                <div key={yKey} className="space-y-2">
                  <div className="flex items-baseline justify-between border-b border-border-hairline pb-1">
                    <span className="text-xs font-semibold text-foreground">
                      {year.title} (Weight {weightPercent}%)
                    </span>
                    <span className="text-xs font-mono tabular-nums text-secondary">
                      Year GPA: {yStat?.gradedCredits > 0 ? yStat.gpa.toFixed(2) : '—'} ({yStat?.gradedCredits || 0} credits)
                    </span>
                  </div>

                  <table className="w-full text-left text-xs transcript-table border-collapse">
                    <thead>
                      <tr className="border-b border-border text-secondary">
                        <th className="py-2 pr-2 font-medium w-20">Code</th>
                        <th className="py-2 px-2 font-medium">Module Title</th>
                        <th className="py-2 px-2 font-medium text-center w-16">Credits</th>
                        <th className="py-2 px-2 font-medium text-center w-16">Grade</th>
                        <th className="py-2 pl-2 font-medium text-right w-16">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-hairline">
                      {Object.entries(year.semesters).flatMap(([_, sem]) =>
                        sem.courses.map((course) => {
                          const isElective = course.type === 'Elective';
                          const isSelected = !isElective || !!selectedElectives[course.code];
                          if (isElective && !isSelected) return null;

                          const grade = userGrades[course.code] || '—';
                          const points = grade && gradePoints[grade as Grade] !== undefined
                            ? (gradePoints[grade as Grade] * course.credits).toFixed(2)
                            : '—';

                          return (
                            <tr key={course.code} className="h-8">
                              <td className="py-1.5 pr-2 font-mono text-secondary">{course.code}</td>
                              <td className="py-1.5 px-2 text-foreground truncate max-w-xs">{course.title}</td>
                              <td className="py-1.5 px-2 text-center font-mono tabular-nums text-secondary">{course.credits}</td>
                              <td className="py-1.5 px-2 text-center font-mono tabular-nums font-medium text-foreground">{grade}</td>
                              <td className="py-1.5 pl-2 text-right font-mono tabular-nums text-secondary">
                                {course.gpa ? points : 'Non-GPA'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* Final Cumulative Standing */}
          <div className="mt-8 border-t border-border pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-secondary">Final Degree Standing</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {stats.classAward.name}
              </div>
            </div>

            <div className="flex items-baseline gap-6 text-xs">
              <div>
                <span className="text-secondary">Completed Credits: </span>
                <span className="font-mono font-semibold text-foreground">{stats.overallGradedCredits} / 120</span>
              </div>
              <div>
                <span className="text-secondary">Final GPA: </span>
                <span className="font-mono font-bold text-base text-foreground tabular-nums">
                  {stats.currentFgpa.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Transcript Note */}
          <div className="mt-6 border-t border-border-hairline pt-3 text-[11px] text-secondary">
            Weighted FGPA Formula: (Y1 × 20%) + (Y2 × 20%) + (Y3 × 30%) + (Y4 × 30%).
          </div>

        </div>

      </div>
    </div>
  );
}
