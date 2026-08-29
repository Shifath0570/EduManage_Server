const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');

const { getStudents, getStudentById, createStudent, updateStudent, deleteStudent} = require('../controllers/studentController');

// Public routes
router.get('/', getStudents);
router.get('/:id', getStudentById);

// Protected routes (require authentication)
router.post('/', verifyToken, createStudent);
router.put('/:id', verifyToken, updateStudent);
router.delete('/:id', verifyToken, deleteStudent);

module.exports = router;