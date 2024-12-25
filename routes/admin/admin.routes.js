const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/adminController');
const forumRoutes = require('./forum.routes');
const { verifyToken } = require('../../middleware/auth');

// Public admin routes
router.post('/login', adminController.login);

// Protected admin routes
router.post('/verify', verifyToken, adminController.verifyToken);
router.get('/profile', verifyToken, adminController.getProfile);

// Forum routes
router.use('/', forumRoutes);

module.exports = router; 