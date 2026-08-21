const express = require('express');
const router = express.Router();

const { getNotices, createNotice, deleteNotice } = require('../controllers/noticeController');
const { protect, authorize } = require('../middleware/auth');
// Public route to get all notices
router.get('/', getNotices);

// Protected route to create a notice (only for admin and staff)
router.post('/', protect, authorize('admin'), createNotice);

// Protected route to delete a notice (only for admin and staff)
router.delete('/:id', protect, authorize('admin'), deleteNotice);

module.exports = router;