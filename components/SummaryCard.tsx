'use client';

import React, { useState } from 'react';
import { Target, ArrowRight } from 'lucide-react';
import { OverallStats, ActiveTab } from '../types';
import { courseData } from '../data/courseData';
import { getGpaColor } from '../lib/gradeStyles';
import Tooltip from './Tooltip';

interface SummaryCardProps {
  stats: OverallStats;
  activeTab: ActiveTab;
  onSelectYear: (tab: ActiveTab) => void;
  id?: string;
}

export default function SummaryCard({
  stats,
  activeTab,
  onSelectYear,
  id = 'summary-card'
}: SummaryCardProps) {
  const { currentFgpa, classAward, yearlyStats, overallGradedCredits } = stats;

  const [selectedTick, setSelectedTick] = useState<number | null>(null);
  const [hoveredTick, setHoveredTick] = useState<number | null>(null);

  // Semantic color for class dot & progress
  const getSemanticColor = (fgpa: number) => {
    const rounded = Math.round((fgpa + Number.EPSILON) * 100) / 100;
    if (rounded >= 3.70) return '#10B981';
    if (rounded >= 3.30) return '#3B82F6';
    if (rounded >= 2.70) return '#F59E0B';
    if (rounded >= 2.00) return '#A1A1AA';
    return '#EF4444';
  };

  const semanticColor = getSemanticColor(currentFgpa);
  const progressRatio = Math.min(100, Math.max(0, (currentFgpa / 4.0) * 100));
  const creditCompletionRatio = Math.min(100, Math.max(0, (overallGradedCredits / 120) * 100));

  // Threshold ticks definition
  const ticks = [
    { value: 2.0, pos: '50.0%', label: 'Pass', fullLabel: 'Pass: 2.00', min: '2.00', color: '#A1A1AA' },
    { value: 2.7, pos: '67.5%', label: '2nd Lower', fullLabel: 'Second Lower: 2.70', min: '2.70', color: '#F59E0B' },
    { value: 3.3, pos: '82.5%', label: '2nd Upper', fullLabel: 'Second Upper: 3.30', min: '3.30', color: '#3B82F6' },
    { value: 3.7, pos: '92.5%', label: '1st Class', fullLabel: 'First Class: 3.70', min: '3.70', color: '#10B981' },
  ];

  const activeTickValue = hoveredTick ?? selectedTick;
  const activeTick = ticks.find((t) => t.value === activeTickValue);
  const nextMilestone = ticks.find((t) => currentFgpa < t.value);

  return (
    <div
      id={id}
      onClick={() => setSelectedTick(null)}
      className="rounded-[12px] border border-border bg-surface p-5 sm:p-6 shadow-[var(--card-shadow)] transition-colors"
      aria-label="Cumulative Academic Standing"
    >
      {/* 1. Label */}
      <div className="text-xs font-medium text-secondary">
        Cumulative GPA
      </div>

      {/* 2. Hero Number */}
      <div className="mt-2 flex items-baseline">
        <span className="text-[40px] sm:text-[48px] font-semibold tabular-nums tracking-[-0.02em] leading-none text-foreground">
          {currentFgpa.toFixed(2)}
        </span>
        <span className="ml-2 text-sm text-secondary font-normal">
          / 4.00
        </span>
      </div>

      {/* 3. Degree class as refined semantic status badge */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div
          className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
          style={{
            borderColor: `${semanticColor}40`,
            backgroundColor: `${semanticColor}15`,
            color: semanticColor,
          }}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: semanticColor }}
            aria-hidden="true"
          />
          <span className="font-semibold">{classAward.name}</span>
        </div>

        {stats.hasEGrade && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
            <span>{stats.eGradeCount} {stats.eGradeCount === 1 ? 'module' : 'modules'} with &apos;E&apos; (Repeat required for graduation)</span>
          </span>
        )}
      </div>

      {/* 4. Slim 6px progress bar with glowing gradient & threshold ticks */}
      <div className="relative mt-5 mb-3">
        <div className="h-1.5 w-full rounded-full bg-raised relative overflow-visible">
          {/* Progress fill with tasteful gradient */}
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressRatio}%`,
              background: `linear-gradient(90deg, #6366F1 0%, ${semanticColor} 100%)`,
              boxShadow: `0 0 10px ${semanticColor}30`,
            }}
          />

          {/* Threshold ticks - with accessible 32px touch targets for mobile */}
          {ticks.map((tick) => {
            const isSelected = selectedTick === tick.value;
            const isHovered = hoveredTick === tick.value;
            const isActive = isSelected || isHovered;
            const isAchieved = currentFgpa >= tick.value;

            return (
              <button
                key={tick.value}
                type="button"
                role="button"
                aria-label={`${tick.fullLabel} threshold`}
                aria-pressed={isSelected}
                className="group absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full transition-transform active:scale-95"
                style={{ left: tick.pos }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTick((prev) => (prev === tick.value ? null : tick.value));
                }}
                onMouseEnter={() => setHoveredTick(tick.value)}
                onMouseLeave={() => setHoveredTick(null)}
              >
                {/* Visual hairline tick */}
                <div
                  className={`w-[1.5px] rounded-full transition-all duration-150 ${
                    isActive
                      ? 'h-3.5 bg-foreground scale-125 shadow-xs'
                      : isAchieved
                      ? 'h-2.5 bg-foreground/70 group-hover:bg-foreground group-hover:h-3.5'
                      : 'h-2.5 bg-border group-hover:bg-foreground group-hover:h-3.5'
                  }`}
                />

                {/* Tooltip on hover or mobile tap */}
                <div
                  className={`pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#18181B] dark:bg-[#26262E] px-2 py-0.5 text-[10px] font-medium text-[#F4F4F5] shadow-xs border border-[#3F3F46] dark:border-[#3A3A46] z-30 transition-all duration-150 ${
                    isActive ? 'block opacity-100 scale-100' : 'hidden group-hover:block'
                  }`}
                >
                  {tick.fullLabel}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic scale info: 0.00, active tick info or next milestone, 4.00 */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-secondary">
          <span className="font-mono tabular-nums">0.00</span>
          <div className="text-center font-medium px-1 truncate">
            {activeTick ? (
              <span className="text-foreground transition-all">
                {activeTick.fullLabel}
                {currentFgpa >= activeTick.value ? (
                  <span className="text-emerald-500 ml-1.5 font-semibold">✓ Achieved</span>
                ) : (
                  <span className="text-accent ml-1.5 font-semibold">
                    (+{(activeTick.value - currentFgpa).toFixed(2)} to reach)
                  </span>
                )}
              </span>
            ) : nextMilestone ? (
              <span className="text-secondary">
                Next: <span className="text-foreground font-medium">{nextMilestone.label}</span> ({nextMilestone.min}){' '}
                <span className="text-accent font-semibold">
                  +{(nextMilestone.value - currentFgpa).toFixed(2)}
                </span>
              </span>
            ) : (
              <span className="text-emerald-500 font-medium">First Class Secured (≥ 3.70)</span>
            )}
          </div>
          <span className="font-mono tabular-nums">4.00</span>
        </div>

        {/* Mobile & Desktop Touch-Friendly Boundary Pills */}
        <div className="mt-2.5 grid grid-cols-4 gap-1.5 pt-2 border-t border-border-hairline/80">
          {ticks.map((tick) => {
            const isAchieved = currentFgpa >= tick.value;
            const isSelected = (selectedTick === tick.value) || (hoveredTick === tick.value);

            return (
              <button
                key={tick.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTick((prev) => (prev === tick.value ? null : tick.value));
                }}
                className={`group flex flex-col items-center justify-center rounded-lg py-1.5 px-1 transition-all text-center cursor-pointer select-none ${
                  isSelected
                    ? 'bg-accent/15 border border-accent/50 shadow-xs ring-1 ring-accent/30'
                    : isAchieved
                    ? 'bg-raised/70 hover:bg-raised border border-border/70 hover:border-border'
                    : 'bg-raised/30 hover:bg-raised/60 border border-transparent hover:border-border/40'
                }`}
                title={`Click to view ${tick.fullLabel}`}
              >
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: tick.color }}
                  />
                  <span className="text-[10px] font-semibold text-foreground truncate">
                    {tick.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono tabular-nums text-secondary leading-none mt-0.5">
                  ≥ {tick.min}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Simple 4-row list: Year 1 to Year 4 */}
      <div className="mt-4 border-t border-border-hairline pt-2">
        {(['year1', 'year2', 'year3', 'year4'] as const).map((yKey) => {
          const year = courseData[yKey];
          const yStat = yearlyStats[yKey];
          const hasData = yStat && yStat.gradedCredits > 0;
          const isSelected = activeTab === yKey;
          const weightPercent = Math.round(year.weight * 100);

          return (
            <button
              key={yKey}
              onClick={() => onSelectYear(yKey)}
              type="button"
              className={`flex w-full items-center justify-between py-2.5 text-xs transition-colors rounded-[6px] px-2 -mx-2 text-left ${
                isSelected
                  ? 'bg-raised text-foreground font-medium'
                  : 'text-secondary hover:text-foreground hover:bg-raised/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={isSelected ? 'text-foreground font-semibold' : 'text-foreground'}>
                  {year.title}
                </span>
                <span className="text-[11px] text-secondary">
                  ({weightPercent}%)
                </span>
              </div>

              {hasData ? (
                <span className={`font-mono tabular-nums text-xs font-semibold ${getGpaColor(yStat.gpa).text}`}>
                  {yStat.gpa.toFixed(2)}
                </span>
              ) : (
                <span className="font-mono tabular-nums text-xs font-normal text-secondary">
                  —
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 6. Credits completed with slim visual indicator */}
      <div className="mt-4 border-t border-border-hairline pt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-secondary">
          <span>Credits completed</span>
          <span className="font-mono tabular-nums font-semibold text-foreground">
            {overallGradedCredits} <span className="font-normal text-secondary">/ 120</span>
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-raised overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500/80 transition-all duration-500"
            style={{ width: `${creditCompletionRatio}%` }}
          />
        </div>
      </div>

      {/* 7. Target degree planner quick navigation */}
      <div className="mt-4 border-t border-border-hairline pt-3">
        <button
          onClick={() => onSelectYear('planner')}
          type="button"
          className={`flex w-full items-center justify-between rounded-[9px] border p-2.5 text-xs transition-all cursor-pointer ${
            activeTab === 'planner'
              ? 'border-accent bg-accent/10 text-accent font-semibold shadow-xs'
              : 'border-border bg-raised/40 hover:bg-raised text-foreground hover:border-accent/40'
          }`}
          title="Open Target degree planner to forecast required grades for honors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-accent/15 text-accent">
              <Target className="h-3.5 w-3.5" strokeWidth={2} />
            </div>
            <span className="font-medium truncate">Target degree planner</span>
          </div>

          <span className="text-[11px] font-semibold text-accent flex items-center gap-1 shrink-0">
            <span>Forecast</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </button>
      </div>
    </div>
  );
}
