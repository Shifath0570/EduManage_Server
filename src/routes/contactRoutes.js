const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Public route to submit contact inquiry
router.post('/', contactController.submitContactMessage);

// Admin-only routes
router.get('/', contactController.getAllContactMessages);
router.patch('/:id', contactController.updateMessageStatus);
router.delete('/:id', contactController.deleteContactMessage);

module.exports = router;
