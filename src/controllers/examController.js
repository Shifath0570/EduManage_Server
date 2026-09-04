const Exam = require('../models/Exam');

// Create a new exam
exports.createExam = async (req, res) => {
  try {
    const { examName, examType, className, class: classParam, section, subject, totalMarks, passMarks, examDate, status, description } = req.body;

    if (!examName || (!className && !classParam) || !examDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide examName, className, and examDate.'
      });
    }

    const rawClass = className || classParam;
    const cleanClass = rawClass.replace('class_', '').replace('Class', '').replace('class-', '').trim();
    const formattedClass = `Class ${cleanClass}`;
    const cleanSection = section ? section.toUpperCase().replace('SECTION', '').trim() : 'A';

    const exam = await Exam.create({
      examName: examName.trim(),
      examType: examType || 'Mid Term',
      className: formattedClass,
      section: cleanSection,
      subject: subject || 'All Subjects',
      totalMarks: totalMarks ? Number(totalMarks) : 100,
      passMarks: passMarks ? Number(passMarks) : 40,
      examDate: String(examDate).trim(),
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
    const { className, class: classParam, section, status } = req.query;

    const filter = {};
    const targetClass = className || classParam;

    if (targetClass && targetClass !== 'All') {
      const cleanClass = targetClass.replace('class_', '').replace('Class', '').replace('class-', '').trim();
      filter.className = { $regex: new RegExp(`^${cleanClass}$|^Class ${cleanClass}$|^class_${cleanClass}$`, 'i') };
    }

    if (section && section !== 'All') {
      const cleanSection = section.toUpperCase().replace('SECTION', '').trim();
      filter.section = cleanSection;
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
