const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../../middleware/user.middleware');
const { checkDailyStreak } = require('../../controllers/user/streakController');

// All routes require authentication
router.use(authenticateUser);

// Check daily streak when user accesses app
router.post('/check', checkDailyStreak);

module.exports = router; 