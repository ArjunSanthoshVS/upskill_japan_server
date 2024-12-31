const express = require('express');
const router = express.Router();
const profileController = require('../../controllers/user/profileController');
const auth = require('../../middleware/auth.middleware');

// All routes require authentication
router.use(auth);

// Profile routes
router.get('/', profileController.getProfileDetails);
router.put('/update', profileController.updateProfile);
router.put('/notifications', profileController.updateNotificationSettings);
router.put('/language-preferences', profileController.updateLanguagePreferences);
router.put('/privacy', profileController.updatePrivacySettings);
router.put('/skills/:skillType', profileController.updateSkillPercentage);
router.post('/generate-recommendations', profileController.generateStudyRecommendations);
module.exports = router; 