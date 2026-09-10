const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Assignment = require('../models/Assignment');
const Teacher = require('../models/Teacher');
const {
  normalizeClassNumber,
  normalizeGroup,
  getValidSubjects,
  isValidSubject
} = require('../config/classSubjects');

/**
 * Resolves user identity, role, and teacher assignments from request
 */
async function resolveUserAndAssignments(req) {
  const role = (
    req.user?.role ||
    req.headers['x-user-role'] ||
    req.body?.createdByRole ||
    req.body?.teacherRole ||
    req.query?.userRole ||
    'admin'
  ).toLowerCase().trim();

  const email = (
    req.user?.email ||
    req.headers['x-user-email'] ||
    req.body?.createdByEmail ||
    req.body?.teacherEmail ||
    req.query?.teacherEmail ||
    req.query?.email ||
    ''
  ).toLowerCase().trim();

  const userId =
    req.user?.id ||
    req.headers['x-user-id'] ||
    req.body?.createdBy ||
    req.query?.userId ||
    null;

  const userName =
    req.user?.name ||
    req.headers['x-user-name'] ||
    req.body?.createdByName ||
    req.body?.teacherName ||
    '';

  if (role !== 'teacher') {
    return { isTeacher: false, role: role || 'admin', email, userId, userName, assignments: [] };
  }

  // Find all assignments for this teacher by email, userId, or matching Teacher record
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
    userName: userName || (teacherDoc ? teacherDoc.fullName : 'Teacher'),
    teacherDoc,
    assignments
  };
}

/**
 * Validates if a Teacher is authorized to create/manage an exam for a class, group, and subject
 */
function isTeacherAuthorizedForExam(teacherInfo, formattedClass, stream, subject) {
  if (!teacherInfo.isTeacher) return true; // Admin has full access

  const { assignments, teacherDoc } = teacherInfo;
  const targetClassNum = normalizeClassNumber(formattedClass);
  const targetSubject = String(subject || '').toLowerCase().trim();
  const targetStream = normalizeGroup(stream);

  // 1. Check Assignments collection
  if (assignments && assignments.length > 0) {
    const isAssigned = assignments.some((a) => {
      const aClassNum = normalizeClassNumber(a.classId);
      if (aClassNum !== targetClassNum) return false;

      // Group check for Class 9/10
      if (targetClassNum >= 9) {
        const aGroup = normalizeGroup(a.groupId);
        if (aGroup && aGroup !== 'general' && aGroup !== targetStream) {
          return false;
        }
      }

      // Subject check
      const aSubject = String(a.subjectId || '').toLowerCase().trim();
      if (aSubject && aSubject !== 'all subjects' && aSubject !== targetSubject) {
        const normASub = aSubject.replace(/[\s_-]+/g, '');
        const normTSub = targetSubject.replace(/[\s_-]+/g, '');
        if (normASub !== normTSub) return false;
      }

      return true;
    });

    if (isAssigned) return true;
  }

  // 2. Fallback check Teacher's subjectSpecialization if no explicit course assignment exists
  if (teacherDoc && teacherDoc.subjectSpecialization) {
    const spec = String(teacherDoc.subjectSpecialization).toLowerCase().trim();
    if (spec.includes(targetSubject) || targetSubject.includes(spec)) {
      return true;
    }
  }

  return false;
}

// Create a new exam
exports.createExam = async (req, res) => {
  try {
    const userContext = await resolveUserAndAssignments(req);

    const {
      examName,
      examType,
      className,
      class: classParam,
      section,
      stream,
      group,
      subject,
      totalMarks,
      passMarks,
      examDate,
      duration,
      questionConfiguration,
      status,
      description
    } = req.body;

    if (!examName || (!className && !classParam) || !examDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide examName, className, and examDate.'
      });
    }

    const rawClass = className || classParam;
    const classNum = normalizeClassNumber(rawClass);

    if (!classNum || classNum < 1 || classNum > 10) {
      return res.status(400).json({
        success: false,
        message: 'Target Class must be between Class 1 and Class 10.'
      });
    }

    const formattedClass = `Class ${classNum}`;
    const rawGroup = stream || group || null;

    let resolvedGroup = null;
    if (classNum >= 9) {
      const normGroup = normalizeGroup(rawGroup);
      if (!normGroup) {
        return res.status(400).json({
          success: false,
          message: `Please select a valid Group (Science, Business, or Humanities) for ${formattedClass}.`
        });
      }
      resolvedGroup = normGroup === 'science' ? 'Science' : normGroup === 'businessStudies' ? 'Business' : 'Humanities';
    } else {
      resolvedGroup = null;
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Please select a Subject.'
      });
    }

    // Validate that the subject is valid for the Class + Group
    const validSubject = isValidSubject(formattedClass, resolvedGroup, subject);
    if (!validSubject) {
      const validSubjectsList = getValidSubjects(formattedClass, resolvedGroup);
      return res.status(400).json({
        success: false,
        message: `"${subject}" is not a valid subject for ${formattedClass}${resolvedGroup ? ` (${resolvedGroup})` : ''}. Valid subjects: ${validSubjectsList.join(', ')}`
      });
    }

    // STRICT TEACHER AUTHORIZATION CHECK
    if (userContext.isTeacher) {
      if (!userContext.assignments || userContext.assignments.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You have no assigned classes or subjects to create exams. Please contact the school administrator.'
        });
      }

      const authorized = isTeacherAuthorizedForExam(userContext, formattedClass, resolvedGroup, subject);
      if (!authorized) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are not authorized to create an exam for ${formattedClass}${resolvedGroup ? ` (${resolvedGroup})` : ''} - ${subject}. Teachers may ONLY create exams for their assigned Class, Group, and Subject.`
        });
      }
    }

    const cleanSection = section ? section.toUpperCase().replace('SECTION', '').trim() : 'A';

    // Format questionConfiguration if provided
    let formattedQuestionConfig = null;
    if (questionConfiguration) {
      const mcqCount = Number(questionConfiguration.mcq?.count) || 0;
      const mcqMarks = Number(questionConfiguration.mcq?.marksPerQuestion) || 1;
      const shortCount = Number(questionConfiguration.short?.count) || 0;
      const shortMarks = Number(questionConfiguration.short?.marksPerQuestion) || 2;
      const creativeCount = Number(questionConfiguration.creative?.count) || 0;
      const creativeMarks = Number(questionConfiguration.creative?.marksPerQuestion) || 5;

      formattedQuestionConfig = {
        mcq: { count: mcqCount, marksPerQuestion: mcqMarks, totalMarks: mcqCount * mcqMarks },
        short: { count: shortCount, marksPerQuestion: shortMarks, totalMarks: shortCount * shortMarks },
        creative: { count: creativeCount, marksPerQuestion: creativeMarks, totalMarks: creativeCount * creativeMarks }
      };
    }

    const exam = await Exam.create({
      examName: examName.trim(),
      examType: examType || 'Mid Term',
      className: formattedClass,
      section: cleanSection,
      stream: resolvedGroup,
      subject: subject.trim(),
      totalMarks: totalMarks ? Number(totalMarks) : 100,
      passMarks: passMarks !== undefined ? Number(passMarks) : 40,
      examDate: String(examDate).trim(),
      duration: duration || '2 Hours 30 Minutes',
      questionConfiguration: formattedQuestionConfig,
      status: status || 'Active',
      description: description || '',
      createdBy: userContext.userId || req.body.createdBy || null,
      createdByEmail: userContext.email || req.body.createdByEmail || null,
      createdByName: userContext.userName || req.body.createdByName || (userContext.isTeacher ? 'Teacher' : 'Admin'),
      createdByRole: userContext.isTeacher ? 'teacher' : (req.body.createdByRole || 'admin')
    });

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: exam
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create exam'
    });
  }
};

// Get all exams with optional filtering (supports myExams=true for teacher ownership partition)
exports.getExams = async (req, res) => {
  try {
    const { className, class: classParam, section, status, stream, group, myExams, createdByEmail, createdBy, teacherEmail } = req.query;

    const filter = {};
    const targetClass = className || classParam;

    if (targetClass && targetClass !== 'All') {
      const classNum = normalizeClassNumber(targetClass);
      if (classNum) {
        filter.className = { $regex: new RegExp(`^${classNum}$|^Class ${classNum}$|^class_${classNum}$`, 'i') };
      }
    }

    if (section && section !== 'All') {
      const cleanSection = section.toUpperCase().replace('SECTION', '').trim();
      filter.section = cleanSection;
    }

    const rawGroup = stream || group;
    if (rawGroup && rawGroup !== 'All') {
      const normGroup = normalizeGroup(rawGroup);
      if (normGroup) {
        filter.stream = { $regex: new RegExp(`^${normGroup}$|^${rawGroup}$`, 'i') };
      }
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    // "My Exams" filtering for logged-in teacher
    const authorEmail = createdByEmail || teacherEmail || (req.headers['x-user-email'] ? String(req.headers['x-user-email']).toLowerCase().trim() : null);
    const authorId = createdBy || (req.headers['x-user-id'] ? String(req.headers['x-user-id']).trim() : null);

    if (myExams === 'true' && (authorEmail || authorId)) {
      const orClauses = [];
      if (authorEmail) {
        orClauses.push({ createdByEmail: new RegExp(`^${authorEmail}$`, 'i') });
      }
      if (authorId) {
        orClauses.push({ createdBy: authorId });
      }
      if (orClauses.length > 0) {
        filter.$or = orClauses;
      }
    }

    const exams = await Exam.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch exams'
    });
  }
};

// Get exam by ID
exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    res.status(200).json({
      success: true,
      data: exam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch exam'
    });
  }
};

// Update exam by ID (enforcing ownership and assignment authorization for teachers)
exports.updateExam = async (req, res) => {
  try {
    const userContext = await resolveUserAndAssignments(req);
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Ownership check for Teachers
    if (userContext.isTeacher) {
      const isOwner =
        (exam.createdByEmail && userContext.email && exam.createdByEmail.toLowerCase() === userContext.email.toLowerCase()) ||
        (exam.createdBy && userContext.userId && String(exam.createdBy) === String(userContext.userId));

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only edit examinations that you created.'
        });
      }

      // Check if updated class, group, or subject is authorized
      const checkClass = req.body.className || exam.className;
      const checkGroup = req.body.stream !== undefined ? req.body.stream : exam.stream;
      const checkSubject = req.body.subject || exam.subject;

      const authorized = isTeacherAuthorizedForExam(userContext, checkClass, checkGroup, checkSubject);
      if (!authorized) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are not authorized to set exam for ${checkClass} - ${checkSubject}. Teachers may ONLY assign exams to their assigned courses.`
        });
      }
    }

    const updates = { ...req.body };
    delete updates.createdBy;
    delete updates.createdByEmail;
    delete updates.createdByRole;

    if (updates.className) {
      const classNum = normalizeClassNumber(updates.className);
      if (classNum) {
        updates.className = `Class ${classNum}`;
      }
    }

    if (updates.section) {
      updates.section = updates.section.toUpperCase().replace('SECTION', '').trim();
    }

    if (updates.questionConfiguration) {
      const mcqCount = Number(updates.questionConfiguration.mcq?.count) || 0;
      const mcqMarks = Number(updates.questionConfiguration.mcq?.marksPerQuestion) || 1;
      const shortCount = Number(updates.questionConfiguration.short?.count) || 0;
      const shortMarks = Number(updates.questionConfiguration.short?.marksPerQuestion) || 2;
      const creativeCount = Number(updates.questionConfiguration.creative?.count) || 0;
      const creativeMarks = Number(updates.questionConfiguration.creative?.marksPerQuestion) || 5;

      updates.questionConfiguration = {
        mcq: { count: mcqCount, marksPerQuestion: mcqMarks, totalMarks: mcqCount * mcqMarks },
        short: { count: shortCount, marksPerQuestion: shortMarks, totalMarks: shortCount * shortMarks },
        creative: { count: creativeCount, marksPerQuestion: creativeMarks, totalMarks: creativeCount * creativeMarks }
      };
    }

    const updatedExam = await Exam.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Exam updated successfully',
      data: updatedExam
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update exam'
    });
  }
};

// Delete exam by ID (enforcing ownership authorization for teachers)
exports.deleteExam = async (req, res) => {
  try {
    const userContext = await resolveUserAndAssignments(req);
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Ownership check for Teachers
    if (userContext.isTeacher) {
      const isOwner =
        (exam.createdByEmail && userContext.email && exam.createdByEmail.toLowerCase() === userContext.email.toLowerCase()) ||
        (exam.createdBy && userContext.userId && String(exam.createdBy) === String(userContext.userId));

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only delete examinations that you created.'
        });
      }
    }

    await Exam.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete exam'
    });
  }
};
