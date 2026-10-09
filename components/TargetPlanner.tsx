'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Target, CheckCircle2 } from 'lucide-react';
import { OverallStats } from '../types';
import { courseData } from '../data/courseData';

interface TargetPlannerProps {
  stats: OverallStats;
  forceOpen?: boolean;
}

interface TargetClassOption {
  label: string;
  shortLabel: string;
  minGpa: number;
  color: string;
}

const TARGET_CLASSES: TargetClassOption[] = [
  { label: 'First Class', shortLabel: '1st Class', minGpa: 3.70, color: '#10B981' },
  { label: 'Second Upper', shortLabel: '2nd Upper', minGpa: 3.30, color: '#3B82F6' },
  { label: 'Second Lower', shortLabel: '2nd Lower', minGpa: 2.70, color: '#F59E0B' },
  { label: 'Pass', shortLabel: 'Pass', minGpa: 2.00, color: '#A1A1AA' },
];

function getGradeAdvice(avgGpa: number | null): string {
  if (avgGpa === null) return '';
  if (avgGpa <= 0) return 'Class already secured!';
  if (avgGpa > 4.0) return 'Exceeds 4.00 max';
  if (avgGpa >= 3.90) return 'Aim for mostly A+ / A';
  if (avgGpa >= 3.70) return 'Aim for A average';
  if (avgGpa >= 3.30) return 'Aim for A- / B+ average';
  if (avgGpa >= 3.00) return 'Aim for B / B+ average';
  if (avgGpa >= 2.70) return 'Aim for B- / C+ average';
  if (avgGpa >= 2.00) return 'Aim for C average';
  return 'Passing grades required';
}

export default function TargetPlanner({ stats, forceOpen = false }: TargetPlannerProps) {
  const [isOpen, setIsOpen] = useState(forceOpen);
  const [selectedTarget, setSelectedTarget] = useState<number>(3.70);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const { yearlyStats, currentFgpa } = stats;

  // ─────────────────────────────────────────────────────────────────────────────
  // Exact Mathematical Formulation with Progressive Year Weights:
  // FGPA = 0.20*(Y1) + 0.20*(Y2) + 0.30*(Y3) + 0.30*(Y4)
  // ─────────────────────────────────────────────────────────────────────────────
  let totalCurriculumGpaCredits = 0;
  let totalLockedFgpaPoints = 0;
  let totalRemainingEffectiveWeight = 0;
  let totalRemainingCredits = 0;

  interface YearItem {
    yearKey: string;
    title: string;
    shortTitle: string;
    weightPercent: number;
    totalCredits: number;
    gradedCredits: number;
    remainingCredits: number;
    currentGpa: number;
    isDone: boolean;
    isInProgress: boolean;
  }

  const yearList: YearItem[] = [];

  for (const yearKey of ['year1', 'year2', 'year3', 'year4']) {
    const year = courseData[yearKey];
    const yStat = yearlyStats[yearKey];

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

    const weightPerCredit = yearGpaCredits > 0 ? weight / yearGpaCredits : 0;
    const lockedPoints = earnedPoints * weightPerCredit;
    const effectiveWeightRemaining = remainingCredits * weightPerCredit;

    totalCurriculumGpaCredits += yearGpaCredits;
    totalLockedFgpaPoints += lockedPoints;
    totalRemainingEffectiveWeight += effectiveWeightRemaining;
    totalRemainingCredits += remainingCredits;

    const isDone = remainingCredits === 0 && gradedCredits > 0;
    const isInProgress = gradedCredits > 0 && remainingCredits > 0;

    const shortTitleMap: Record<string, string> = {
      year1: 'Y1',
      year2: 'Y2',
      year3: 'Y3',
      year4: 'Y4',
    };

    yearList.push({
      yearKey,
      title: year.title,
      shortTitle: shortTitleMap[yearKey] || yearKey,
      weightPercent: Math.round(weight * 100),
      totalCredits: yearGpaCredits,
      gradedCredits,
      remainingCredits,
      currentGpa,
      isDone,
      isInProgress,
    });
  }

  const neededFgpaPoints = selectedTarget - totalLockedFgpaPoints;

  let requiredAvgGpa: number | null = null;
  let statusText = 'Achievable';
  let statusColor = '#3B82F6'; // Blue
  let isTargetSecured = false;
  let isOutOfReach = false;

  if (totalRemainingEffectiveWeight <= 0.001 || totalRemainingCredits === 0) {
    const finalFgpa = Math.round((currentFgpa + Number.EPSILON) * 100) / 100;
    statusText = finalFgpa >= selectedTarget ? 'Achieved' : 'Final';
    statusColor = finalFgpa >= selectedTarget ? '#10B981' : '#71717A';
  } else {
    requiredAvgGpa = neededFgpaPoints / totalRemainingEffectiveWeight;

    if (requiredAvgGpa <= 0) {
      statusText = 'Secured';
      statusColor = '#10B981';
      isTargetSecured = true;
    } else if (requiredAvgGpa <= 3.30) {
      statusText = 'Comfortable';
      statusColor = '#10B981';
    } else if (requiredAvgGpa <= 3.70) {
      statusText = 'Achievable';
      statusColor = '#3B82F6';
    } else if (requiredAvgGpa <= 4.00) {
      statusText = 'Challenging';
      statusColor = '#F59E0B';
    } else {
      statusText = 'Out of reach';
      statusColor = '#EF4444';
      isOutOfReach = true;
    }
  }

  // Meter percentage (0 to 100% of 4.0 scale)
  const meterRatio = requiredAvgGpa !== null
    ? Math.min(100, Math.max(0, (requiredAvgGpa / 4.0) * 100))
    : 0;

  const currentClassOption = TARGET_CLASSES.find((c) => c.minGpa === selectedTarget) || TARGET_CLASSES[0];

  return (
    <section className="rounded-[14px] border border-border bg-surface transition-colors overflow-hidden shadow-2xs">
      {/* Header button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-3.5 sm:p-4 text-left hover:bg-raised/40 transition-colors focus-visible:outline-none cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-accent/10 text-accent border border-accent/20">
            <Target className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-semibold text-foreground tracking-tight">
              Target degree planner
            </span>

            {/* Live forecast status chip visible when collapsed */}
            {!isOpen && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                style={{
                  backgroundColor: `${statusColor}12`,
                  borderColor: `${statusColor}30`,
                  color: statusColor,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                <span>
                  {currentClassOption.shortLabel}:{' '}
                  <strong className="font-mono">
                    {isTargetSecured ? 'Secured' : requiredAvgGpa ? `${requiredAvgGpa.toFixed(2)} req` : '—'}
                  </strong>
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-secondary text-xs shrink-0">
          <span className="font-medium hidden sm:inline">
            {isOpen ? 'Collapse' : 'Forecast target class'}
          </span>
          <span className="font-medium sm:hidden">
            {isOpen ? 'Close' : 'Forecast'}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-secondary" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="h-4 w-4 text-secondary" strokeWidth={1.5} />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {isOpen && (
        <div className="border-t border-border p-4 sm:p-5 space-y-4 sm:space-y-5 animate-in fade-in duration-150">
          
          {/* Target class segmented control (Mobile-optimized 2x2 or 4-row) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-secondary uppercase tracking-wider block">
              Choose Target Award
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-[10px] bg-raised/70 border border-border">
              {TARGET_CLASSES.map((opt) => {
                const isSelected = selectedTarget === opt.minGpa;
                return (
                  <button
                    key={opt.minGpa}
                    type="button"
                    onClick={() => setSelectedTarget(opt.minGpa)}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-[7px] text-xs transition-all focus-visible:outline-none min-h-[36px] ${
                      isSelected
                        ? 'bg-surface text-foreground font-semibold shadow-xs border border-border'
                        : 'text-secondary hover:text-foreground hover:bg-surface/50'
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: opt.color }}
                    />
                    <span className="truncate">{opt.shortLabel}</span>
                    <span className="font-mono text-[11px] text-secondary tabular-nums">
                      {opt.minGpa.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hero Forecast Card */}
          <div className="rounded-[12px] border border-border bg-raised/30 p-4 sm:p-4.5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Primary Stat */}
              <div>
                <span className="text-[11px] font-medium text-secondary block">
                  Required Remaining Average
                </span>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span
                    className="text-3xl sm:text-4xl font-bold font-mono tracking-tight tabular-nums"
                    style={{ color: statusColor }}
                  >
                    {isTargetSecured ? '0.00' : requiredAvgGpa ? requiredAvgGpa.toFixed(2) : '—'}
                  </span>
                  <span className="text-xs text-secondary font-medium">
                    / 4.00 GPA
                  </span>
                </div>
              </div>

              {/* Status Badge & Advice Pill */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: `${statusColor}15`,
                    borderColor: `${statusColor}35`,
                    color: statusColor,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                  {statusText}
                </span>

                <span className="text-xs text-foreground font-medium">
                  {getGradeAdvice(requiredAvgGpa)}
                </span>
              </div>
            </div>

            {/* Context line */}
            <p className="text-xs text-secondary">
              {isTargetSecured ? (
                <span className="text-emerald-500 font-medium">
                  Your completed coursework already secures {currentClassOption.label}.
                </span>
              ) : isOutOfReach ? (
                <span className="text-red-500 font-medium">
                  Mathematical ceiling exceeded ({totalRemainingCredits} credits remaining). Consider a revised target.
                </span>
              ) : (
                <span>
                  Needed across the remaining <strong className="text-foreground">{totalRemainingCredits} credits</strong> to graduate with {currentClassOption.label} ({selectedTarget.toFixed(2)}).
                </span>
              )}
            </p>

            {/* Progress Meter Bar */}
            {totalRemainingCredits > 0 && requiredAvgGpa !== null && !isTargetSecured && (
              <div className="space-y-1.5 pt-1">
                <div className="h-2 w-full rounded-full bg-raised overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${meterRatio}%`,
                      background: `linear-gradient(90deg, #6366F1 0%, ${statusColor} 100%)`,
                      boxShadow: `0 0 8px ${statusColor}40`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-secondary font-mono">
                  <span>0.00</span>
                  <span className="font-semibold" style={{ color: statusColor }}>
                    Needed: {requiredAvgGpa.toFixed(2)}
                  </span>
                  <span>4.00</span>
                </div>
              </div>
            )}
          </div>

          {/* Minimalist Year Progress Stepper (Mobile-friendly 4-column or 2x2) */}
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-secondary uppercase tracking-wider block">
              Curriculum Weight & Completion
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {yearList.map((yp) => (
                <div
                  key={yp.yearKey}
                  className={`rounded-[9px] border p-2.5 transition-colors ${
                    yp.isDone
                      ? 'border-emerald-500/25 bg-emerald-500/5'
                      : yp.isInProgress
                      ? 'border-indigo-500/25 bg-indigo-500/5'
                      : 'border-border bg-raised/30'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-foreground">{yp.title}</span>
                    <span className="font-mono text-secondary text-[10px]">{yp.weightPercent}% wt</span>
                  </div>

                  <div className="text-xs font-mono">
                    {yp.isDone ? (
                      <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold text-[11px]">
                        <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                        GPA {yp.currentGpa.toFixed(2)}
                      </span>
                    ) : yp.isInProgress ? (
                      <div className="text-[11px]">
                        <span className="text-indigo-400 font-medium">{yp.remainingCredits} cr left</span>
                        <span className="text-secondary block text-[10px]">GPA {yp.currentGpa.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="text-secondary text-[11px] block">
                        {yp.totalCredits} credits
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </section>
  );
}
