const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');

const {
  getLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  deleteLeaveRequest,
  updateLeaveRequest
} = require('../controllers/teacherLeaveRequestController');

// Routes mapping
router.get('/', verifyToken, authorize('admin', 'teacher'), getLeaveRequests);
router.get('/:id', verifyToken, authorize('admin', 'teacher'), getLeaveRequestById);
router.post('/', verifyToken, authorize('admin', 'teacher'), createLeaveRequest);
router.put('/:id', verifyToken, authorize('admin', 'teacher'), updateLeaveRequest);
router.delete('/:id', verifyToken, authorize('admin', 'teacher'), deleteLeaveRequest);

module.exports = router;