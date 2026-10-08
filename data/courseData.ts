import { 
  Grade, 
  YearData, 
  ClassAward, 
  Semester, 
  SemesterStats, 
  YearStats, 
  OverallStats, 
  UserGrades, 
  SelectedElectives 
} from '../types';

export const courseData: Record<string, YearData> = {
  "year1": {
    "title": "Year 1",
    "weight": 0.2,
    "semesters": {
      "semester1": {
        "name": "Semester I",
        "courses": [
          { "code": "IS1101", "title": "Fundamentals of Information Systems", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS1102", "title": "Structured Programming Techniques", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS1103", "title": "Structured Programming Practicum", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS1104", "title": "Theories of Information Systems", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS1105", "title": "Computer System Organization", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS1106", "title": "Foundations of Web Technologies", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS1107", "title": "Personal Productivity with Information Technology", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS1108", "title": "Fundamentals of Mathematics", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS1109", "title": "Statistics & Probability Theory", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS1110", "title": "Communication Skills I", "credits": 2, "type": "Compulsory", "gpa": false },
          { "code": "IS1111", "title": "Academic Integrity", "credits": 1, "type": "Compulsory", "gpa": false },
          { "code": "IS-EGP1101", "title": "General English I", "credits": 2, "type": "Compulsory", "gpa": false }
        ]
      },
      "semester2": {
        "name": "Semester II",
        "courses": [
          { "code": "IS2101", "title": "Object Oriented Programming", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS2102", "title": "Object Oriented Programming Practicum", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS2103", "title": "Emerging IS Technologies", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS2104", "title": "Database Systems", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS2105", "title": "Database Management Systems Practicum", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS2106", "title": "System Analysis & Design", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS2107", "title": "Social & Professional Issues", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS2108", "title": "Human Computer Interaction", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS2109", "title": "Information Assurance & Security", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS2110", "title": "Software Project Initiation & Planning", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS2111", "title": "Advanced Mathematics", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS2112", "title": "Communication Skills II", "credits": 2, "type": "Compulsory", "gpa": false },
          { "code": "IS-EGP1201", "title": "General English II", "credits": 2, "type": "Compulsory", "gpa": false }
        ]
      }
    }
  },
  "year2": {
    "title": "Year 2",
    "weight": 0.2,
    "semesters": {
      "semester3": {
        "name": "Semester III",
        "courses": [
          { "code": "IS3101", "title": "Object Oriented Analysis & Design", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS3102", "title": "Data Structures & Algorithms", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS3103", "title": "IT Governance", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS3104", "title": "Software Engineering", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS3105", "title": "IS Risk Management", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS3106", "title": "IS Sustainability", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS3107", "title": "Management Information Systems", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS3108", "title": "E-Business", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS3109", "title": "Digital Innovation", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS-EAP2101", "title": "Academic English I", "credits": 2, "type": "Compulsory", "gpa": false }
        ]
      },
      "semester4": {
        "name": "Semester IV",
        "courses": [
          { "code": "IS4101", "title": "IT Auditing", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS4102", "title": "Web Application Development", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS4103", "title": "Operating Systems", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS4104", "title": "System Administration and Maintenance", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS4105", "title": "IT Procurement Management", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS4106", "title": "Software Architecture", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS4107", "title": "Professionalism & Ethics in Computing", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS4108", "title": "IS Strategies", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS4109", "title": "Agile Software Development", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS4110", "title": "Capstone Project", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS-EAP2201", "title": "Academic English II", "credits": 2, "type": "Compulsory", "gpa": false }
        ]
      }
    }
  },
  "year3": {
    "title": "Year 3",
    "weight": 0.3,
    "semesters": {
      "semester5": {
        "name": "Semester V",
        "requiredElectiveCredits": 6,
        "courses": [
          { "code": "IS5101", "title": "Entrepreneurship & Innovation", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS5102", "title": "Enterprise Architecture", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS5103", "title": "High Performance Computing", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS5104", "title": "Software Process Management", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS5105", "title": "Business Process Management", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS5106", "title": "UI/UX Practicum", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS5107", "title": "Project Management Practicum", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS5108", "title": "Business Intelligence", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS5109", "title": "IS Project for Community", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS-EBP3101", "title": "Business English", "credits": 2, "type": "Compulsory", "gpa": false },
          { "code": "IS5110", "title": "Advanced Database Systems", "credits": 2, "type": "Elective", "gpa": true },
          { "code": "IS5111", "title": "Data Communication & Networks", "credits": 2, "type": "Elective", "gpa": true },
          { "code": "IS5112", "title": "Design Patterns & Anti-patterns", "credits": 2, "type": "Elective", "gpa": true },
          { "code": "IS5113", "title": "Software Quality Assurance", "credits": 2, "type": "Elective", "gpa": true },
          { "code": "IS5114", "title": "Data Mining & Analytics", "credits": 2, "type": "Elective", "gpa": true }
        ]
      },
      "semester6": {
        "name": "Semester VI",
        "courses": [
          { "code": "IS6101", "title": "Industrial Training", "credits": 6, "type": "Compulsory", "gpa": true }
        ]
      }
    }
  },
  "year4": {
    "title": "Year 4",
    "weight": 0.3,
    "semesters": {
      "semester7": {
        "name": "Semester VII",
        "requiredElectiveCredits": 4,
        "courses": [
          { "code": "IS7101", "title": "Research Methodologies", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS7102", "title": "IT Law", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS7103", "title": "Business Process Simulation", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS7104", "title": "Enterprise Modelling Ontologies", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS7105", "title": "Organizational Behavior & Management", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS7106", "title": "Cloud Computing", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS7107", "title": "Mobile Application Development", "credits": 1, "type": "Elective", "gpa": true },
          { "code": "IS7108", "title": "Web Service Technologies", "credits": 2, "type": "Elective", "gpa": true },
          { "code": "IS7109", "title": "Geographical Information Systems", "credits": 2, "type": "Elective", "gpa": true },
          { "code": "IS7110", "title": "Statistical Distribution & Inferences", "credits": 1, "type": "Elective", "gpa": true },
          { "code": "IS7111", "title": "Advanced Programming Practicum", "credits": 1, "type": "Elective", "gpa": true },
          { "code": "IS7112", "title": "Machine Learning", "credits": 2, "type": "Elective", "gpa": true }
        ]
      },
      "semester8": {
        "name": "Semester VIII",
        "requiredElectiveCredits": 4,
        "courses": [
          { "code": "IS8101", "title": "Research Project in IS", "credits": 8, "type": "Compulsory", "gpa": true },
          { "code": "IS8102", "title": "Business/IT Alignment", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS8103", "title": "Human Resource Management", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS8104", "title": "Scientific Communication", "credits": 1, "type": "Compulsory", "gpa": true },
          { "code": "IS8105", "title": "IS Economics", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS8106", "title": "Computer System Security", "credits": 2, "type": "Compulsory", "gpa": true },
          { "code": "IS8107", "title": "Supply Chain Management", "credits": 2, "type": "Elective", "gpa": true },
          { "code": "IS8108", "title": "Advanced Computer Networks", "credits": 2, "type": "Elective", "gpa": true },
          { "code": "IS8109", "title": "Process Mining", "credits": 2, "type": "Elective", "gpa": true },
          { "code": "IS8110", "title": "Digital Business Model", "credits": 1, "type": "Elective", "gpa": true },
          { "code": "IS8111", "title": "Game Development", "credits": 2, "type": "Elective", "gpa": true }
        ]
      }
    }
  }
};

export const gradePoints: Record<Grade, number> = {
  "A+": 4.00,
  "A": 4.00,
  "A-": 3.70,
  "B+": 3.30,
  "B": 3.00,
  "B-": 2.70,
  "C+": 2.30,
  "C": 2.00,
  "C-": 1.70,
  "D+": 1.30,
  "D": 1.00,
  "E": 0.00
};

export const GRADE_COLOR_MAP: Record<string, string> = {
  "A+": "#10b981", // Emerald
  "A": "#10b981",
  "A-": "#059669",
  "B+": "#0284c7", // Sky/Blue
  "B": "#2563eb",
  "B-": "#6366f1", // Indigo
  "C+": "#d97706", // Amber
  "C": "#b45309",
  "C-": "#ea580c", // Orange
  "D+": "#f43f5e", // Rose
  "D": "#e11d48",  // Red
  "E": "#be123c"   // Dark Crimson
};

export const CLASS_AWARDS: ClassAward[] = [
  { min: 3.70, name: "First Class Honours", code: "FIRST CLASS", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)" },
  { min: 3.30, name: "Second Class (Upper Division)", code: "SECOND CLASS (UPPER)", color: "#0284c7", bg: "rgba(2, 132, 199, 0.12)", border: "rgba(2, 132, 199, 0.3)" },
  { min: 2.70, name: "Second Class (Lower Division)", code: "SECOND CLASS (LOWER)", color: "#d97706", bg: "rgba(217, 119, 6, 0.12)", border: "rgba(217, 119, 6, 0.3)" },
  { min: 2.00, name: "General Pass", code: "PASS", color: "#f43f5e", bg: "rgba(244, 63, 94, 0.12)", border: "rgba(244, 63, 94, 0.3)" },
  { min: 0.00, name: "Fail / Incomplete", code: "INCOMPLETE", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)", border: "rgba(100, 116, 139, 0.2)" }
];

export function getClassAward(fgpa: number): ClassAward {
  if (!fgpa || fgpa <= 0) {
    return { min: 0, name: "Pending Evaluation", code: "PENDING", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)", border: "rgba(100, 116, 139, 0.2)" };
  }
  for (const award of CLASS_AWARDS) {
    if (fgpa >= award.min) return award;
  }
  return CLASS_AWARDS[CLASS_AWARDS.length - 1];
}

export function getSemesterStats(
  sem: Semester, 
  userGrades: UserGrades = {}, 
  selectedElectives: SelectedElectives = {}
): SemesterStats {
  let totalPoints = 0;
  let gradedCredits = 0;
  let totalGpaCredits = 0;
  let totalNonGpaCredits = 0;
  let completedCoursesCount = 0;
  let selectedElectiveCredits = 0;

  sem.courses.forEach(course => {
    const isElective = course.type === "Elective";
    const isSelected = !isElective || !!selectedElectives[course.code];

    if (isElective && isSelected) {
      selectedElectiveCredits += course.credits;
    }

    if (course.gpa) {
      if (isSelected) {
        totalGpaCredits += course.credits;
        const grade = userGrades[course.code] as Grade;
        if (grade && gradePoints[grade] !== undefined) {
          totalPoints += gradePoints[grade] * course.credits;
          gradedCredits += course.credits;
          completedCoursesCount++;
        }
      }
    } else {
      totalNonGpaCredits += course.credits;
      const grade = userGrades[course.code];
      if (grade) {
        completedCoursesCount++;
      }
    }
  });

  const gpa = gradedCredits > 0 ? (totalPoints / gradedCredits) : 0;

  return {
    gpa,
    gradedCredits,
    totalPoints,
    totalGpaCredits,
    totalNonGpaCredits,
    completedCoursesCount,
    selectedElectiveCredits,
    isElectiveComplete: !sem.requiredElectiveCredits || selectedElectiveCredits === sem.requiredElectiveCredits,
    requiredElectiveCredits: sem.requiredElectiveCredits || 0
  };
}

export function getYearStats(
  yearKey: string, 
  userGrades: UserGrades = {}, 
  selectedElectives: SelectedElectives = {}
): YearStats {
  const year = courseData[yearKey];
  if (!year) return { gpa: 0, gradedCredits: 0, totalPoints: 0, totalGpaCredits: 0, totalNonGpaCredits: 0, semesterStats: {}, weight: 0 };

  let totalPoints = 0;
  let gradedCredits = 0;
  let totalGpaCredits = 0;
  let totalNonGpaCredits = 0;
  const semesterStats: Record<string, SemesterStats> = {};

  for (const semKey in year.semesters) {
    const sem = year.semesters[semKey];
    const stats = getSemesterStats(sem, userGrades, selectedElectives);
    semesterStats[semKey] = stats;

    totalPoints += stats.totalPoints;
    gradedCredits += stats.gradedCredits;
    totalGpaCredits += stats.totalGpaCredits;
    totalNonGpaCredits += stats.totalNonGpaCredits;
  }

  const gpa = gradedCredits > 0 ? (totalPoints / gradedCredits) : 0;

  return {
    gpa,
    gradedCredits,
    totalPoints,
    totalGpaCredits,
    totalNonGpaCredits,
    semesterStats,
    weight: year.weight
  };
}

export function calculateAllStats(
  userGrades: UserGrades = {}, 
  selectedElectives: SelectedElectives = {}
): OverallStats {
  const yearlyStats: Record<string, YearStats> = {};
  let weightedPointsSum = 0;
  let completedWeightSum = 0;
  let overallGradedCredits = 0;
  let overallPointsSum = 0;
  let totalCompulsoryRemaining = 0;
  let electiveDeficit = 0;

  for (const yearKey in courseData) {
    const stats = getYearStats(yearKey, userGrades, selectedElectives);
    yearlyStats[yearKey] = stats;

    if (stats.gradedCredits > 0) {
      weightedPointsSum += stats.gpa * stats.weight;
      completedWeightSum += stats.weight;
      overallGradedCredits += stats.gradedCredits;
      overallPointsSum += stats.totalPoints;
    }

    const year = courseData[yearKey];
    for (const semKey in year.semesters) {
      const sem = year.semesters[semKey];
      const semStat = stats.semesterStats[semKey];
      if (sem.requiredElectiveCredits) {
        if (semStat.selectedElectiveCredits < sem.requiredElectiveCredits) {
          electiveDeficit += (sem.requiredElectiveCredits - semStat.selectedElectiveCredits);
        }
      }
      sem.courses.forEach(c => {
        if (c.type === "Compulsory" && !userGrades[c.code]) {
          totalCompulsoryRemaining++;
        }
      });
    }
  }

  const currentFgpa = completedWeightSum > 0 ? (weightedPointsSum / completedWeightSum) : 0;
  const isFullDegreeComplete = completedWeightSum >= 0.99 && totalCompulsoryRemaining === 0 && electiveDeficit === 0;

  return {
    yearlyStats,
    currentFgpa,
    completedWeightSum,
    overallGradedCredits,
    overallPointsSum,
    totalCompulsoryRemaining,
    electiveDeficit,
    isFullDegreeComplete,
    classAward: getClassAward(currentFgpa)
  };
}

export const DEMO_PRESET_GRADES: UserGrades = {
  // Year 1
  "IS1101": "A", "IS1102": "A-", "IS1103": "A", "IS1104": "B+", "IS1105": "A",
  "IS1106": "A+", "IS1107": "A", "IS1108": "B+", "IS1109": "A-", "IS1110": "A",
  "IS1111": "A", "IS-EGP1101": "A",
  "IS2101": "A", "IS2102": "A+", "IS2103": "A", "IS2104": "A-", "IS2105": "A",
  "IS2106": "B+", "IS2107": "A", "IS2108": "A", "IS2109": "A-", "IS2110": "A",
  "IS2111": "B", "IS2112": "A", "IS-EGP1201": "A",

  // Year 2
  "IS3101": "A-", "IS3102": "A", "IS3103": "B+", "IS3104": "A", "IS3105": "A-",
  "IS3106": "A", "IS3107": "B+", "IS3108": "A", "IS3109": "A", "IS-EAP2101": "A",
  "IS4101": "A", "IS4102": "A+", "IS4103": "A-", "IS4104": "B+", "IS4105": "A",
  "IS4106": "A-", "IS4107": "A", "IS4108": "A", "IS4109": "A+", "IS4110": "A", "IS-EAP2201": "A",

  // Year 3 (Electives: IS5110 (2), IS5112 (2), IS5114 (2) = 6 credits)
  "IS5101": "A", "IS5102": "A-", "IS5103": "B+", "IS5104": "A", "IS5105": "A",
  "IS5106": "A+", "IS5107": "A", "IS5108": "A-", "IS5109": "A", "IS-EBP3101": "A",
  "IS5110": "A", "IS5112": "A", "IS5114": "A-",
  "IS6101": "A+", // Industrial training

  // Year 4
  "IS7101": "A", "IS7102": "B+", "IS7103": "A", "IS7104": "A-", "IS7105": "A", "IS7106": "A+",
  "IS7108": "A", "IS7112": "A", // 4 credits electives
  "IS8101": "A+", "IS8102": "A", "IS8103": "A-", "IS8104": "A", "IS8105": "B+", "IS8106": "A",
  "IS8108": "A", "IS8109": "A"  // 4 credits electives
};

export const DEMO_PRESET_ELECTIVES: SelectedElectives = {
  "IS5110": true,
  "IS5112": true,
  "IS5114": true,
  "IS7108": true,
  "IS7112": true,
  "IS8108": true,
  "IS8109": true
};
