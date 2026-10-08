'use client';

import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-[#18181B] dark:bg-[#26262E] px-2 py-1 text-[11px] font-medium text-[#F4F4F5] shadow-xs border border-[#3F3F46] dark:border-[#3A3A46] transition-opacity duration-150 ${
            position === 'top'
              ? 'bottom-full mb-1.5'
              : 'top-full mt-1.5'
          }`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
