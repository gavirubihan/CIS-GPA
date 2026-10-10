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
import { gradePoints, courseData } from '../data/courseData';
import { getGpaColor } from '../lib/gradeStyles';
import GradeDropdown from './GradeDropdown';

interface ModuleTableProps {
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

export default function ModuleTable({
  activeTab,
  userGrades,
  selectedElectives,
  yearlyStats,
  onGradeChange,
  onElectiveToggle,
  onSelectYear,
  seededCourses,
  studentModifiedCourses,
}: ModuleTableProps) {
  // If activeTab is 'all', show the compact table of years
  if (activeTab === 'all') {
    let totalGradedCredits = 0;
    let totalPoints = 0;

    return (
      <div className="rounded-[12px] border border-border bg-surface overflow-hidden transition-colors shadow-2xs">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Curriculum Overview
          </h2>
          <p className="text-xs text-secondary mt-0.5">
            4-year undergraduate weighting and GPA summary
          </p>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-secondary">
              <th scope="col" className="h-12 px-5 font-medium">Year</th>
              <th scope="col" className="h-12 px-5 font-medium text-center">Weight</th>
              <th scope="col" className="h-12 px-5 font-medium text-center">Credits</th>
              <th scope="col" className="h-12 px-5 font-medium text-right">GPA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-hairline">
            {(['year1', 'year2', 'year3', 'year4'] as const).map((yKey) => {
              const year = courseData[yKey];
              const yStat = yearlyStats[yKey];
              const hasData = yStat && yStat.gradedCredits > 0;
              const gpaDisplay = hasData ? yStat.gpa.toFixed(2) : '—';
              const credits = yStat ? yStat.gradedCredits : 0;
              const weightPercent = Math.round(year.weight * 100);

              if (yStat) {
                totalGradedCredits += yStat.gradedCredits;
                totalPoints += yStat.totalPoints;
              }

              return (
                <tr
                  key={yKey}
                  onClick={() => onSelectYear?.(yKey)}
                  className="h-12 hover:bg-raised/50 cursor-pointer transition-colors"
                >
                  <td className="px-5 font-medium text-foreground">
                    {year.title}
                  </td>
                  <td className="px-5 text-center text-secondary">
                    {weightPercent}%
                  </td>
                  <td className="px-5 text-center font-mono tabular-nums text-foreground">
                    {credits}
                  </td>
                  <td className="px-5 text-right font-mono tabular-nums font-semibold">
                    {hasData ? (
                      <span className={getGpaColor(yStat.gpa).text}>{gpaDisplay}</span>
                    ) : (
                      <span className="text-secondary font-normal">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-raised/30 font-medium text-xs">
              <td className="h-12 px-5 text-secondary">Total / Standing</td>
              <td className="h-12 px-5 text-center text-secondary">100%</td>
              <td className="h-12 px-5 text-center font-mono tabular-nums text-foreground">
                {totalGradedCredits}
              </td>
              <td className="h-12 px-5 text-right font-mono tabular-nums font-bold text-foreground">
                {totalGradedCredits > 0 ? (totalPoints / totalGradedCredits).toFixed(2) : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  // Single year view
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
          <div
            key={semKey}
            className="rounded-[12px] border border-border bg-surface overflow-hidden transition-colors shadow-2xs"
          >
            {/* Semester Header */}
            <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {sem.name}
                </h3>
                {sem.requiredElectiveCredits ? (
                  <p className="text-[11px] text-secondary mt-0.5">
                    Select {sem.requiredElectiveCredits} credits of electives
                  </p>
                ) : null}
              </div>

              {/* Semester subtotal with refined semantic badge */}
              <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                {semStat ? (
                  <>
                    <span className="text-secondary">{semStat.gradedCredits} credits</span>
                    {semHasGrades ? (
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getGpaColor(semStat.gpa).badge}`}>
                        Sem GPA {semStat.gpa.toFixed(2)}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            {/* Module Table (Row height 48px, hairline dividers, no zebra) */}
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-secondary">
                  <th scope="col" className="h-10 px-5 font-medium">Module</th>
                  <th scope="col" className="h-10 px-3 font-medium text-center w-20">Credits</th>
                  <th scope="col" className="h-10 px-4 font-medium w-32">Grade</th>
                  <th scope="col" className="h-10 px-5 font-medium text-right w-24">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {sem.courses.map((course) => {
                  const isElective = course.type === 'Elective';
                  const isSelected = !isElective || !!selectedElectives[course.code];
                  const currentGrade = userGrades[course.code] || '';
                  const points = currentGrade && gradePoints[currentGrade as Grade] !== undefined
                    ? (gradePoints[currentGrade as Grade] * course.credits).toFixed(2)
                    : '—';

                  return (
                    <tr
                      key={course.code}
                      className={`h-12 transition-colors ${
                        isElective && !isSelected
                          ? 'opacity-40 hover:opacity-75'
                          : 'hover:bg-raised/40'
                      }`}
                    >
                      {/* Module Code & Title */}
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-2">
                          {isElective && (
                            <input
                              type="checkbox"
                              checked={!!selectedElectives[course.code]}
                              onChange={(e) => onElectiveToggle(course.code, e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-border accent-[var(--accent)] cursor-pointer"
                              aria-label={`Select elective ${course.code}`}
                            />
                          )}
                          <span className="font-mono text-xs text-secondary">
                            {course.code}
                          </span>
                          <span className="font-normal text-foreground truncate max-w-sm">
                            {course.title}
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
                      </td>

                      {/* Credits */}
                      <td className="px-3 py-2 text-center font-mono tabular-nums text-secondary">
                        {course.credits}
                      </td>

                      {/* Grade Selector (Custom UI dropdown) */}
                      <td className="px-4 py-2 w-32">
                        <GradeDropdown
                          value={currentGrade}
                          onChange={(grade) => onGradeChange(course.code, grade)}
                          disabled={isElective && !isSelected}
                          ariaLabel={`Grade for ${course.code}`}
                        />
                      </td>

                      {/* Quality Points */}
                      <td className="px-5 py-2 text-right font-mono tabular-nums">
                        {course.gpa && isSelected ? (
                          <span className={currentGrade ? 'font-semibold text-foreground' : 'text-secondary font-normal'}>
                            {points}
                          </span>
                        ) : (
                          <span className="text-secondary font-normal">—</span>
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

      {/* Empty State */}
      {!yearHasGrades && (
        <div className="text-center py-6 text-xs text-secondary">
          No grades for this year yet.
        </div>
      )}
    </div>
  );
}
