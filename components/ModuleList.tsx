'use client';

import React from 'react';
import { 
  YearData, 
  SemesterStats, 
  YearStats, 
  UserGrades, 
  SelectedElectives, 
  Grade 
} from '../types';
import { courseData } from '../data/courseData';
import { getGpaColor } from '../lib/gradeStyles';
import GradeDropdown from './GradeDropdown';

interface ModuleListProps {
  activeTab: string;
  userGrades: UserGrades;
  selectedElectives: SelectedElectives;
  yearlyStats: Record<string, YearStats>;
  onGradeChange: (code: string, grade: string) => void;
  onElectiveToggle: (code: string, checked: boolean) => void;
  onSelectYear?: (yearKey: string) => void;
  seededCourses?: string[];
  studentModifiedCourses?: string[];
}

export default function ModuleList({
  activeTab,
  userGrades,
  selectedElectives,
  yearlyStats,
  onGradeChange,
  onElectiveToggle,
  onSelectYear,
  seededCourses,
  studentModifiedCourses,
}: ModuleListProps) {
  // Mobile 'all' view: compact list of 4 years
  if (activeTab === 'all') {
    return (
      <div className="rounded-[12px] border border-border bg-surface p-4 transition-colors shadow-2xs">
        <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Curriculum Overview
        </h2>
        <div className="mt-3 divide-y divide-border-hairline">
          {(['year1', 'year2', 'year3', 'year4'] as const).map((yKey) => {
            const year = courseData[yKey];
            const yStat = yearlyStats[yKey];
            const hasData = yStat && yStat.gradedCredits > 0;
            const weightPercent = Math.round(year.weight * 100);

            return (
              <button
                key={yKey}
                onClick={() => onSelectYear?.(yKey)}
                type="button"
                className="w-full flex items-center justify-between py-3 text-xs text-left"
              >
                <div>
                  <p className="font-semibold text-foreground">{year.title}</p>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Weight {weightPercent}% · {yStat ? yStat.gradedCredits : 0} credits
                  </p>
                </div>
                <div className="font-mono tabular-nums font-semibold text-sm">
                  {hasData ? (
                    <span className={getGpaColor(yStat.gpa).text}>{yStat.gpa.toFixed(2)}</span>
                  ) : (
                    <span className="text-secondary font-normal">—</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const currentYear: YearData | undefined = courseData[activeTab];
  if (!currentYear) return null;

  const yStat = yearlyStats[activeTab];
  const yearHasGrades = yStat && yStat.gradedCredits > 0;

  return (
    <div className="space-y-6">
      {Object.entries(currentYear.semesters).map(([semKey, sem]) => {
        const semStat: SemesterStats | undefined = yStat?.semesterStats?.[semKey];
        const semHasGrades = semStat && semStat.gradedCredits > 0;

        return (
          <div key={semKey} className="space-y-2">
            {/* Semester Heading & Subtotal */}
            <div className="flex items-baseline justify-between px-1">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {sem.name}
                </h3>
                {sem.requiredElectiveCredits ? (
                  <p className="text-[11px] text-secondary">
                    {semStat?.selectedElectiveCredits || 0}/{sem.requiredElectiveCredits} elective credits selected
                  </p>
                ) : null}
              </div>

              {semStat ? (
                <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
                  <span className="text-secondary">{semStat.gradedCredits} cr</span>
                  {semHasGrades ? (
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getGpaColor(semStat.gpa).badge}`}>
                      GPA {semStat.gpa.toFixed(2)}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Stacked Rows in Card */}
            <div className="rounded-[12px] border border-border bg-surface divide-y divide-border-hairline overflow-hidden transition-colors shadow-2xs">
              {sem.courses.map((course) => {
                const isElective = course.type === 'Elective';
                const isSelected = !isElective || !!selectedElectives[course.code];
                const currentGrade = userGrades[course.code] || '';

                return (
                  <div
                    key={course.code}
                    className={`p-3.5 flex items-center justify-between gap-3 ${
                      isElective && !isSelected ? 'opacity-40' : ''
                    }`}
                  >
                    {/* Left: Title, Code, Credits */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isElective && (
                          <input
                            type="checkbox"
                            checked={!!selectedElectives[course.code]}
                            onChange={(e) => onElectiveToggle(course.code, e.target.checked)}
                            className="h-4 w-4 rounded border-border accent-[var(--accent)] cursor-pointer"
                            aria-label={`Select elective ${course.code}`}
                          />
                        )}
                        <span className="font-mono text-xs text-secondary">
                          {course.code}
                        </span>
                        {isElective && (
                          <span className="text-[10px] text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/25 px-1.5 py-0.2 rounded-full font-medium">
                            Elective
                          </span>
                        )}
                        {!course.gpa && (
                          <span className="text-[10px] text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/25 px-1.5 py-0.2 rounded-full font-medium">
                            Non-GPA
                          </span>
                        )}
                        {currentGrade && seededCourses?.includes(course.code) && !studentModifiedCourses?.includes(course.code) && (
                          <span
                            title="Grade pre-filled from results sheet"
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.2 rounded-full font-medium"
                          >
                            Seeded
                          </span>
                        )}
                        {currentGrade && (studentModifiedCourses?.includes(course.code) || (!seededCourses?.includes(course.code) && (seededCourses && seededCourses.length > 0))) && (
                          <span
                            title="Custom grade modified or entered by student"
                            className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.2 rounded-full font-medium"
                          >
                            Custom
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-medium text-foreground mt-1 line-clamp-2">
                        {course.title}
                      </p>

                      <p className="text-[11px] text-secondary font-mono tabular-nums mt-0.5">
                        {course.credits} {course.credits === 1 ? 'credit' : 'credits'}
                      </p>
                    </div>

                    {/* Right: Grade Select with custom UI dropdown (>= 44px touch target) */}
                    <div className="shrink-0 w-28">
                      <GradeDropdown
                        value={currentGrade}
                        onChange={(grade) => onGradeChange(course.code, grade)}
                        disabled={isElective && !isSelected}
                        ariaLabel={`Grade for ${course.code}`}
                        size="md"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {!yearHasGrades && (
        <div className="text-center py-6 text-xs text-secondary">
          No grades for this year yet.
        </div>
      )}
    </div>
  );
}
