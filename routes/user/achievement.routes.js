const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const {
    initializeAchievements,
    getUserAchievements,
    updateAchievementProgress,
    deleteAllAchievements,
    setUserAchievements
} = require('../../controllers/user/achievementController');

// Initialize achievements (admin only)
router.post('/initialize', initializeAchievements);

// Set achievements for all users
router.put('/set-achievements', setUserAchievements);

// Delete all achievements
router.delete('/delete-all', deleteAllAchievements);

// Get user's achievements with progress
router.get('/user', authenticate, getUserAchievements);

// Update achievement progress
router.patch('/:achievementId/progress', authenticate, updateAchievementProgress);

module.exports = router; 