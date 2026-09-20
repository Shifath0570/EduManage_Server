const express = require('express');
const router = express.Router();

const { verifyToken, authorize } = require('../middleware/auth');
const { getStudents, getStudentById, createStudent, updateStudent, deleteStudent} = require('../controllers/studentController');

// Public routes
router.get('/', verifyToken, authorize('admin', 'teacher', 'student'), getStudents);
router.get('/:id', verifyToken, authorize('admin', 'teacher', 'student'), getStudentById);

// Protected routes (require authentication)
router.post('/', verifyToken, authorize('admin', 'teacher'), createStudent);
router.put('/:id', verifyToken, authorize('admin', 'teacher'), updateStudent);
router.delete('/:id', verifyToken, authorize('admin'), deleteStudent);

module.exports = router;

