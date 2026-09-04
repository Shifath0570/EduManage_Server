const express = require('express');
const router = express.Router();

const { getAllTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher } = require('../controllers/teacherController');

// Public routes
router.get('/', getAllTeachers);
router.get('/:id', getTeacherById);

// Protected routes (require authentication)
router.post('/', createTeacher);
router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);

module.exports = router;
