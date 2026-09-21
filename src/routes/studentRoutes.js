
const express = require('express');
const router = express.Router();

const { verifyToken, authorize } = require('../middleware/auth');
const { getStudents, getStudentById, getStudentByStudentId, createStudent, updateStudent, deleteStudent } = require('../controllers/studentController');

// Public routes
router.get('/', verifyToken, authorize('admin', 'teacher'), getStudents);
router.get('/by-user/:stuId', verifyToken, authorize('admin', 'teacher', 'student'), getStudentByStudentId);
router.get('/:id', verifyToken, authorize('admin', 'teacher', 'student'), getStudentById);

// Protected routes (require authentication)
router.post('/', verifyToken, authorize('admin', 'student'), createStudent);
router.put('/:id', verifyToken, authorize('admin', 'student'), updateStudent);
router.delete('/:id', verifyToken, authorize('admin'), deleteStudent);


module.exports = router;

