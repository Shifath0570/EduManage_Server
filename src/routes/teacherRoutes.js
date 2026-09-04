const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');

const { getAllTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher } = require('../controllers/teacherController');

// Public routes
router.get('/', getAllTeachers);
router.get('/:id', getTeacherById);

// Protected routes (require authentication)
router.post('/', verifyToken, createTeacher);
router.put('/:id', verifyToken, updateTeacher);
router.delete('/:id', verifyToken, deleteTeacher);

module.exports = router;
