const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const liveclassController = require('../../controllers/admin/liveclassController');

// Get all live classes with status filter
router.get('/classes', verifyToken, liveclassController.getAllClasses);

// Get specific class details
router.get('/classes/:id', verifyToken, liveclassController.getClassDetails);

// Create a new class
router.post('/classes', verifyToken, liveclassController.createClass);

// Update class details
router.put('/classes/:id', verifyToken, liveclassController.updateClass);

// Cancel/Delete a class
router.delete('/classes/:id', verifyToken, liveclassController.cancelClass);

// Get class analytics
router.get('/classes/:id/analytics', verifyToken, liveclassController.getClassAnalytics);

module.exports = router; 