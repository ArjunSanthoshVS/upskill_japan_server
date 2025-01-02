const express = require('express');
const router = express.Router();
const courseController = require('../../controllers/admin/courseController');
const { verifyToken } = require('../../middleware/auth');

// All routes require authentication and admin privileges
router.use(verifyToken);

// Course management routes
router.get('/', courseController.getAllCourses);
router.get('/:id', courseController.getCourseById);
router.post('/', courseController.createCourse);
router.put('/:id', courseController.updateCourse);
router.delete('/:id', courseController.deleteCourse);

// Course statistics and data export
router.get('/:id/stats', courseController.getCourseStats);
router.get('/:id/export', courseController.exportCourseData);
router.get('/export', courseController.exportAllCoursesData);

module.exports = router; 