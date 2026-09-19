const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const {
  generateQuestionPaper,
  getQuestionPaperByExamId,
  updateQuestionPaper,
  regenerateQuestionPaper
} = require('../controllers/questionPaperController');

// Generate (or get existing) question paper for an exam
router.post('/generate/:examId', verifyToken, authorize('admin', 'teacher'), generateQuestionPaper);

// Get question paper by exam ID
router.get('/exam/:examId', verifyToken, authorize('admin', 'teacher'), getQuestionPaperByExamId);

// Update question paper details
router.put('/:id', verifyToken, authorize('admin', 'teacher'), updateQuestionPaper);

// Force regenerate question paper
router.post('/regenerate/:examId', verifyToken, authorize('admin', 'teacher'), regenerateQuestionPaper);

module.exports = router;
