const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

// Public endpoints
router.get('/', blogController.getAllBlogs);
router.get('/:id', blogController.getBlogById);

// Admin-only endpoints
router.post('/ai-generate', blogController.generateAIBlog);
router.post('/', blogController.createBlog);
router.put('/:id', blogController.updateBlog);
router.delete('/:id', blogController.deleteBlog);

module.exports = router;
