const express = require('express');
const router = express.Router();

const { getAssignments, getAssignmentById, createAssignment, updateAssignment, deleteAssignment} = require('../controllers/assignmentController');

// Public routes
router.get('/', getAssignments);
router.get('/:id', getAssignmentById);

// Protected routes (require authentication)
router.post('/', createAssignment);
router.put('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);

module.exports = router;


