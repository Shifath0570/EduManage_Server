/**
 * Canonical Class & Subject mapping
 * Source of truth matches frontend Create Student and AssingSSC.
 */

const CLASS_SUBJECTS_MAP = {
  class_1: ["Bangla", "English", "Mathematics"],
  class_2: ["Bangla", "English", "Mathematics"],
  class_3: [
    "Bangla",
    "English",
    "Mathematics",
    "Elementary Science",
    "Bangladesh and Global Studies",
    "Religious and Moral Education"
  ],
  class_4: [
    "Bangla",
    "English",
    "Mathematics",
    "Elementary Science",
    "Bangladesh and Global Studies",
    "Religious and Moral Education"
  ],
  class_5: [
    "Bangla",
    "English",
    "Mathematics",
    "Elementary Science",
    "Bangladesh and Global Studies",
    "Religious and Moral Education"
  ],
  class_6: [
    "Bangla",
    "English",
    "Mathematics",
    "Science",
    "History and Social Science",
    "Digital Technology",
    "Wellbeing",
    "Life and Livelihood",
    "Art and Culture",
    "Religious Education"
  ],
  class_7: [
    "Bangla",
    "English",
    "Mathematics",
    "Science",
    "History and Social Science",
    "Digital Technology",
    "Wellbeing",
    "Life and Livelihood",
    "Art and Culture",
    "Religious Education"
  ],
  class_8: [
    "Bangla",
    "English",
    "Mathematics",
    "Science",
    "History and Social Science",
    "Digital Technology",
    "Wellbeing",
    "Life and Livelihood",
    "Art and Culture",
    "Religious Education"
  ],
  class_9_science: [
    "Bangla",
    "English",
    "Mathematics",
    "Information and Communication Technology (ICT)",
    "Religious and Moral Education",
    "Physics",
    "Chemistry",
    "Biology",
    "Higher Mathematics"
  ],
  class_9_businessStudies: [
    "Bangla",
    "English",
    "Mathematics",
    "Information and Communication Technology (ICT)",
    "Religious and Moral Education",
    "Accounting",
    "Business Entrepreneurship",
    "Finance and Banking",
    "General Science"
  ],
  class_9_humanities: [
    "Bangla",
    "English",
    "Mathematics",
    "Information and Communication Technology (ICT)",
    "Religious and Moral Education",
    "History of Bangladesh and World Civilization",
    "Geography and Environment",
    "Civics and Citizenship",
    "Economics"
  ],
  class_10_science: [
    "Bangla 1st Paper",
    "Bangla 2nd Paper",
    "English 1st Paper",
    "English 2nd Paper",
    "Mathematics",
    "Information and Communication Technology (ICT)",
    "Religious and Moral Education",
    "Physics",
    "Chemistry",
    "Biology",
    "Higher Mathematics"
  ],
  class_10_businessStudies: [
    "Bangla 1st Paper",
    "Bangla 2nd Paper",
    "English 1st Paper",
    "English 2nd Paper",
    "Mathematics",
    "Information and Communication Technology (ICT)",
    "Religious and Moral Education",
    "Accounting",
    "Business Entrepreneurship",
    "Finance and Banking",
    "General Science"
  ],
  class_10_humanities: [
    "Bangla 1st Paper",
    "Bangla 2nd Paper",
    "English 1st Paper",
    "English 2nd Paper",
    "Mathematics",
    "Information and Communication Technology (ICT)",
    "Religious and Moral Education",
    "History of Bangladesh and World Civilization",
    "Geography and Environment",
    "Civics and Citizenship",
    "Economics"
  ]
};

/**
 * Normalizes class number string into numeric integer (1..10)
 */
function normalizeClassNumber(className) {
  if (!className) return null;
  const match = String(className).match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Normalizes group/stream string into standard key
 * Returns 'science' | 'businessStudies' | 'humanities' | null
 */
function normalizeGroup(group) {
  if (!group) return null;
  const lower = String(group).toLowerCase().trim().replace(/[\s_-]+/g, '');
  if (lower.includes('science')) return 'science';
  if (lower.includes('business') || lower.includes('commerce')) return 'businessStudies';
  if (lower.includes('humanities') || lower.includes('arts')) return 'humanities';
  return null;
}

/**
 * Resolves standard map key based on class and group
 */
function getClassSubjectMapKey(className, group) {
  const classNum = normalizeClassNumber(className);
  if (!classNum || classNum < 1 || classNum > 10) return null;

  if (classNum <= 8) {
    return `class_${classNum}`;
  }

  const normGroup = normalizeGroup(group);
  if (!normGroup) return null;

  return `class_${classNum}_${normGroup}`;
}

/**
 * Gets array of valid subjects for a class + group combination
 */
function getValidSubjects(className, group) {
  const key = getClassSubjectMapKey(className, group);
  if (!key) return [];
  return CLASS_SUBJECTS_MAP[key] || [];
}

/**
 * Checks if a subject is valid for the class + group combination
 */
function isValidSubject(className, group, subject) {
  if (!subject) return false;
  const validList = getValidSubjects(className, group);
  const cleanSubject = String(subject).trim().toLowerCase();
  return validList.some((s) => s.toLowerCase() === cleanSubject);
}

/**
 * Resolves the effective class number and group of a student record
 */
function getStudentClassAndGroup(student) {
  if (!student) return { classNum: null, group: null };
  const classNum = normalizeClassNumber(student.className);
  let group = normalizeGroup(student.stream || student.group);
  if (!group && student.className) {
    group = normalizeGroup(student.className);
  }
  return { classNum, group };
}

/**
 * Checks whether a student is eligible for a specific exam
 */
function isStudentEligibleForExam(student, exam) {
  if (!student || !exam) return false;

  // 1. Check Class Number
  const studentInfo = getStudentClassAndGroup(student);
  const examClassNum = normalizeClassNumber(exam.className);

  if (!studentInfo.classNum || !examClassNum || studentInfo.classNum !== examClassNum) {
    return false;
  }

  // 2. Check Section
  const studentSection = String(student.section || '').toUpperCase().replace('SECTION', '').trim();
  const examSection = String(exam.section || 'A').toUpperCase().replace('SECTION', '').trim();
  if (studentSection !== examSection) {
    return false;
  }

  // 3. Check Group / Stream for Class 9 and 10
  if (examClassNum >= 9) {
    const examGroup = normalizeGroup(exam.stream || exam.group);
    if (!examGroup || studentInfo.group !== examGroup) {
      return false;
    }
  }

  return true;
}

module.exports = {
  CLASS_SUBJECTS_MAP,
  normalizeClassNumber,
  normalizeGroup,
  getClassSubjectMapKey,
  getValidSubjects,
  isValidSubject,
  getStudentClassAndGroup,
  isStudentEligibleForExam
};

