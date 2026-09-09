const Exam = require('../models/Exam');
const {
  normalizeClassNumber,
  normalizeGroup,
  getValidSubjects,
  isValidSubject
} = require('../config/classSubjects');

// Create a new exam
exports.createExam = async (req, res) => {
  try {
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
      // For Class 1 to 8, groups are not applicable
      if (rawGroup && normalizeGroup(rawGroup)) {
        return res.status(400).json({
          success: false,
          message: `Groups/Streams are only applicable for Class 9 and Class 10.`
        });
      }
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
      description: description || ''
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

// Get all exams with optional filtering
exports.getExams = async (req, res) => {
  try {
    const { className, class: classParam, section, status, stream, group } = req.query;

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

// Delete exam by ID
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
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
