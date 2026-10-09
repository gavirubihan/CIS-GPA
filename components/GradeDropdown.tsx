'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

interface MenuCoords {
  top: number;
  left: number;
  width: number;
  openUpwards: boolean;
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
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentStyle = getGradeStyle(value);

  // Compute fixed viewport position for the portal dropdown
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 224; // max-h-56 is 14rem = 224px
    const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight;

    const width = Math.max(rect.width, 110);
    // Ensure menu stays within horizontal viewport boundaries
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    if (left < 8) left = 8;

    const top = openUpwards ? rect.top - 4 : rect.bottom + 4;

    setMenuCoords({
      top,
      left,
      width,
      openUpwards,
    });
  }, []);

  // Sync menu position on open, scroll, or resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();

      const handleScrollOrResize = () => {
        updatePosition();
      };

      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);

      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    } else {
      setMenuCoords(null);
    }
  }, [isOpen, updatePosition]);

  // Click outside listener (checks both button and portalled menu)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
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
    <div className={`relative inline-block w-full ${className}`}>
      {/* Custom Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between rounded-[8px] border px-2.5 text-xs font-mono transition-all focus-visible:outline-none ${
          size === 'md' ? 'min-h-[44px]' : 'h-8'
        } ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-raised/50 border-border'
            : isOpen
            ? 'border-accent ring-2 ring-accent/30 bg-surface text-foreground shadow-sm'
            : value
            ? `${currentStyle.badge} hover:brightness-110 shadow-2xs`
            : 'border-border bg-surface text-secondary hover:bg-raised/70 cursor-pointer hover:text-foreground'
        }`}
      >
        <span className={value ? 'font-bold' : 'text-secondary font-sans'}>
          {value || 'Select'}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          } ${value ? currentStyle.text : 'text-secondary'}`}
          strokeWidth={1.5}
        />
      </button>

      {/* Floating Menu via React Portal into document.body (completely immune to overflow/z-index clipping) */}
      {isOpen &&
        menuCoords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              top: menuCoords.openUpwards ? undefined : `${menuCoords.top}px`,
              bottom: menuCoords.openUpwards
                ? `${window.innerHeight - menuCoords.top}px`
                : undefined,
              left: `${menuCoords.left}px`,
              width: `${menuCoords.width}px`,
              zIndex: 9999,
            }}
            className="rounded-[10px] border border-border bg-surface shadow-2xl p-1 max-h-56 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Option to clear / unselect */}
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => handleSelect('')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs font-sans transition-colors text-left ${
                !value
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
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs font-mono transition-colors text-left ${
                    isSelected
                      ? `${itemStyle.badge} font-bold`
                      : 'text-foreground hover:bg-raised/70'
                  }`}
                >
                  <span className={isSelected ? 'font-bold' : 'font-medium'}>{g}</span>
                  {isSelected && <Check className="h-3 w-3 shrink-0" strokeWidth={2} />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
