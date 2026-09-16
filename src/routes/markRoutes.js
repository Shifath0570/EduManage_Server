const express = require('express');
const router = express.Router();
const {
  saveMarks,
  getMarks,
  getStudentResults,
  getStudentPerformanceInsight,
  regenerateStudentPerformanceInsight
} = require('../controllers/markController');

// AI-powered Performance Insight routes
router.get('/performance-insight', getStudentPerformanceInsight);
router.get('/performance-insight/:identifier', getStudentPerformanceInsight);
router.post('/performance-insight/regenerate', regenerateStudentPerformanceInsight);

// Student Result routes
router.get('/my-results', getStudentResults);
router.get('/student', getStudentResults);
router.get('/student/:identifier', getStudentResults);

// Marks CRUD routes
router.post('/', saveMarks);
router.get('/', getMarks);

module.exports = router;
