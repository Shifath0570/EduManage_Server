const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');

const {
  getLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  deleteLeaveRequest,
  updateLeaveRequest
} = require('../controllers/studentLeaveRequestController');

// Routes mapping
router.get('/', verifyToken, authorize('admin','student'), getLeaveRequests);
router.get('/:id', verifyToken, authorize('admin','student'), getLeaveRequestById);
router.post('/', verifyToken, authorize('admin','student'), createLeaveRequest);
router.put('/:id', verifyToken, authorize('admin','student'), updateLeaveRequest);
router.delete('/:id', verifyToken, authorize('admin','student'), deleteLeaveRequest);

module.exports = router;