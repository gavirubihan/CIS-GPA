export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'E';

export type CourseType = 'Compulsory' | 'Elective';

export interface Course {
  code: string;
  title: string;
  credits: number;
  type: CourseType;
  gpa: boolean;
}

export interface Semester {
  name: string;
  courses: Course[];
  requiredElectiveCredits?: number;
}

export interface YearData {
  title: string;
  weight: number;
  semesters: Record<string, Semester>;
}

export interface ClassAward {
  min: number;
  name: string;
  code: string;
  color: string;
  bg: string;
  border: string;
}

export interface SemesterStats {
  gpa: number;
  gradedCredits: number;
  totalPoints: number;
  totalGpaCredits: number;
  totalNonGpaCredits: number;
  completedCoursesCount: number;
  selectedElectiveCredits: number;
  isElectiveComplete: boolean;
  requiredElectiveCredits: number;
}

export interface YearStats {
  gpa: number;
  gradedCredits: number;
  totalPoints: number;
  totalGpaCredits: number;
  totalNonGpaCredits: number;
  semesterStats: Record<string, SemesterStats>;
  weight: number;
}

export interface OverallStats {
  yearlyStats: Record<string, YearStats>;
  currentFgpa: number;
  completedWeightSum: number;
  overallGradedCredits: number;
  overallPointsSum: number;
  totalCompulsoryRemaining: number;
  electiveDeficit: number;
  isFullDegreeComplete: boolean;
  classAward: ClassAward;
}

export type UserGrades = Record<string, Grade | string>;
export type SelectedElectives = Record<string, boolean>;
export type ActiveTab = 'all' | 'year1' | 'year2' | 'year3' | 'year4' | 'planner';
export type ThemeMode = 'dark' | 'light';
