const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const QuestionPaper = require('../models/QuestionPaper');
const Assignment = require('../models/Assignment');
const Teacher = require('../models/Teacher');
const { generateExamQuestionPaper, validateAndNormalizeConfig } = require('../services/aiQuestionService');
const {
  normalizeClassNumber,
  normalizeGroup
} = require('../config/classSubjects');

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
 * Validates if teacher is authorized for the exam
 */
function isTeacherAuthorizedForExam(teacherInfo, examDoc) {
  if (!teacherInfo.isTeacher) return true; // Admin has full access

  // If teacher created the exam, they are authorized
  if (examDoc.createdByEmail && teacherInfo.email && examDoc.createdByEmail.toLowerCase() === teacherInfo.email.toLowerCase()) {
    return true;
  }
  if (examDoc.createdBy && teacherInfo.userId && String(examDoc.createdBy) === String(teacherInfo.userId)) {
    return true;
  }

  const { assignments, teacherDoc } = teacherInfo;
  const examClassNum = normalizeClassNumber(examDoc.className);
  const examSub = String(examDoc.subject || '').toLowerCase().trim();
  const examStream = normalizeGroup(examDoc.stream);
  const examSec = (examDoc.section || 'A').toUpperCase().replace('SECTION', '').trim();

  if (assignments && assignments.length > 0) {
    const isAssigned = assignments.some((a) => {
      // 1. Class check
      const aClassNum = normalizeClassNumber(a.classId);
      if (aClassNum !== examClassNum) return false;

      // 2. Section check (if section assigned)
      if (a.sectionId && a.sectionId !== 'All') {
        const aSec = String(a.sectionId).toUpperCase().replace('SECTION', '').trim();
        if (aSec !== examSec) return false;
      }

      // 3. Group check for Class 9/10
      if (examClassNum >= 9) {
        const aGroup = normalizeGroup(a.groupId);
        if (aGroup && aGroup !== 'general' && aGroup !== examStream) {
          return false;
        }
      }

      // 4. Subject check
      const aSub = String(a.subjectId || '').toLowerCase().trim();
      if (aSub && aSub !== 'all subjects' && aSub !== examSub) {
        const normASub = aSub.replace(/[\s_-]+/g, '');
        const normTSub = examSub.replace(/[\s_-]+/g, '');
        if (normASub !== normTSub) return false;
      }

      return true;
    });

    if (isAssigned) return true;
  }

  if (teacherDoc && teacherDoc.subjectSpecialization) {
    const spec = String(teacherDoc.subjectSpecialization).toLowerCase().trim();
    if (spec.includes(examSub) || examSub.includes(spec)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate (or fetch existing) Question Paper for an Exam
 * POST /api/question-papers/generate/:examId
 */
exports.generateQuestionPaper = async (req, res) => {
  try {
    const userContext = await resolveUserAndAssignments(req);
    const { examId } = req.params;
    const { force = false, questionConfiguration } = req.body || {};

    if (!examId || !mongoose.isValidObjectId(examId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Exam ID provided.'
      });
    }

    const examDoc = await Exam.findById(examId);
    if (!examDoc) {
      return res.status(404).json({
        success: false,
        message: 'Exam record not found.'
      });
    }

    // Strict Teacher Authorization check
    if (userContext.isTeacher) {
      const authorized = isTeacherAuthorizedForExam(userContext, examDoc);
      if (!authorized) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are not authorized to generate a Question Paper for ${examDoc.examName} (${examDoc.className}${examDoc.stream ? ` - ${examDoc.stream}` : ''} Section ${examDoc.section} - ${examDoc.subject}). Teachers can only generate question papers for their assigned courses.`
        });
      }
    }

    // Check if Question Paper already exists and force regeneration is not requested
    const existingPaper = await QuestionPaper.findOne({ examId });
    if (existingPaper && !force) {
      return res.status(200).json({
        success: true,
        message: 'Existing Question Paper retrieved.',
        data: existingPaper
      });
    }

    // Resolve question configuration from payload, exam document, or existing paper
    const activeConfig =
      questionConfiguration ||
      existingPaper?.questionConfiguration ||
      examDoc.questionConfiguration;

    // Generate Question Paper via AI Service with strict configuration enforcement
    const aiResult = await generateExamQuestionPaper(examDoc, activeConfig);

    const paperData = {
      examId: examDoc._id,
      examName: examDoc.examName,
      className: examDoc.className,
      stream: examDoc.stream || null,
      section: examDoc.section || 'A',
      subject: examDoc.subject || 'All Subjects',
      academicYear: new Date().getFullYear().toString(),
      examDate: examDoc.examDate || '',
      totalMarks: examDoc.totalMarks || 100,
      duration: examDoc.duration || '2 Hours 30 Minutes',
      generalInstructions: aiResult.generalInstructions,
      sections: aiResult.sections,
      questionConfiguration: aiResult.questionConfiguration,
      generatedBy: 'AI Curriculum Assistant'
    };

    const savedPaper = await QuestionPaper.findOneAndUpdate(
      { examId: examDoc._id },
      paperData,
      { upsert: true, new: true, runValidators: true }
    );

    // Also persist questionConfiguration on Exam document if not already set
    if (aiResult.questionConfiguration && (!examDoc.questionConfiguration || !examDoc.questionConfiguration.mcq)) {
      await Exam.findByIdAndUpdate(examDoc._id, { questionConfiguration: aiResult.questionConfiguration });
    }

    res.status(201).json({
      success: true,
      message: 'Question paper generated successfully according to configured structure.',
      data: savedPaper
    });
  } catch (error) {
    console.error('Generate Question Paper error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to generate question paper.'
    });
  }
};

/**
 * Get Question Paper for an Exam by Exam ID
 * GET /api/question-papers/exam/:examId
 */
exports.getQuestionPaperByExamId = async (req, res) => {
  try {
    const { examId } = req.params;

    if (!examId || !mongoose.isValidObjectId(examId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Exam ID provided.'
      });
    }

    const examDoc = await Exam.findById(examId);
    if (!examDoc) {
      return res.status(404).json({
        success: false,
        message: 'Exam record not found.'
      });
    }

    const questionPaper = await QuestionPaper.findOne({ examId });

    res.status(200).json({
      success: true,
      data: {
        exam: examDoc,
        questionPaper: questionPaper || null
      }
    });
  } catch (error) {
    console.error('Get Question Paper error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch question paper.'
    });
  }
};

/**
 * Update Question Paper Content & Configuration
 * PUT /api/question-papers/:id
 */
exports.updateQuestionPaper = async (req, res) => {
  try {
    const { id } = req.params;
    const { sections, generalInstructions, duration, questionConfiguration } = req.body;

    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Question Paper ID provided.'
      });
    }

    const updateFields = {};
    if (sections) updateFields.sections = sections;
    if (generalInstructions) updateFields.generalInstructions = generalInstructions;
    if (duration) updateFields.duration = duration;
    if (questionConfiguration) updateFields.questionConfiguration = questionConfiguration;

    // Check if user is teacher and verify permission
    const userContext = await resolveUserAndAssignments(req);
    if (userContext.isTeacher) {
      const targetPaper = await QuestionPaper.findById(id);
      if (targetPaper) {
        const examDoc = await Exam.findById(targetPaper.examId);
        if (examDoc && !isTeacherAuthorizedForExam(userContext, examDoc)) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You are not authorized to update this question paper.'
          });
        }
      }
    }

    const updated = await QuestionPaper.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Question Paper not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Question Paper updated successfully.',
      data: updated
    });
  } catch (error) {
    console.error('Update Question Paper error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update question paper.'
    });
  }
};

/**
 * Regenerate Question Paper for an Exam strictly according to Configuration
 * POST /api/question-papers/regenerate/:examId
 */
exports.regenerateQuestionPaper = async (req, res) => {
  try {
    const userContext = await resolveUserAndAssignments(req);
    const { examId } = req.params;
    const { questionConfiguration } = req.body || {};

    if (!examId || !mongoose.isValidObjectId(examId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Exam ID provided.'
      });
    }

    const examDoc = await Exam.findById(examId);
    if (!examDoc) {
      return res.status(404).json({
        success: false,
        message: 'Exam record not found.'
      });
    }

    // Strict Teacher Authorization check
    if (userContext.isTeacher) {
      const authorized = isTeacherAuthorizedForExam(userContext, examDoc);
      if (!authorized) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are not authorized to regenerate a Question Paper for ${examDoc.examName} (${examDoc.className}${examDoc.stream ? ` - ${examDoc.stream}` : ''} Section ${examDoc.section} - ${examDoc.subject}). Teachers can only regenerate question papers for their assigned courses.`
        });
      }
    }

    const existingPaper = await QuestionPaper.findOne({ examId });

    // Use passed configuration, existing questionPaper configuration, or exam document configuration
    const activeConfig =
      questionConfiguration ||
      existingPaper?.questionConfiguration ||
      examDoc.questionConfiguration;

    const aiResult = await generateExamQuestionPaper(examDoc, activeConfig);

    const paperData = {
      examId: examDoc._id,
      examName: examDoc.examName,
      className: examDoc.className,
      stream: examDoc.stream || null,
      section: examDoc.section || 'A',
      subject: examDoc.subject || 'All Subjects',
      academicYear: new Date().getFullYear().toString(),
      examDate: examDoc.examDate || '',
      totalMarks: examDoc.totalMarks || 100,
      duration: examDoc.duration || '2 Hours 30 Minutes',
      generalInstructions: aiResult.generalInstructions,
      sections: aiResult.sections,
      questionConfiguration: aiResult.questionConfiguration,
      generatedBy: 'AI Curriculum Assistant (Regenerated)'
    };

    const savedPaper = await QuestionPaper.findOneAndUpdate(
      { examId: examDoc._id },
      paperData,
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Question paper regenerated successfully according to configured structure.',
      data: savedPaper
    });
  } catch (error) {
    console.error('Regenerate Question Paper error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to regenerate question paper.'
    });
  }
};
