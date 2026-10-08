document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('coursesContainer');
    const tabs = document.querySelectorAll('.tab-btn');
    
    // State to store grades: { courseCode: gradeValue }
    const userGrades = {};
    // State to store elective selection: { courseCode: boolean }
    const selectedElectives = {};

    // Initialize UI
    renderYear('year1');

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderYear(tab.dataset.year);
        });
    });

    function renderYear(yearKey) {
        container.innerHTML = '';
        const year = courseData[yearKey];
        
        for (const semKey in year.semesters) {
            const sem = year.semesters[semKey];
            const semDiv = document.createElement('div');
            semDiv.className = 'semester-section';
            
            let electiveInfo = '';
            if (sem.requiredElectiveCredits) {
                electiveInfo = `<span class="elective-req">Select ${sem.requiredElectiveCredits} credits from electives</span>`;
            }

            semDiv.innerHTML = `
                <h2 class="semester-title">${sem.name} ${electiveInfo}</h2>
                <table class="course-table">
                    <thead>
                        <tr>
                            ${sem.requiredElectiveCredits ? '<th>Select</th>' : ''}
                            <th>Code</th>
                            <th>Course Title</th>
                            <th>Credits</th>
                            <th>Type</th>
                            <th>Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sem.courses.map(course => {
                            const isElective = course.type === 'Elective';
                            const isSelected = selectedElectives[course.code];
                            const currentGrade = userGrades[course.code] || '';
                            
                            let checkboxHTML = '';
                            if (sem.requiredElectiveCredits) {
                                if (isElective) {
                                    checkboxHTML = `<td><input type="checkbox" class="elective-checkbox" data-code="${course.code}" ${isSelected ? 'checked' : ''}></td>`;
                                } else {
                                    checkboxHTML = `<td></td>`;
                                }
                            }

                            return `
                                <tr class="course-row ${isElective && !isSelected ? 'inactive-row' : ''}">
                                    ${checkboxHTML}
                                    <td class="course-code">${course.code}</td>
                                    <td>
                                        <span class="course-title">${course.title}</span>
                                        ${!course.gpa ? '<span class="badge nongpa">Non-GPA</span>' : ''}
                                    </td>
                                    <td>${course.credits}</td>
                                    <td>
                                        <span class="badge ${course.type.toLowerCase()}">${course.type}</span>
                                    </td>
                                    <td>
                                        <select class="grade-select" data-code="${course.code}" data-gpa="${course.gpa}" data-credits="${course.credits}" ${isElective && !isSelected ? 'disabled' : ''}>
                                            <option value="">-</option>
                                            ${Object.keys(gradePoints).map(grade => 
                                                `<option value="${grade}" ${currentGrade === grade ? 'selected' : ''}>${grade}</option>`
                                            ).join('')}
                                        </select>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            container.appendChild(semDiv);
        }

        // Attach event listeners for this rendered view
        attachEventListeners();
    }

    function attachEventListeners() {
        const gradeSelects = document.querySelectorAll('.grade-select');
        gradeSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const code = e.target.dataset.code;
                const grade = e.target.value;
                if (grade) {
                    userGrades[code] = grade;
                } else {
                    delete userGrades[code];
                }
                calculateAll();
            });
        });

        const electiveCheckboxes = document.querySelectorAll('.elective-checkbox');
        electiveCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const code = e.target.dataset.code;
                const isChecked = e.target.checked;
                selectedElectives[code] = isChecked;
                
                // Find corresponding select and toggle
                const row = e.target.closest('tr');
                const select = row.querySelector('.grade-select');
                if (isChecked) {
                    select.disabled = false;
                } else {
                    select.disabled = true;
                    select.value = '';
                    delete userGrades[code];
                }
                
                calculateAll();
            });
        });
    }

    function calculateAll() {
        const yearlyGPAs = {};

        for (const yearKey in courseData) {
            const year = courseData[yearKey];
            let totalPoints = 0;
            let totalCredits = 0;

            for (const semKey in year.semesters) {
                const sem = year.semesters[semKey];
                
                sem.courses.forEach(course => {
                    // Only count if it's a GPA subject, and if it's an elective, it must be selected
                    if (course.gpa && (course.type === 'Compulsory' || selectedElectives[course.code])) {
                        const grade = userGrades[course.code];
                        if (grade && gradePoints[grade] !== undefined) {
                            totalPoints += gradePoints[grade] * course.credits;
                            totalCredits += course.credits;
                        }
                    }
                });
            }

            const gpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
            yearlyGPAs[yearKey] = gpa;
            
            // Update UI
            document.getElementById(`${yearKey}Gpa`).textContent = gpa.toFixed(2);
        }

        calculateFGPA(yearlyGPAs);
    }

    function calculateFGPA(yearlyGPAs) {
        let fgpa = 0;
        let totalWeight = 0;

        for (const yearKey in courseData) {
            const weight = courseData[yearKey].weight;
            const gpa = yearlyGPAs[yearKey];
            
            if (gpa > 0) {
                fgpa += gpa * weight;
                totalWeight += weight;
            }
        }

        // Only show FGPA if all weights are present (full 4 years) or partially calculate based on completed years
        // To accurately reflect FGPA, it's typically out of total completed weight.
        let finalFGPA = 0;
        if (totalWeight > 0) {
             // If user wants running FGPA, we can divide by totalWeight entered so far, 
             // but standard FGPA implies the strict weights.
             // We'll calculate it out of completed weight so it's a "Current FGPA".
             finalFGPA = fgpa / totalWeight;
        }

        document.getElementById('fgpaValue').textContent = finalFGPA.toFixed(2);

        // Determine Class
        let classAward = "N/A";
        if (finalFGPA >= 3.70) {
            classAward = "FIRST CLASS";
            document.getElementById('classAward').style.color = "#34d399";
        } else if (finalFGPA >= 3.30) {
            classAward = "SECOND CLASS (UPPER DIVISION)";
            document.getElementById('classAward').style.color = "#60a5fa";
        } else if (finalFGPA >= 2.70) {
            classAward = "SECOND CLASS (LOWER DIVISION)";
            document.getElementById('classAward').style.color = "#fbbf24";
        } else if (finalFGPA >= 2.00) {
            classAward = "PASS";
            document.getElementById('classAward').style.color = "#f87171";
        } else {
            classAward = "FAIL / INCOMPLETE";
            document.getElementById('classAward').style.color = "#94a3b8";
        }

        document.getElementById('classAward').textContent = classAward;
    }
});
