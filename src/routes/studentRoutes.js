const express = require('express');
const router = express.Router();

const { getStudents, getStudentById, getStudentByStudentId, createStudent, updateStudent, deleteStudent, generateStudentExcel} = require('../controllers/studentController');

// Public routes
router.get('/', getStudents);
router.get('/:id', getStudentById);
router.get('/by-user/:stuId', getStudentByStudentId);

// Protected routes (require authentication)
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

router.post('/generate-excel', generateStudentExcel);

module.exports = router;

