const mongoose = require('mongoose');
const Mark = require('../models/Mark');
const Exam = require('../models/Exam');
const Student = require('../models/Student');

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
 * Save or update marks for students (bulk upsert with eligibility validation)
 * POST /api/marks
 */
exports.saveMarks = async (req, res) => {
  try {
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

    const examTargetClass = examDoc.className;
    const examTargetSection = examDoc.section || 'A';

    // 2. Validate requested Class and Section against Exam Target Class and Section
    if (
      normalizeClass(targetClass) !== normalizeClass(examTargetClass) ||
      normalizeSection(section) !== normalizeSection(examTargetSection)
    ) {
      return res.status(400).json({
        success: false,
        message: 'This student is not eligible for this exam.'
      });
    }

    // 3. Validate requested Subject against Exam Scope (if exam is subject-specific)
    if (examDoc.subject && examDoc.subject !== 'All Subjects') {
      if (subject.trim().toLowerCase() !== examDoc.subject.trim().toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: `Subject "${subject}" does not match exam scope "${examDoc.subject}".`
        });
      }
    }

    // 4. Validate EVERY student in records against Exam Target Class and Section
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

      if (
        normalizeClass(student.className) !== normalizeClass(examTargetClass) ||
        normalizeSection(student.section) !== normalizeSection(examTargetSection)
      ) {
        return res.status(400).json({
          success: false,
          message: 'This student is not eligible for this exam.'
        });
      }
    }

    const formattedClass = examTargetClass;
    const cleanSection = examTargetSection;
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
 * Get marks with filters (constrained by Exam Target Class/Section if Exam specified)
 * GET /api/marks
 */
exports.getMarks = async (req, res) => {
  try {
    const { className, class: classParam, section, exam, examId, subject, studentId } = req.query;

    const filter = {};

    let targetClass = className || classParam;
    let targetSection = section;

    // If an exam is specified, read its target Class and Section as source of truth
    if (exam || examId) {
      let examDoc = null;
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
      const cleanClass = targetClass.replace('class_', '').replace('Class', '').replace('class-', '').trim();
      filter.className = { $regex: new RegExp(`^${cleanClass}$|^Class ${cleanClass}$|^class_${cleanClass}$`, 'i') };
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

    const marks = await Mark.find(filter).sort({ roll: 1, studentId: 1 });

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
