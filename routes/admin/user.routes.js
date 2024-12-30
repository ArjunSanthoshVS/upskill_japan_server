const express = require('express');
const router = express.Router();
const userController = require('../../controllers/admin/userController');
const { verifyToken } = require('../../middleware/auth');

// Apply verifyToken middleware to all routes
router.use(verifyToken);

// Get all users with filters
router.get('/', userController.getUsers);

// Get user statistics
router.get('/statistics', userController.getUserStats);

// Get single user
router.get('/:userId', userController.getUserById);

// Create new user
router.post('/', userController.createUser);

// Update user
router.put('/:userId', userController.updateUser);

// Delete user
router.delete('/:userId', userController.deleteUser);

// Toggle user status
router.patch('/:userId/toggle-status', userController.toggleUserStatus);

// Reset user password
router.post('/:userId/reset-password', userController.resetUserPassword);

module.exports = router; 