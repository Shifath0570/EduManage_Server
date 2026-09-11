const mongoose = require('mongoose');
const Mark = require('../models/Mark');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const Assignment = require('../models/Assignment');
const Teacher = require('../models/Teacher');
const {
  isStudentEligibleForExam,
  normalizeClassNumber,
  normalizeGroup,
  isValidSubject
} = require('../config/classSubjects');

// Helper to normalize Class strings (e.g. "Class 5", "class-5", "5" -> "5")
const normalizeClass = (cls) => String(cls || '').replace(/class[_\-\s]*/i, '').trim().toLowerCase();

// Helper to normalize Section strings (e.g. "Section A", "section-a", "a" -> "A")
const normalizeSection = (sec) => String(sec || '').toUpperCase().replace(/section/i, '').trim();

// Helper to calculate Grade and GPA based on marks percentage
const calculateGradeAndGpa = (marksObtained, totalMarks = 100) => {
  const score = Number(marksObtained);
  const total = Number(totalMarks) || 100;
  const percentage = total > 0 ? (score / total) * 100 : 0;

  if (percentage >= 80) return { grade: 'A+', gpa: 5.0 };
  if (percentage >= 70) return { grade: 'A', gpa: 4.0 };
  if (percentage >= 60) return { grade: 'A-', gpa: 3.5 };
  if (percentage >= 50) return { grade: 'B', gpa: 3.0 };
  if (percentage >= 40) return { grade: 'C', gpa: 2.0 };
  if (percentage >= 33) return { grade: 'D', gpa: 1.0 };
  return { grade: 'F', gpa: 0.0 };
};

/**
 * Resolves user identity, role, and teacher assignments from request
 */
async function resolveUserAndAssignments(req) {
  const role = (
    req.user?.role ||
    req.headers['x-user-role'] ||
    req.body?.teacherRole ||
    req.query?.userRole ||
    'admin'
  ).toLowerCase().trim();

  const email = (
    req.user?.email ||
    req.headers['x-user-email'] ||
    req.body?.teacherEmail ||
    req.query?.teacherEmail ||
    req.query?.email ||
    ''
  ).toLowerCase().trim();

  const userId =
    req.user?.id ||
    req.headers['x-user-id'] ||
    req.body?.teacherId ||
    req.query?.userId ||
    null;

  if (role !== 'teacher') {
    return { isTeacher: false, role: role || 'admin', email, userId, assignments: [] };
  }

  const orQueries = [];
  if (email) {
    orQueries.push({ teacherEmail: email });
  }
  if (userId) {
    orQueries.push({ teacherId: String(userId) });
  }

  let teacherDoc = null;
  if (email) {
    teacherDoc = await Teacher.findOne({ email });
    if (teacherDoc) {
      orQueries.push({ teacherId: String(teacherDoc._id) });
      if (teacherDoc.teacherId) {
        orQueries.push({ teacherId: String(teacherDoc.teacherId) });
      }
    }
  }

  let assignments = [];
  if (orQueries.length > 0) {
    assignments = await Assignment.find({ $or: orQueries, status: { $ne: 'Inactive' } });
  }

  return {
    isTeacher: true,
    role: 'teacher',
    email,
    userId: userId || (teacherDoc ? String(teacherDoc._id) : null),
    teacherDoc,
    assignments
  };
}

/**
 * Validates if teacher is authorized to enter/edit marks for a given class, section, stream, and subject
 */
function isTeacherAuthorizedForMarks(teacherInfo, targetClassNum, targetSection, targetStream, targetSubject) {
  if (!teacherInfo.isTeacher) return true; // Admin has full access

  const { assignments, teacherDoc } = teacherInfo;
  const cleanSub = String(targetSubject || '').toLowerCase().trim();
  const cleanSec = String(targetSection || 'A').toUpperCase().replace('SECTION', '').trim();
  const normGroup = normalizeGroup(targetStream);

  if (assignments && assignments.length > 0) {
    const isAssigned = assignments.some((a) => {
      // 1. Class match
      const aClassNum = normalizeClassNumber(a.classId);
      if (aClassNum !== targetClassNum) return false;

      // 2. Section match (if section is assigned)
      if (a.sectionId && a.sectionId !== 'All') {
        const aSec = String(a.sectionId).toUpperCase().replace('SECTION', '').trim();
        if (aSec !== cleanSec) return false;
      }

      // 3. Group match for Class 9/10
      if (targetClassNum >= 9) {
        const aGroup = normalizeGroup(a.groupId);
        if (aGroup && aGroup !== 'general' && aGroup !== normGroup) {
          return false;
        }
      }

      // 4. Subject match
      const aSub = String(a.subjectId || '').toLowerCase().trim();
      if (aSub && aSub !== 'all subjects' && aSub !== cleanSub) {
        const normASub = aSub.replace(/[\s_-]+/g, '');
        const normTSub = cleanSub.replace(/[\s_-]+/g, '');
        if (normASub !== normTSub) return false;
      }

      return true;
    });

    if (isAssigned) return true;
  }

  if (teacherDoc && teacherDoc.subjectSpecialization) {
    const spec = String(teacherDoc.subjectSpecialization).toLowerCase().trim();
    if (spec.includes(cleanSub) || cleanSub.includes(spec)) {
      return true;
    }
  }

  return false;
}

/**
 * Save or update marks for students (bulk upsert with eligibility validation and teacher authorization)
 * POST /api/marks
 */
exports.saveMarks = async (req, res) => {
  try {
    const userContext = await resolveUserAndAssignments(req);

    const { className, class: classParam, section, exam, examId, subject, records } = req.body;

    const targetClass = className || classParam;

    if (!targetClass || !section || !exam || !subject || !records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide className, section, exam, subject, and records array.'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Records array cannot be empty.'
      });
    }

    // 1. Find the selected Exam
    let examDoc = null;
    if (examId && mongoose.isValidObjectId(examId)) {
      examDoc = await Exam.findById(examId);
    }
    if (!examDoc) {
      examDoc = await Exam.findOne({ examName: new RegExp(`^${exam.trim()}$`, 'i') });
    }

    if (!examDoc) {
      return res.status(404).json({
        success: false,
        message: `Exam "${exam}" not found.`
      });
    }

    const examClassNum = normalizeClassNumber(examDoc.className);
    const targetClassNum = normalizeClassNumber(targetClass);

    // 2. Validate requested Class and Section against Exam Target Class and Section
    if (
      targetClassNum !== examClassNum ||
      normalizeSection(section) !== normalizeSection(examDoc.section)
    ) {
      return res.status(400).json({
        success: false,
        message: 'This student is not eligible for this exam.'
      });
    }

    // 3. Strict Teacher Authorization check
    if (userContext.isTeacher) {
      const isAuthorized = isTeacherAuthorizedForMarks(
        userContext,
        examClassNum,
        examDoc.section,
        examDoc.stream,
        subject
      );

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are not authorized to enter or modify marks for ${examDoc.className}${examDoc.stream ? ` (${examDoc.stream})` : ''} Section ${examDoc.section} (${subject}). Teachers may only enter marks for their assigned class, section, and subject.`
        });
      }
    }

    // 4. Validate requested Subject against Exam Scope (if exam is subject-specific)
    if (examDoc.subject && examDoc.subject !== 'All Subjects') {
      if (subject.trim().toLowerCase() !== examDoc.subject.trim().toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: `Subject "${subject}" does not match exam scope "${examDoc.subject}".`
        });
      }
    }

    // Validate that the subject is a valid subject for the Class + Group
    const validSub = isValidSubject(examDoc.className, examDoc.stream, subject);
    if (!validSub && examDoc.subject !== 'All Subjects') {
      return res.status(400).json({
        success: false,
        message: `Subject "${subject}" is not valid for ${examDoc.className}${examDoc.stream ? ` (${examDoc.stream})` : ''}.`
      });
    }

    // 4. Validate EVERY student in records against Exam Target Class, Group, and Section
    for (const item of records) {
      const studentId = item.studentId || item._id;
      if (!studentId) continue;

      const studentQuery = [
        { studentId: String(studentId).trim() }
      ];
      if (mongoose.isValidObjectId(studentId)) {
        studentQuery.push({ _id: studentId });
      }

      const student = await Student.findOne({ $or: studentQuery });

      if (!student) {
        return res.status(400).json({
          success: false,
          message: `Student with ID "${studentId}" not found.`
        });
      }

      // Strict Exam Target Eligibility verification (Class + Group/Stream + Section)
      const isEligible = isStudentEligibleForExam(student, examDoc);
      if (!isEligible) {
        return res.status(400).json({
          success: false,
          message: `Student "${student.name}" (Roll: ${student.roll}) is not eligible for this exam (${examDoc.className}${examDoc.stream ? ` - ${examDoc.stream}` : ''} Section ${examDoc.section}).`
        });
      }
    }

    const formattedClass = examDoc.className;
    const cleanSection = examDoc.section || 'A';
    const cleanExam = examDoc.examName;
    const cleanSubject = subject.trim();

    const savedMarks = [];

    for (const item of records) {
      const studentId = item.studentId || item._id;
      if (!studentId) continue;

      const marksObtained = Math.min(100, Math.max(0, Number(item.marksObtained || item.marks || 0)));
      const totalMarks = Number(item.totalMarks) || 100;
      const { grade, gpa } = calculateGradeAndGpa(marksObtained, totalMarks);

      const updateData = {
        studentId: String(studentId).trim(),
        studentName: (item.studentName || item.name || 'Student').trim(),
        roll: String(item.roll || '0').trim(),
        className: formattedClass,
        section: cleanSection,
        exam: cleanExam,
        subject: cleanSubject,
        marksObtained,
        totalMarks,
        grade,
        gpa,
        remarks: item.remarks || ''
      };

      const record = await Mark.findOneAndUpdate(
        {
          studentId: updateData.studentId,
          exam: updateData.exam,
          subject: updateData.subject,
          className: updateData.className,
          section: updateData.section
        },
        updateData,
        { upsert: true, new: true, runValidators: true }
      );

      savedMarks.push(record);
    }

    res.status(200).json({
      success: true,
      message: `Marks saved successfully for ${savedMarks.length} students.`,
      count: savedMarks.length,
      data: savedMarks
    });
  } catch (error) {
    console.error('Save marks error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save marks'
    });
  }
};

/**
 * Get marks with filters (constrained by Exam Target Class/Stream/Section if Exam specified)
 * GET /api/marks
 */
exports.getMarks = async (req, res) => {
  try {
    const { className, class: classParam, section, exam, examId, subject, studentId, stream, group } = req.query;

    const filter = {};

    let targetClass = className || classParam;
    let targetSection = section;

    // If an exam is specified, read its target Class and Section as source of truth
    let examDoc = null;
    if (exam || examId) {
      if (examId && mongoose.isValidObjectId(examId)) {
        examDoc = await Exam.findById(examId);
      }
      if (!examDoc && exam && exam !== 'All') {
        examDoc = await Exam.findOne({ examName: new RegExp(`^${exam.trim()}$`, 'i') });
      }

      if (examDoc) {
        targetClass = examDoc.className;
        targetSection = examDoc.section || 'A';
        filter.exam = { $regex: new RegExp(`^${examDoc.examName.trim()}$`, 'i') };
      } else if (exam && exam !== 'All') {
        filter.exam = { $regex: new RegExp(`^${exam.trim()}$`, 'i') };
      }
    }

    if (targetClass && targetClass !== 'All') {
      const classNum = normalizeClassNumber(targetClass);
      if (classNum) {
        filter.className = { $regex: new RegExp(`^${classNum}$|^Class ${classNum}$|^class_${classNum}$`, 'i') };
      }
    }

    if (targetSection && targetSection !== 'All') {
      const cleanSection = targetSection.toUpperCase().replace('SECTION', '').trim();
      filter.section = cleanSection;
    }

    if (subject && subject !== 'All') {
      filter.subject = { $regex: new RegExp(`^${subject.trim()}$`, 'i') };
    }

    if (studentId) {
      filter.studentId = String(studentId).trim();
    }

    let marks = await Mark.find(filter).sort({ roll: 1, studentId: 1 });

    // If exam has target group (for Class 9 and 10), ensure we only return marks of eligible students
    if (examDoc && normalizeClassNumber(examDoc.className) >= 9 && examDoc.stream) {
      const studentIds = marks.map((m) => m.studentId);
      if (studentIds.length > 0) {
        const students = await Student.find({ studentId: { $in: studentIds } });
        const eligibleStudentIdSet = new Set(
          students.filter((s) => isStudentEligibleForExam(s, examDoc)).map((s) => s.studentId)
        );
        marks = marks.filter((m) => eligibleStudentIdSet.has(m.studentId));
      }
    }

    res.status(200).json({
      success: true,
      count: marks.length,
      data: marks
    });
  } catch (error) {
    console.error('Get marks error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch marks'
    });
  }
};

/**
 * Get authenticated student's results with exam type filtering and summary statistics
 * GET /api/marks/my-results
 * GET /api/marks/student
 */
exports.getStudentResults = async (req, res) => {
  try {
    const userEmail = (
      req.user?.email ||
      req.headers['x-user-email'] ||
      req.query?.email ||
      req.query?.userEmail ||
      ''
    ).toLowerCase().trim();

    const userId =
      req.user?.id ||
      req.user?._id ||
      req.headers['x-user-id'] ||
      req.query?.userId ||
      req.query?.stuId ||
      null;

    const routeIdentifier = req.params?.identifier ? req.params.identifier.trim() : '';
    const requestedExamType = (req.query?.examType || 'All').trim();

    // 1. Resolve student record strictly from authenticated user identity
    const orConditions = [];

    if (userEmail) {
      orConditions.push({ email: userEmail });
    }

    if (userId) {
      orConditions.push({ stuId: String(userId) });
      orConditions.push({ studentId: String(userId) });
      orConditions.push({ 'stuId._id': String(userId) });
      if (mongoose.isValidObjectId(userId)) {
        orConditions.push({ _id: userId });
      }
    }

    if (routeIdentifier) {
      orConditions.push({ studentId: routeIdentifier });
      orConditions.push({ stuId: routeIdentifier });
      orConditions.push({ email: routeIdentifier.toLowerCase() });
      if (mongoose.isValidObjectId(routeIdentifier)) {
        orConditions.push({ _id: routeIdentifier });
      }
    }

    if (orConditions.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Unable to resolve student identity.'
      });
    }

    const student = await Student.findOne({ $or: orConditions });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile record not found for this account.'
      });
    }

    // 2. Query all marks strictly for this student
    const studentQueryConditions = [];
    if (student.studentId) studentQueryConditions.push({ studentId: student.studentId });
    if (student.stuId) studentQueryConditions.push({ studentId: student.stuId });
    studentQueryConditions.push({ studentId: String(student._id) });
    if (student.name && student.className && student.roll) {
      studentQueryConditions.push({
        studentName: new RegExp(`^${student.name.trim()}$`, 'i'),
        className: new RegExp(`^${student.className.trim()}$`, 'i'),
        roll: String(student.roll).trim()
      });
    }

    const rawMarks = await Mark.find({ $or: studentQueryConditions }).sort({ createdAt: -1 });

    // 3. Enrich with Exam details (examType, examDate, etc.)
    const examNames = [...new Set(rawMarks.map((m) => m.exam))];
    const examDocs = await Exam.find({ examName: { $in: examNames } });
    const examMap = new Map();
    examDocs.forEach((ex) => {
      examMap.set(ex.examName.toLowerCase().trim(), ex);
    });

    const enrichedMarks = rawMarks.map((m) => {
      const examDoc = examMap.get(m.exam.toLowerCase().trim());
      const examType = examDoc?.examType || 'Mid Term';
      const examDate = examDoc?.examDate || '';
      const totalMarks = Number(m.totalMarks) || Number(examDoc?.totalMarks) || 100;
      const marksObtained = Number(m.marksObtained) || 0;
      const percentage = totalMarks > 0 ? Number(((marksObtained / totalMarks) * 100).toFixed(1)) : 0;
      const { grade, gpa } = calculateGradeAndGpa(marksObtained, totalMarks);

      return {
        _id: m._id,
        examId: examDoc?._id || null,
        examName: m.exam,
        examType,
        examDate,
        subject: m.subject,
        className: m.className,
        section: m.section,
        totalMarks,
        marksObtained,
        percentage,
        grade: m.grade || grade,
        gpa: typeof m.gpa === 'number' ? m.gpa : gpa,
        remarks: m.remarks || '',
        createdAt: m.createdAt
      };
    });

    // 4. Filter by examType if requested
    let filteredMarks = enrichedMarks;
    if (requestedExamType && requestedExamType !== 'All') {
      const normRequested = requestedExamType.toLowerCase().replace(/[\s_-]/g, '');
      filteredMarks = enrichedMarks.filter((m) => {
        const normType = m.examType.toLowerCase().replace(/[\s_-]/g, '');
        const normExam = m.examName.toLowerCase().replace(/[\s_-]/g, '');

        if (normType === normRequested) return true;
        if (normType.includes(normRequested) || normRequested.includes(normType)) return true;
        if (normExam.includes(normRequested)) return true;

        // Custom aliases for types
        if (normRequested === 'finalexam' && (normType === 'final' || normExam.includes('final'))) return true;
        if (normRequested === 'midtermexam' && (normType === 'midterm' || normExam.includes('midterm') || normExam.includes('mid'))) return true;
        if (normRequested === 'classtest' && (normType === 'classtest' || normExam.includes('classtest') || normExam.includes('ct'))) return true;
        if (normRequested === 'quiz' && (normType === 'quiz' || normExam.includes('quiz'))) return true;

        return false;
      });
    }

    // 5. Group by Exam for clean Exam-wise presentation
    const groupedMap = new Map();
    filteredMarks.forEach((mark) => {
      const key = mark.examName;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          examName: mark.examName,
          examType: mark.examType,
          examDate: mark.examDate,
          examId: mark.examId,
          totalMarks: 0,
          obtainedMarks: 0,
          totalSubjects: 0,
          subjects: []
        });
      }

      const group = groupedMap.get(key);
      group.totalMarks += mark.totalMarks;
      group.obtainedMarks += mark.marksObtained;
      group.totalSubjects += 1;
      group.subjects.push(mark);
    });

    const groupedByExam = Array.from(groupedMap.values()).map((group) => {
      const pct = group.totalMarks > 0 ? Number(((group.obtainedMarks / group.totalMarks) * 100).toFixed(1)) : 0;
      const gpaSum = group.subjects.reduce((sum, s) => sum + (Number(s.gpa) || 0), 0);
      const avgGpa = group.totalSubjects > 0 ? Number((gpaSum / group.totalSubjects).toFixed(2)) : 0;
      const hasFail = group.subjects.some((s) => s.grade === 'F' || s.gpa === 0);

      const finalGpa = hasFail ? 0.0 : avgGpa;
      let overallGrade = 'F';
      if (!hasFail) {
        if (finalGpa >= 5.0) overallGrade = 'A+';
        else if (finalGpa >= 4.0) overallGrade = 'A';
        else if (finalGpa >= 3.5) overallGrade = 'A-';
        else if (finalGpa >= 3.0) overallGrade = 'B';
        else if (finalGpa >= 2.0) overallGrade = 'C';
        else if (finalGpa >= 1.0) overallGrade = 'D';
      }

      return {
        ...group,
        percentage: pct,
        gpa: finalGpa,
        grade: overallGrade,
        isPassed: !hasFail
      };
    });

    // 6. Calculate overall summary metrics
    const totalSubjects = filteredMarks.length;
    const totalMarks = filteredMarks.reduce((sum, m) => sum + m.totalMarks, 0);
    const obtainedMarks = filteredMarks.reduce((sum, m) => sum + m.marksObtained, 0);
    const overallPercentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(1)) : 0;
    const gpaSum = filteredMarks.reduce((sum, m) => sum + (Number(m.gpa) || 0), 0);
    const hasAnyFail = filteredMarks.some((m) => m.grade === 'F' || m.gpa === 0);
    const rawGpa = totalSubjects > 0 ? Number((gpaSum / totalSubjects).toFixed(2)) : 0;
    const overallGpa = hasAnyFail ? 0.0 : rawGpa;

    let overallGrade = 'F';
    if (!hasAnyFail && totalSubjects > 0) {
      if (overallGpa >= 5.0) overallGrade = 'A+';
      else if (overallGpa >= 4.0) overallGrade = 'A';
      else if (overallGpa >= 3.5) overallGrade = 'A-';
      else if (overallGpa >= 3.0) overallGrade = 'B';
      else if (overallGpa >= 2.0) overallGrade = 'C';
      else if (overallGpa >= 1.0) overallGrade = 'D';
    }

    res.status(200).json({
      success: true,
      student: {
        _id: student._id,
        studentId: student.studentId || student.stuId,
        name: student.name,
        roll: student.roll,
        className: student.className,
        section: student.section,
        email: student.email,
        profileImage: student.profileImage
      },
      summary: {
        totalSubjects,
        totalMarks,
        obtainedMarks,
        overallPercentage,
        overallGpa,
        overallGrade,
        isPassed: !hasAnyFail && totalSubjects > 0
      },
      availableExamTypes: ['All', 'Final Exam', 'Midterm Exam', 'Class Test', 'Quiz'],
      results: filteredMarks,
      groupedByExam
    });
  } catch (error) {
    console.error('Get student results error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch student results'
    });
  }
};

