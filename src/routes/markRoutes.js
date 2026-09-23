const express = require('express');
const router = express.Router();
const { verifyToken, optionalVerifyToken, authorize } = require('../middleware/auth');
const {
  saveMarks,
  getMarks,
  getStudentResults,
  getStudentPerformanceInsight,
  regenerateStudentPerformanceInsight
} = require('../controllers/markController');

// AI-powered Performance Insight routes
router.get('/performance-insight', verifyToken, authorize('admin', 'teacher', 'student'), getStudentPerformanceInsight);
router.get('/performance-insight/:identifier', verifyToken, authorize('admin', 'teacher', 'student'), getStudentPerformanceInsight);
router.post('/performance-insight/regenerate', verifyToken, authorize('admin', 'teacher'), regenerateStudentPerformanceInsight);

// Student Result routes
router.get('/my-results', verifyToken, authorize('admin', 'teacher', 'student'), getStudentResults);
router.get('/student', verifyToken, authorize('admin', 'teacher', 'student'), getStudentResults);
router.get('/student/:identifier', verifyToken, authorize('admin', 'teacher', 'student'), getStudentResults);

// Marks CRUD routes (authorization & exam ownership enforced inside saveMarks controller)
router.post('/', optionalVerifyToken, saveMarks);
router.get('/', optionalVerifyToken, getMarks);

module.exports = router;
