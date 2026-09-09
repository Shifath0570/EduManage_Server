const express = require('express');
const router = express.Router();

const { getAllTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher, generateTeacherExcel, getTeacherByTeacherId } = require('../controllers/teacherController');

// Public routes
router.get('/', getAllTeachers);
router.get('/:id', getTeacherById);
router.get('/by-user/:teacherId', getTeacherByTeacherId);

// Protected routes (require authentication)
router.post('/', createTeacher);
router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);

router.post('/generate-ai-excel', generateTeacherExcel);

module.exports = router;
