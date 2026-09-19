const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { verifyToken, authorize } = require('../middleware/auth');

// Public endpoints
router.get('/', blogController.getAllBlogs);
router.get('/:id', blogController.getBlogById);

// Admin-only endpoints
router.post('/ai-generate', verifyToken, authorize('admin'), blogController.generateAIBlog);
router.post('/', verifyToken, authorize('admin'), blogController.createBlog);
router.put('/:id', verifyToken, authorize('admin'), blogController.updateBlog);
router.delete('/:id', verifyToken, authorize('admin'), blogController.deleteBlog);

module.exports = router;
