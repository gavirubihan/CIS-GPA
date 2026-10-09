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

  const [activeTickHover, setActiveTickHover] = useState<string | null>(null);

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
    { value: 2.0, pos: '50.0%', label: 'Pass: 2.00' },
    { value: 2.7, pos: '67.5%', label: 'Second Lower: 2.70' },
    { value: 3.3, pos: '82.5%', label: 'Second Upper: 3.30' },
    { value: 3.7, pos: '92.5%', label: 'First Class: 3.70' },
  ];

  return (
    <div
      id={id}
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

          {/* Threshold ticks */}
          {ticks.map((tick) => (
            <div
              key={tick.value}
              className="group absolute top-0 -translate-x-1/2 cursor-pointer"
              style={{ left: tick.pos }}
              onMouseEnter={() => setActiveTickHover(tick.label)}
              onMouseLeave={() => setActiveTickHover(null)}
            >
              {/* 1px Hairline tick line */}
              <div className="h-2.5 w-px bg-border group-hover:bg-foreground -mt-0.5 transition-colors" />

              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded-md bg-[#18181B] dark:bg-[#26262E] px-2 py-0.5 text-[10px] font-medium text-[#F4F4F5] shadow-xs border border-[#3F3F46] dark:border-[#3A3A46] z-20">
                {tick.label}
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic tick hover notice or subtle scale */}
        <div className="mt-2 h-4 flex items-center justify-between text-[11px] text-secondary">
          {activeTickHover ? (
            <span className="text-foreground transition-opacity font-medium">
              {activeTickHover}
            </span>
          ) : (
            <>
              <span>0.00</span>
              <span className="text-[10px]">Hover ticks for boundaries</span>
              <span>4.00</span>
            </>
          )}
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
