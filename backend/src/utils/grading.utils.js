/**
 * Standard Grading System Utilities
 * Based on institutional standard (e.g. Bangladesh Education Board / GPA-5 scale):
 * 80-100% -> A+ (5.00)
 * 70-79%  -> A  (4.00)
 * 60-69%  -> A- (3.50)
 * 50-59%  -> B  (3.00)
 * 40-49%  -> C  (2.00)
 * 33-39%  -> D  (1.00)
 * 0-32%   -> F  (0.00)
 */

const GRADING_SCALE = [
  { minPercentage: 80, grade: 'A+', gpa: 5.0, description: 'Outstanding' },
  { minPercentage: 70, grade: 'A', gpa: 4.0, description: 'Excellent' },
  { minPercentage: 60, grade: 'A-', gpa: 3.5, description: 'Very Good' },
  { minPercentage: 50, grade: 'B', gpa: 3.0, description: 'Good' },
  { minPercentage: 40, grade: 'C', gpa: 2.0, description: 'Satisfactory' },
  { minPercentage: 33, grade: 'D', gpa: 1.0, description: 'Pass' },
  { minPercentage: 0, grade: 'F', gpa: 0.0, description: 'Failed' },
];

/**
 * Calculates grade point and letter grade for an individual subject
 */
const calculateSubjectGrade = (marksObtained, maxMarks = 100, isAbsent = false) => {
  if (isAbsent || marksObtained === null || marksObtained === undefined || isNaN(marksObtained)) {
    return {
      percentage: 0,
      letterGrade: 'F',
      gradePoint: 0.0,
      description: isAbsent ? 'Absent' : 'Failed',
      isPassed: false,
    };
  }

  const validMaxMarks = Number(maxMarks) > 0 ? Number(maxMarks) : 100;
  const marks = Math.max(0, Math.min(Number(marksObtained), validMaxMarks));
  const percentage = (marks / validMaxMarks) * 100;

  for (const tier of GRADING_SCALE) {
    if (percentage >= tier.minPercentage) {
      return {
        percentage: Number(percentage.toFixed(2)),
        letterGrade: tier.grade,
        gradePoint: tier.gpa,
        description: tier.description,
        isPassed: tier.gpa > 0,
      };
    }
  }

  return {
    percentage: 0,
    letterGrade: 'F',
    gradePoint: 0.0,
    description: 'Failed',
    isPassed: false,
  };
};

/**
 * Converts overall numeric GPA into corresponding letter grade
 */
const gpaToLetterGrade = (gpa) => {
  const numGpa = Number(gpa);
  if (numGpa >= 5.0) return 'A+';
  if (numGpa >= 4.0) return 'A';
  if (numGpa >= 3.5) return 'A-';
  if (numGpa >= 3.0) return 'B';
  if (numGpa >= 2.0) return 'C';
  if (numGpa >= 1.0) return 'D';
  return 'F';
};

/**
 * Calculates overall exam result for a student across all subjects
 * Enforces the standard Fail Rule: If a student receives F in ANY subject, overall GPA is 0.00 and overall Grade is F
 */
const calculateOverallResult = (subjectEntries = []) => {
  if (!Array.isArray(subjectEntries) || subjectEntries.length === 0) {
    return {
      totalMarksObtained: 0,
      totalMaxMarks: 0,
      percentage: 0,
      overallGPA: 0.0,
      overallGrade: 'N/A',
      hasFailedSubject: false,
      passedSubjectsCount: 0,
      totalSubjectsCount: 0,
      remarks: 'No marks recorded',
    };
  }

  let totalMarksObtained = 0;
  let totalMaxMarks = 0;
  let totalGradePoints = 0;
  let hasFailedSubject = false;
  let passedSubjectsCount = 0;

  subjectEntries.forEach((entry) => {
    const marks = Number(entry.marksObtained || 0);
    const maxMarks = Number(entry.maxMarks || 100);
    const gradePoint = Number(entry.gradePoint ?? calculateSubjectGrade(marks, maxMarks, entry.isAbsent).gradePoint);
    const isPassed = !entry.isAbsent && gradePoint > 0;

    totalMarksObtained += marks;
    totalMaxMarks += maxMarks;
    totalGradePoints += gradePoint;

    if (isPassed) {
      passedSubjectsCount++;
    } else {
      hasFailedSubject = true;
    }
  });

  const totalSubjectsCount = subjectEntries.length;
  const rawAverageGpa = totalSubjectsCount > 0 ? totalGradePoints / totalSubjectsCount : 0;
  const percentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;

  // If any subject is failed, the overall GPA is 0.00 and overall Grade is F
  const overallGPA = hasFailedSubject ? 0.0 : Number(rawAverageGpa.toFixed(2));
  const overallGrade = hasFailedSubject ? 'F' : gpaToLetterGrade(overallGPA);

  let remarks = 'Excellent performance';
  if (overallGPA === 5.0) remarks = 'Outstanding Achievement!';
  else if (overallGPA >= 4.0) remarks = 'Very Good Result';
  else if (overallGPA >= 3.0) remarks = 'Satisfactory Progress';
  else if (overallGPA >= 1.0) remarks = 'Needs Improvement';
  else remarks = 'Unsatisfactory - Academic Support Recommended';

  return {
    totalMarksObtained: Number(totalMarksObtained.toFixed(2)),
    totalMaxMarks,
    percentage: Number(percentage.toFixed(2)),
    overallGPA,
    overallGrade,
    hasFailedSubject,
    passedSubjectsCount,
    totalSubjectsCount,
    remarks,
  };
};

/**
 * Assigns class rank to a list of student exam summary records
 * Ranking priority:
 * 1. Overall GPA (descending)
 * 2. Total marks obtained (descending)
 * 3. Roll number (ascending)
 */
const calculateClassRanks = (studentSummaries = []) => {
  const sorted = [...studentSummaries].sort((a, b) => {
    // 1. Overall GPA
    if ((b.overallGPA || 0) !== (a.overallGPA || 0)) {
      return (b.overallGPA || 0) - (a.overallGPA || 0);
    }
    // 2. Total marks obtained
    if ((b.totalMarksObtained || 0) !== (a.totalMarksObtained || 0)) {
      return (b.totalMarksObtained || 0) - (a.totalMarksObtained || 0);
    }
    // 3. Roll number
    const rollA = parseInt(a.rollNumber, 10) || 999999;
    const rollB = parseInt(b.rollNumber, 10) || 999999;
    return rollA - rollB;
  });

  return sorted.map((student, index) => ({
    ...student,
    classRank: index + 1,
  }));
};

module.exports = {
  GRADING_SCALE,
  calculateSubjectGrade,
  gpaToLetterGrade,
  calculateOverallResult,
  calculateClassRanks,
};
