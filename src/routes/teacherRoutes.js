const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');

const { getAllTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher, generateTeacherExcel, getTeacherByTeacherId } = require('../controllers/teacherController');

// Public routes
router.get('/', verifyToken, authorize('admin'), getAllTeachers);
router.get('/:id', verifyToken, authorize('admin', 'teacher'), getTeacherById);
router.get('/by-user/:teacherId', verifyToken, authorize('admin', 'teacher'), getTeacherByTeacherId);

// Protected routes (require authentication)
router.post('/', verifyToken, authorize('admin', 'teacher'), createTeacher);
router.put('/:id', verifyToken, authorize('admin', 'teacher'), updateTeacher);
router.delete('/:id', verifyToken, authorize('admin'), deleteTeacher);

router.post('/generate-ai-excel', verifyToken, authorize('admin', 'teacher'), generateTeacherExcel);

module.exports = router;
