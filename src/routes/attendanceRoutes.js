const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// Save attendance session (Teacher & Admin)
router.post('/', attendanceController.saveAttendance);

// Generate & send AI attendance notice when a student is absent (Teacher)
router.post('/ai-warning', attendanceController.sendAIAttendanceWarning);

// Get attendance with filters (Admin & Teacher)
router.get('/', attendanceController.getAttendance);

// Get attendance stats (Admin overview)
router.get('/stats', attendanceController.getAttendanceStats);

// Get attendance notices for a specific student (Student Dashboard)
router.get('/notices/student/:identifier', attendanceController.getStudentAttendanceNotices);

// Get all attendance notices (Admin & Teacher)
router.get('/notices', attendanceController.getAttendanceNotices);

// Get individual student attendance report (Student)
router.get('/student/:identifier', attendanceController.getStudentAttendance);

module.exports = router;
