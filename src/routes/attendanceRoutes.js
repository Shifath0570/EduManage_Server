const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, authorize } = require('../middleware/auth');

// Save attendance session (Teacher & Admin)
router.post('/', verifyToken, authorize('admin', 'teacher'), attendanceController.saveAttendance);

// Generate & send AI attendance notice when a student is absent (Teacher)
router.post('/ai-warning', verifyToken, authorize('admin', 'teacher'), attendanceController.sendAIAttendanceWarning);

// Get attendance with filters (Admin & Teacher)
router.get('/', verifyToken, authorize('admin', 'teacher', 'student'), attendanceController.getAttendance);

// Get attendance stats (Admin overview)
router.get('/stats', verifyToken, authorize('admin', 'teacher', 'student'), attendanceController.getAttendanceStats);

// Get attendance notices for a specific student (Student Dashboard)
router.get('/notices/student/:identifier', verifyToken, authorize('admin', 'teacher', 'student'), attendanceController.getStudentAttendanceNotices);

// Get all attendance notices (Admin & Teacher)
router.get('/notices', verifyToken, authorize('admin', 'teacher', 'student'), attendanceController.getAttendanceNotices);

// Get individual student attendance report (Student)
router.get('/student/:identifier', verifyToken, authorize('admin', 'teacher', 'student'), attendanceController.getStudentAttendance);

module.exports = router;
