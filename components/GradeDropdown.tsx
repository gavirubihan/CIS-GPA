'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Grade } from '../types';
import { getGradeStyle } from '../lib/gradeStyles';

const GRADES_LIST: Grade[] = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E'];

interface GradeDropdownProps {
  value: string;
  onChange: (grade: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function GradeDropdown({
  value,
  onChange,
  disabled = false,
  ariaLabel = 'Select grade',
  className = '',
  size = 'sm',
}: GradeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentStyle = getGradeStyle(value);

  // Auto-detect viewport boundary to flip upwards if near bottom
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220 && rect.top > 220) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (grade: string) => {
    onChange(grade);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Custom Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between rounded-[8px] border px-2.5 text-xs font-mono transition-all focus-visible:outline-none ${size === 'md' ? 'min-h-[44px]' : 'h-8'
          } ${disabled
            ? 'opacity-40 cursor-not-allowed bg-raised/50 border-border'
            : isOpen
              ? 'border-accent ring-1 ring-accent bg-surface text-foreground'
              : value
                ? `${currentStyle.badge} hover:brightness-110 shadow-2xs`
                : 'border-border bg-surface text-secondary hover:bg-raised/70 cursor-pointer hover:text-foreground'
          }`}
      >
        <span className={value ? 'font-bold' : 'text-secondary font-sans'}>
          {value || 'Select'}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''
            } ${value ? currentStyle.text : 'text-secondary'}`}
          strokeWidth={1.5}
        />
      </button>

      {/* Custom Floating Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute left-0 right-0 z-50 w-full min-w-[110px] rounded-[10px] border border-border bg-surface shadow-xl p-1 max-h-56 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-100 ${openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
        >
          {/* Option to clear / unselect */}
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => handleSelect('')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs font-sans transition-colors text-left ${!value
                ? 'bg-raised text-foreground font-semibold'
                : 'text-secondary hover:bg-raised/60 hover:text-foreground'
              }`}
          >
            <span>Select</span>
            {!value && <Check className="h-3 w-3 text-secondary" strokeWidth={2} />}
          </button>

          <div className="my-1 border-t border-border-hairline" />

          {/* Grade Letters */}
          {GRADES_LIST.map((g) => {
            const isSelected = value === g;
            const itemStyle = getGradeStyle(g);
            return (
              <button
                key={g}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(g)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs font-mono transition-colors text-left ${isSelected
                    ? `${itemStyle.badge} font-bold`
                    : 'text-foreground hover:bg-raised/70'
                  }`}
              >
                <span className={isSelected ? 'font-bold' : 'font-medium'}>{g}</span>
                {isSelected && <Check className="h-3 w-3 shrink-0" strokeWidth={2} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
