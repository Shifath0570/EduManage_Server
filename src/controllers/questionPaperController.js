const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const QuestionPaper = require('../models/QuestionPaper');
const { generateExamQuestionPaper, validateAndNormalizeConfig } = require('../services/aiQuestionService');

/**
 * Generate (or fetch existing) Question Paper for an Exam
 * POST /api/question-papers/generate/:examId
 */
exports.generateQuestionPaper = async (req, res) => {
  try {
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
