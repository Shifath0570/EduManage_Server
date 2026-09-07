const express = require('express');
const router = express.Router();

const { getStudents, getStudentById, createStudent, updateStudent, deleteStudent, generateStudentExcel} = require('../controllers/studentController');

// Public routes
router.get('/', getStudents);
router.get('/:id', getStudentById);

// Protected routes (require authentication)
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

router.post('/generate-excel', generateStudentExcel);

module.exports = router;

