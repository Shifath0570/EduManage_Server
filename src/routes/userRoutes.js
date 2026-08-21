const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  changePassword
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/', getUsers);

// Protected routes
router.use(protect); // All routes below this line are protected

// User management
router.put('/change-password', changePassword);
router.get('/:id', getUser);
router.put('/:id', updateUser);

// Admin only routes
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;