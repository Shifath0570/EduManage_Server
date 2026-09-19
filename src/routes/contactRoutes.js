const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken, authorize } = require('../middleware/auth');

// Public route to submit contact inquiry
router.post('/', contactController.submitContactMessage);

// Admin-only routes
router.get('/', verifyToken, authorize('admin'), contactController.getAllContactMessages);
router.patch('/:id', verifyToken, authorize('admin'), contactController.updateMessageStatus);
router.delete('/:id', verifyToken, authorize('admin'), contactController.deleteContactMessage);

module.exports = router;
