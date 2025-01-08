const express = require('express');
const router = express.Router();
const courseController = require('../../controllers/user/courseController');
const { authenticate } = require('../../middleware/auth');

// Public routes
router.get('/featured', courseController.getFeaturedCourses);
router.get('/search', courseController.searchCourses);
router.get('/level/:level', courseController.getCoursesByLevel);
router.get('/:id', courseController.getCourseById);
router.get('/', courseController.getAllCourses);

// Protected routes (require authentication)
router.use(authenticate);
router.post('/', courseController.createCourse);
router.post('/:courseId/modules/:moduleId/lessons', courseController.addLessonToModule);
router.post('/:courseId/enroll', courseController.enrollCourse);
router.put('/:courseId/progress', courseController.updateCourseProgress);
router.put('/:courseId/modules/:moduleId/lessons/:lessonId', courseController.updateLessonStatus);
router.get('/:courseId/progress', courseController.getUserCourseProgress);
router.get('/:courseId/modules/:moduleId/lessons/:lessonId', courseController.getLessonContent);

module.exports = router; 