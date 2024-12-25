const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user/homeController');
const auth = require('../../middleware/auth.middleware');
const classController = require('../../controllers/user/classController');

router.get('/profile', auth, userController.getProfile);
router.get('/courses', auth, userController.getUserCourses);
router.put('/courses/:courseId/progress', auth, userController.updateCourseProgress);
router.get('/streak', auth, userController.getStreak);
router.get('/events', auth, userController.getUpcomingEvents);
router.get('/class/:classId/messages', classController.getChatMessages);

module.exports = router; 