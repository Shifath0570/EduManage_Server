const express = require('express');
const router = express.Router();
const { getExams, getExamById, createExam, updateExam, deleteExam } = require('../controllers/examController');
const { verifyToken, optionalVerifyToken, authorize } = require('../middleware/auth');

// Public/flexible exam queries (supports optional JWT token if provided)
router.get('/', optionalVerifyToken, getExams);
router.get('/:id', optionalVerifyToken, getExamById);

// Protected mutation routes
router.post('/', verifyToken, authorize('admin', 'teacher'), createExam);
router.put('/:id', verifyToken, authorize('admin', 'teacher'), updateExam);
router.delete('/:id', verifyToken, authorize('admin', 'teacher'), deleteExam);

module.exports = router;
