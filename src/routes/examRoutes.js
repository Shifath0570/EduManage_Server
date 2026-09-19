const express = require('express');
const router = express.Router();
const { getExams, getExamById, createExam, updateExam, deleteExam } = require('../controllers/examController');
const { verifyToken, authorize } = require('../middleware/auth');

router.get('/', verifyToken, authorize('admin', 'teacher', 'student'), getExams);
router.get('/:id', verifyToken, authorize('admin', 'teacher', 'student'), getExamById);
router.post('/', verifyToken, authorize('admin', 'teacher'), createExam);
router.put('/:id', verifyToken, authorize('admin', 'teacher'), updateExam);
router.delete('/:id', verifyToken, authorize('admin', 'teacher'), deleteExam);

module.exports = router;
