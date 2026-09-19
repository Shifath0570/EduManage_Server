const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');

const { getAssignments, getAssignmentById, createAssignment, updateAssignment, deleteAssignment} = require('../controllers/assignmentController');

// Public routes
router.get('/', verifyToken, authorize('admin'), getAssignments);
router.get('/:id', verifyToken, authorize('admin', 'teacher'), getAssignmentById);

// Protected routes (require authentication)
router.post('/', verifyToken, authorize('admin'), createAssignment);
router.put('/:id', verifyToken, authorize('admin'), updateAssignment);
router.delete('/:id', verifyToken, authorize('admin'), deleteAssignment);

module.exports = router;


