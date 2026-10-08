'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { OverallStats } from '../types';
import { courseData } from '../data/courseData';

interface TargetPlannerProps {
  stats: OverallStats;
}

interface TargetClassOption {
  label: string;
  minGpa: number;
  color: string;
}

const TARGET_CLASSES: TargetClassOption[] = [
  { label: 'First', minGpa: 3.70, color: '#10B981' },
  { label: 'Upper', minGpa: 3.30, color: '#3B82F6' },
  { label: 'Lower', minGpa: 2.70, color: '#F59E0B' },
  { label: 'Pass', minGpa: 2.00, color: '#A1A1AA' },
];

export default function TargetPlanner({ stats }: TargetPlannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<number>(3.70);

  const { yearlyStats, currentFgpa, overallGradedCredits } = stats;

  // Calculate completed & remaining weights
  let completedWeight = 0;
  let currentWeightedSum = 0;
  let totalCurriculumGpaCredits = 0;

  for (const yearKey in courseData) {
    const year = courseData[yearKey];
    const yStat = yearlyStats[yearKey];

    if (yStat && yStat.gradedCredits > 0) {
      completedWeight += year.weight;
      currentWeightedSum += yStat.gpa * year.weight;
    }

    for (const semKey in year.semesters) {
      const sem = year.semesters[semKey];
      sem.courses.forEach((c) => {
        if (c.gpa && c.type === 'Compulsory') {
          totalCurriculumGpaCredits += c.credits;
        }
      });
      if (sem.requiredElectiveCredits) {
        totalCurriculumGpaCredits += sem.requiredElectiveCredits;
      }
    }
  }

  // Normalize remaining weight & remaining credits
  const remainingWeight = Math.max(0, +(1.0 - completedWeight).toFixed(2));
  const remainingCredits = Math.max(0, totalCurriculumGpaCredits - overallGradedCredits);

  // Compute required average GPA
  let requiredAvgGpa: number | null = null;
  let statusText = 'Achievable';
  let statusColor = '#10B981'; // Green
  let resultLine = '';

  if (remainingWeight <= 0) {
    statusText = 'Degree completed';
    statusColor = currentFgpa >= selectedTarget ? '#10B981' : '#71717A';
    resultLine = `Final degree standing is ${currentFgpa.toFixed(2)}.`;
  } else {
    const neededWeightedPoints = (selectedTarget * 1.0) - currentWeightedSum;
    requiredAvgGpa = neededWeightedPoints / remainingWeight;

    if (requiredAvgGpa <= 0) {
      statusText = 'Achievable';
      statusColor = '#10B981';
      resultLine = `Your completed coursework already secures this degree class.`;
    } else if (requiredAvgGpa <= 3.30) {
      statusText = 'Achievable';
      statusColor = '#10B981';
      resultLine = `You need an average of ${requiredAvgGpa.toFixed(2)} across the remaining ${remainingCredits} credits.`;
    } else if (requiredAvgGpa <= 4.00) {
      statusText = 'Challenging';
      statusColor = '#F59E0B';
      resultLine = `You need an average of ${requiredAvgGpa.toFixed(2)} across the remaining ${remainingCredits} credits.`;
    } else {
      statusText = 'Not reachable';
      statusColor = '#EF4444';
      resultLine = `Target requires an average of ${requiredAvgGpa.toFixed(2)}, which exceeds 4.00.`;
    }
  }

  // Meter percentage (0 to 100% of 4.0 scale)
  const meterRatio = requiredAvgGpa !== null
    ? Math.min(100, Math.max(0, (requiredAvgGpa / 4.0) * 100))
    : 0;

  // Single data-driven suggestion line
  let dataDrivenNote: string | null = null;
  const year4Stat = yearlyStats['year4'];
  const year3Stat = yearlyStats['year3'];
  if (!year4Stat || year4Stat.gradedCredits === 0) {
    dataDrivenNote = 'The Year 4 research project carries 8 credits.';
  } else if (!year3Stat || year3Stat.gradedCredits === 0) {
    dataDrivenNote = 'Industrial Training in Year 3 carries 6 credits.';
  }

  return (
    <section className="rounded-[12px] border border-border bg-surface transition-colors overflow-hidden shadow-2xs">
      {/* Header toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 sm:p-5 text-left hover:bg-raised/40 transition-colors focus-visible:outline-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            Target planner
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-secondary text-xs">
          <span>{isOpen ? 'Hide' : 'Calculate'}</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {isOpen && (
        <div className="border-t border-border p-5 sm:p-6 space-y-5 animate-in fade-in duration-150">
          
          {/* Segmented control for target class */}
          <div>
            <label className="text-xs text-secondary font-medium block mb-2">
              Target class
            </label>
            <div className="inline-flex p-1 rounded-[8px] bg-raised border border-border gap-1 flex-wrap">
              {TARGET_CLASSES.map((opt) => {
                const isSelected = selectedTarget === opt.minGpa;
                return (
                  <button
                    key={opt.minGpa}
                    type="button"
                    onClick={() => setSelectedTarget(opt.minGpa)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors focus-visible:outline-none ${
                      isSelected
                        ? 'bg-surface text-foreground shadow-xs font-semibold border border-border'
                        : 'text-secondary hover:text-foreground'
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: opt.color }}
                    />
                    <span>{opt.label} {opt.minGpa.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Result line and status badge */}
          <div>
            <p className="text-[20px] font-semibold tracking-tight text-foreground leading-snug">
              {resultLine}
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: `${statusColor}15`,
                borderColor: `${statusColor}40`,
                color: statusColor,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
              <span>{statusText}</span>
            </div>
          </div>

          {/* Small meter showing required GPA against 4.00 maximum with gradient */}
          {remainingWeight > 0 && requiredAvgGpa !== null && (
            <div className="space-y-1.5 max-w-md">
              <div className="h-1.5 w-full rounded-full bg-raised overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 shadow-sm"
                  style={{
                    width: `${meterRatio}%`,
                    background: `linear-gradient(90deg, #6366F1 0%, ${statusColor} 100%)`,
                    boxShadow: `0 0 8px ${statusColor}35`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-secondary font-mono">
                <span>0.00</span>
                <span>Max 4.00</span>
              </div>
            </div>
          )}

          {/* At most one data-driven note */}
          {dataDrivenNote && (
            <p className="text-xs text-secondary border-t border-border-hairline pt-3">
              {dataDrivenNote}
            </p>
          )}

        </div>
      )}
    </section>
  );
}
