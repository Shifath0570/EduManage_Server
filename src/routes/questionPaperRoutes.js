const express = require('express');
const router = express.Router();
const {
  generateQuestionPaper,
  getQuestionPaperByExamId,
  updateQuestionPaper,
  regenerateQuestionPaper
} = require('../controllers/questionPaperController');

// Generate (or get existing) question paper for an exam
router.post('/generate/:examId', generateQuestionPaper);

// Get question paper by exam ID
router.get('/exam/:examId', getQuestionPaperByExamId);

// Update question paper details
router.put('/:id', updateQuestionPaper);

// Force regenerate question paper
router.post('/regenerate/:examId', regenerateQuestionPaper);

module.exports = router;
