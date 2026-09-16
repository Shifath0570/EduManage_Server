const express = require('express');
const router = express.Router();

const {
  getLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  deleteLeaveRequest,
  updateLeaveRequest
} = require('../controllers/teacherLeaveRequestController');

// Routes mapping
router.get('/', getLeaveRequests);
router.get('/:id', getLeaveRequestById);
router.post('/', createLeaveRequest);
router.put('/:id', updateLeaveRequest);
router.delete('/:id', deleteLeaveRequest);

module.exports = router;