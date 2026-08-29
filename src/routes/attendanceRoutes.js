const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// Save attendance session (Teacher & Admin)
router.post('/', attendanceController.saveAttendance);

// Get attendance with filters (Admin & Teacher)
router.get('/', attendanceController.getAttendance);

// Get attendance stats (Admin overview)
router.get('/stats', attendanceController.getAttendanceStats);

// Get individual student attendance report (Student)
router.get('/student/:identifier', attendanceController.getStudentAttendance);

module.exports = router;
