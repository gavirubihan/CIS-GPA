'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Scale, Info } from 'lucide-react';
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
  { label: 'First Class', minGpa: 3.70, color: '#10B981' },
  { label: 'Second Upper', minGpa: 3.30, color: '#3B82F6' },
  { label: 'Second Lower', minGpa: 2.70, color: '#F59E0B' },
  { label: 'Pass', minGpa: 2.00, color: '#A1A1AA' },
];

export default function TargetPlanner({ stats }: TargetPlannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<number>(3.70);

  const { yearlyStats, currentFgpa } = stats;

  // ─────────────────────────────────────────────────────────────────────────────
  // Exact Mathematical Formulation with Progressive Year Weights:
  // FGPA = 0.20*(Y1 GPA) + 0.20*(Y2 GPA) + 0.30*(Y3 GPA) + 0.30*(Y4 GPA)
  //
  // For each year j:
  // - Weight aj = 0.20 (Y1, Y2) or 0.30 (Y3, Y4)
  // - Total GPA credits = Nj
  // - Completed quality points = Qj_done
  // - Completed credits = cj_done
  // - Remaining credits = cj_rem = Nj - cj_done
  //
  // Locked FGPA Contribution = Σ (aj / Nj) * Qj_done
  // Remaining Weight = Σ (aj / Nj) * cj_rem
  // Required Average GPA across remaining credits = (Target - Locked FGPA) / Remaining Weight
  // ─────────────────────────────────────────────────────────────────────────────

  let totalCurriculumGpaCredits = 0;
  let totalLockedFgpaPoints = 0;
  let totalRemainingEffectiveWeight = 0;
  let totalRemainingCredits = 0;

  interface YearProgress {
    yearKey: string;
    title: string;
    weightPercent: number;
    totalCredits: number;
    gradedCredits: number;
    remainingCredits: number;
    effectiveWeightRemaining: number;
    currentGpa: number;
    isFullyDone: boolean;
  }

  const yearProgressList: YearProgress[] = [];

  for (const yearKey of ['year1', 'year2', 'year3', 'year4']) {
    const year = courseData[yearKey];
    const yStat = yearlyStats[yearKey];

    // Compute total GPA credits planned for this year (Compulsory GPA + required electives)
    let yearGpaCredits = 0;
    if (year) {
      for (const semKey in year.semesters) {
        const sem = year.semesters[semKey];
        sem.courses.forEach((c) => {
          if (c.gpa && c.type === 'Compulsory') {
            yearGpaCredits += c.credits;
          }
        });
        if (sem.requiredElectiveCredits) {
          yearGpaCredits += sem.requiredElectiveCredits;
        }
      }
    }

    const gradedCredits = yStat ? yStat.gradedCredits : 0;
    const earnedPoints = yStat ? yStat.totalPoints : 0;
    const currentGpa = gradedCredits > 0 ? earnedPoints / gradedCredits : 0;
    const remainingCredits = Math.max(0, yearGpaCredits - gradedCredits);
    const weight = year?.weight ?? 0.25;

    // Weight carried by each credit in this specific year
    const weightPerCredit = yearGpaCredits > 0 ? weight / yearGpaCredits : 0;

    // Locked FGPA points earned from this year so far
    const lockedPoints = earnedPoints * weightPerCredit;

    // Weight of remaining uncompleted credits in this year
    const effectiveWeightRemaining = remainingCredits * weightPerCredit;

    totalCurriculumGpaCredits += yearGpaCredits;
    totalLockedFgpaPoints += lockedPoints;
    totalRemainingEffectiveWeight += effectiveWeightRemaining;
    totalRemainingCredits += remainingCredits;

    yearProgressList.push({
      yearKey,
      title: year.title,
      weightPercent: Math.round(weight * 100),
      totalCredits: yearGpaCredits,
      gradedCredits,
      remainingCredits,
      effectiveWeightRemaining,
      currentGpa,
      isFullyDone: remainingCredits === 0 && gradedCredits > 0,
    });
  }

  // Calculate needed FGPA points to hit target
  const neededFgpaPoints = selectedTarget - totalLockedFgpaPoints;

  let requiredAvgGpa: number | null = null;
  let statusText = 'Achievable';
  let statusColor = '#10B981'; // Emerald
  let resultLine = '';

  if (totalRemainingEffectiveWeight <= 0.001 || totalRemainingCredits === 0) {
    statusText = 'Degree completed';
    const finalFgpa = Math.round((currentFgpa + Number.EPSILON) * 100) / 100;
    statusColor = finalFgpa >= selectedTarget ? '#10B981' : '#71717A';
    resultLine = `Final degree standing is ${finalFgpa.toFixed(2)}.`;
  } else {
    // Exact required average across all remaining credits, factoring in their respective year weights
    requiredAvgGpa = neededFgpaPoints / totalRemainingEffectiveWeight;

    if (requiredAvgGpa <= 0) {
      statusText = 'Target Secured';
      statusColor = '#10B981';
      resultLine = `Your completed coursework already secures this degree class.`;
    } else if (requiredAvgGpa <= 3.30) {
      statusText = 'Easily Achievable';
      statusColor = '#10B981';
      resultLine = `You need an average of ${requiredAvgGpa.toFixed(2)} across the remaining ${totalRemainingCredits} credits.`;
    } else if (requiredAvgGpa <= 3.70) {
      statusText = 'Achievable';
      statusColor = '#3B82F6';
      resultLine = `You need an average of ${requiredAvgGpa.toFixed(2)} across the remaining ${totalRemainingCredits} credits.`;
    } else if (requiredAvgGpa <= 4.00) {
      statusText = 'Challenging';
      statusColor = '#F59E0B';
      resultLine = `You need a strong average of ${requiredAvgGpa.toFixed(2)} across the remaining ${totalRemainingCredits} credits.`;
    } else {
      statusText = 'Out of reach';
      statusColor = '#EF4444';
      resultLine = `Target requires an average of ${requiredAvgGpa.toFixed(2)}, which exceeds the 4.00 maximum.`;
    }
  }

  // Meter percentage (0 to 100% of 4.0 scale)
  const meterRatio = requiredAvgGpa !== null
    ? Math.min(100, Math.max(0, (requiredAvgGpa / 4.0) * 100))
    : 0;

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
            Target degree planner
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-secondary text-xs">
          <span>{isOpen ? 'Hide' : 'Calculate required GPA'}</span>
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-secondary font-medium block">
                Select target class
              </label>
              <span className="text-[11px] text-secondary font-mono">
                Weights: Y1 20% · Y2 20% · Y3 30% · Y4 30%
              </span>
            </div>

            <div className="inline-flex p-1 rounded-[8px] bg-raised border border-border gap-1 flex-wrap w-full sm:w-auto">
              {TARGET_CLASSES.map((opt) => {
                const isSelected = selectedTarget === opt.minGpa;
                return (
                  <button
                    key={opt.minGpa}
                    type="button"
                    onClick={() => setSelectedTarget(opt.minGpa)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors focus-visible:outline-none flex-1 sm:flex-initial justify-center ${
                      isSelected
                        ? 'bg-surface text-foreground shadow-xs font-semibold border border-border'
                        : 'text-secondary hover:text-foreground'
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: opt.color }}
                    />
                    <span>{opt.label} ({opt.minGpa.toFixed(2)})</span>
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
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <div 
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: `${statusColor}15`,
                  borderColor: `${statusColor}40`,
                  color: statusColor,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                <span>{statusText}</span>
              </div>

              {totalRemainingCredits > 0 && (
                <span className="text-xs text-secondary font-mono">
                  Locked FGPA: <span className="text-foreground font-semibold">{totalLockedFgpaPoints.toFixed(2)}</span> / {selectedTarget.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Required GPA progress meter */}
          {totalRemainingCredits > 0 && requiredAvgGpa !== null && requiredAvgGpa > 0 && (
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
                <span className="text-foreground font-medium">Needed: {requiredAvgGpa.toFixed(2)}</span>
                <span>Max 4.00</span>
              </div>
            </div>
          )}

          {/* Year-by-Year Weight & Credit Progress Breakdown */}
          <div className="pt-2 border-t border-border-hairline">
            <div className="flex items-center gap-1.5 text-xs font-medium text-secondary mb-2.5">
              <Scale className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Weight distribution across academic years:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {yearProgressList.map((yp) => {
                const isPartiallyDone = yp.gradedCredits > 0 && yp.remainingCredits > 0;
                return (
                  <div
                    key={yp.yearKey}
                    className="rounded-[8px] border border-border bg-raised/50 p-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">{yp.title}</span>
                      <span className="font-mono text-secondary">{yp.weightPercent}% weight</span>
                    </div>

                    <div className="text-[11px] text-secondary">
                      {yp.isFullyDone ? (
                        <span className="text-emerald-500 font-medium">✓ Completed ({yp.currentGpa.toFixed(2)})</span>
                      ) : isPartiallyDone ? (
                        <span>
                          <span className="text-indigo-400 font-medium">{yp.remainingCredits} cr left</span>
                          <span className="text-secondary/80"> ({(yp.effectiveWeightRemaining * 100).toFixed(1)}% rem)</span>
                        </span>
                      ) : (
                        <span>{yp.totalCredits} cr ({yp.weightPercent}% rem)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* High-Impact Module Context */}
          <div className="flex items-start gap-2 text-xs text-secondary pt-1">
            <Info className="h-4 w-4 mt-0.5 text-indigo-400 shrink-0" strokeWidth={1.5} />
            <div className="leading-relaxed">
              <span>Because Year 3 and Year 4 are weighted at <strong>30% each</strong>, credits in senior years have <strong>1.5× the impact</strong> on your final FGPA compared to Year 1 and 2 (e.g. the 8-credit Year 4 Research Project carries ~6.9% of your entire degree).</span>
            </div>
          </div>

        </div>
      )}
    </section>
  );
}
