const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../../middleware/user.middleware');
const {
    getDailyGoals,
    generateDailyGoals,
    updateGoalStatus
} = require('../../controllers/user/dailyGoalsController');

// All routes require authentication
router.use(authenticateUser);

// Get current daily goals (automatically generates if none exist for today)
router.get('/daily', getDailyGoals);

// Force generate new goals for today
router.post('/generate', generateDailyGoals);

// Update goal completion status
router.patch('/:goalId', updateGoalStatus);

// Also allow PUT for clients that don't support PATCH
router.put('/:goalId', updateGoalStatus);

module.exports = router; 