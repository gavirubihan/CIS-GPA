'use client';

import React from 'react';
import { Target } from 'lucide-react';
import { ActiveTab, YearStats } from '../types';
import { getGpaColor } from '../lib/gradeStyles';

interface YearTabsProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  yearlyStats: Record<string, YearStats>;
  cumulativeGpa?: number;
  onScrollToSummary?: () => void;
}

export default function YearTabs({
  activeTab,
  onSelectTab,
  yearlyStats,
  cumulativeGpa,
  onScrollToSummary,
}: YearTabsProps) {
  const tabs: { id: ActiveTab; label: string; tooltip?: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'year1', label: 'Year 1', tooltip: 'Faculty weight: 20%' },
    { id: 'year2', label: 'Year 2', tooltip: 'Faculty weight: 20%' },
    { id: 'year3', label: 'Year 3', tooltip: 'Faculty weight: 30%' },
    { id: 'year4', label: 'Year 4', tooltip: 'Faculty weight: 30%' },
    { id: 'planner', label: 'Target Planner', tooltip: 'Forecast required grades for degree honors' },
  ];

  return (
    <nav
      className="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 sm:static bg-background/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none py-2 sm:py-0 border-b border-border-hairline sm:border-0 select-none"
      aria-label="Academic year navigation"
    >
      <div className="flex items-center gap-2">
        {/* Mobile Live Cumulative GPA Pill (Pinned to the left with divider line) */}
        {cumulativeGpa !== undefined && cumulativeGpa > 0 && (
          <div className="sm:hidden flex items-center shrink-0">
            <button
              type="button"
              onClick={onScrollToSummary}
              className="inline-flex min-h-[36px] items-center gap-1.5 px-2.5 py-1 rounded-[7px] border border-border bg-surface text-foreground shadow-2xs hover:bg-raised transition-all active:scale-95 cursor-pointer"
              title="Tap to scroll to Cumulative GPA Summary"
            >
              <span className="text-[10px] uppercase tracking-wider text-secondary font-semibold">CGPA</span>
              <span className={`font-mono text-xs font-bold px-1.5 py-0.2 rounded-full border ${getGpaColor(cumulativeGpa).badge}`}>
                {cumulativeGpa.toFixed(2)}
              </span>
            </button>
            {/* Divider line between CGPA and Year Tabs */}
            <div className="h-5 w-px bg-border ml-2 mr-0.5 shrink-0" aria-hidden="true" />
          </div>
        )}

        <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-1 sm:inline-flex sm:p-1 sm:rounded-[8px] sm:bg-raised sm:border sm:border-border min-w-0 flex-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const yearStat = tab.id.startsWith('year') ? yearlyStats[tab.id] : null;
            const hasGpa = Boolean(yearStat && yearStat.gradedCredits > 0);
            const gpaDisplay = hasGpa && yearStat ? yearStat.gpa.toFixed(2) : null;
            const gpaStyle = hasGpa && yearStat ? getGpaColor(yearStat.gpa) : null;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                type="button"
                title={tab.tooltip}
                className={`snap-start inline-flex min-h-[40px] sm:min-h-[32px] items-center px-3.5 sm:px-3 rounded-[6px] text-xs font-medium transition-colors duration-150 whitespace-nowrap outline-none focus:outline-none focus:ring-0 cursor-pointer ${
                  isActive
                    ? 'border border-border bg-surface text-foreground font-semibold shadow-xs'
                    : 'border border-transparent text-secondary hover:text-foreground hover:bg-surface/50'
                }`}
              >
                {tab.id === 'planner' ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-accent shrink-0" strokeWidth={2} />
                    <span>{tab.label}</span>
                  </span>
                ) : (
                  <span>{tab.label}</span>
                )}
                {gpaDisplay && (
                  <span
                    className={`ml-1.5 font-mono tabular-nums text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${gpaStyle?.badge}`}
                  >
                    {gpaDisplay}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
