const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const {
    initializeAchievements,
    getAllAchievements,
    getAchievementsByLevel,
    getUserAchievements,
    awardAchievement,
    setUserAchievements,
    getAchievementProgress
} = require('../../controllers/user/achievementController');

// Initialize N5 achievements (admin only)
router.post('/initialize', authenticate, initializeAchievements);

// Get all achievements
router.get('/', authenticate, getAllAchievements);

// Get achievements by JLPT level
router.get('/level/:level', authenticate, getAchievementsByLevel);

// Get user's achievements
router.get('/user', authenticate, getUserAchievements);

// Get achievement progress
router.get('/progress/:achievementId', authenticate, getAchievementProgress);

// Award achievement to user
router.post('/award', authenticate, awardAchievement);

// Set achievements for user based on study level (admin only)
router.post('/set-user', authenticate, setUserAchievements);

module.exports = router; 