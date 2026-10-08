import { Grade } from '../types';

export interface GradeStyleConfig {
  text: string;
  dot: string;
  badge: string;
  border: string;
}

export function getGradeStyle(grade: string): GradeStyleConfig {
  switch (grade as Grade) {
    case 'A+':
    case 'A':
    case 'A-':
      return {
        text: 'text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        border: 'border-emerald-500/30',
      };
    case 'B+':
    case 'B':
    case 'B-':
      return {
        text: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500',
        badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
        border: 'border-blue-500/30',
      };
    case 'C+':
    case 'C':
    case 'C-':
      return {
        text: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
        badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
        border: 'border-amber-500/30',
      };
    case 'D+':
    case 'D':
      return {
        text: 'text-rose-600 dark:text-rose-400',
        dot: 'bg-rose-500',
        badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
        border: 'border-rose-500/30',
      };
    case 'E':
      return {
        text: 'text-red-600 dark:text-red-400',
        dot: 'bg-red-500',
        badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
        border: 'border-red-500/30',
      };
    default:
      return {
        text: 'text-secondary',
        dot: 'bg-secondary',
        badge: 'bg-surface text-secondary border-border',
        border: 'border-border',
      };
  }
}

export function getGpaColor(gpa: number): { text: string; dot: string; badge: string } {
  if (gpa >= 3.70) {
    return {
      text: 'text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    };
  }
  if (gpa >= 3.30) {
    return {
      text: 'text-blue-600 dark:text-blue-400',
      dot: 'bg-blue-500',
      badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    };
  }
  if (gpa >= 2.70) {
    return {
      text: 'text-amber-600 dark:text-amber-400',
      dot: 'bg-amber-500',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    };
  }
  if (gpa >= 2.00) {
    return {
      text: 'text-secondary',
      dot: 'bg-secondary',
      badge: 'bg-raised text-secondary border-border',
    };
  }
  return {
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  };
}
