const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');

const {
  createTeacher,
  createBulkTeachers,
  getAllTeachers,
  getTeacherById,
  getTeacherByTeacherId,
  getTeachersByClassAndSection,
  getTeachersBySubject,
  getTeacherStats,
  updateTeacher,
  updateTeacherStatus,
  addSubjectToTeacher,
  removeSubjectFromTeacher,
  deleteTeacher,
  deleteAllTeachers,
  getOverloadedTeachers,
  getTeachersByClasses,
  getAllSubjects
} = require('../controllers/teacherController');

// ==================== PUBLIC ROUTES (No authentication required) ====================

// Get all teachers with pagination, filtering, sorting
router.get('/', getAllTeachers);

// Get teacher statistics
router.get('/stats', getTeacherStats);

// Get all unique subjects taught
router.get('/subjects/all', getAllSubjects);

// Get overloaded teachers (> 50 students)
router.get('/overloaded', getOverloadedTeachers);

// Get teachers by subject
router.get('/subject/:subject', getTeachersBySubject);

// Get teachers by class and section
router.get('/class/:className/section/:section', getTeachersByClassAndSection);

// Get teacher by teacherId (custom ID)
router.get('/id/:teacherId', getTeacherByTeacherId);

// Get teacher by MongoDB ID (must be after specific routes to avoid conflicts)
router.get('/:id', getTeacherById);

// ==================== PROTECTED ROUTES (Authentication required) ====================

// Create a new teacher
router.post('/', verifyToken, createTeacher);

// Create multiple teachers at once
router.post('/bulk', verifyToken, createBulkTeachers);

// Get teachers by multiple classes (POST request with body)
router.post('/by-classes', verifyToken, getTeachersByClasses);

// Update teacher by ID
router.put('/:id', verifyToken, updateTeacher);

// Update teacher status (Activate/Deactivate/Suspend)
router.patch('/:id/status', verifyToken, updateTeacherStatus);

// Add subject to teacher
router.patch('/:id/subjects', verifyToken, addSubjectToTeacher);

// Remove subject from teacher
router.delete('/:id/subjects/:subject', verifyToken, removeSubjectFromTeacher);

// Delete teacher by ID
router.delete('/:id', verifyToken, deleteTeacher);

// Delete all teachers (CAREFUL! Admin only)
router.delete('/all', verifyToken, deleteAllTeachers);

module.exports = router;