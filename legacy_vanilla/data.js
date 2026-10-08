const courseData = {
    "year1": {
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

const gradePoints = {
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
