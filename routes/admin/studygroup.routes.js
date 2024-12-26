const express = require('express');
const router = express.Router();
const studyGroupController = require('../../controllers/admin/studygroupController');
const { verifyToken } = require('../../middleware/auth');

// Apply authentication and admin check middleware to all routes
router.use(verifyToken);

// Create a new study group
router.post('/', studyGroupController.createStudyGroup);

// Get all study groups (with optional filters)
router.get('/', studyGroupController.getAllStudyGroups);

// Get a specific study group
router.get('/:id', studyGroupController.getStudyGroupById);

// Update a study group
router.put('/:id', studyGroupController.updateStudyGroup);

// Delete a study group
router.delete('/:id', studyGroupController.deleteStudyGroup);

// Update next meeting details
// router.put('/:id/meeting', studyGroupController.updateNextMeeting);

// Add/Update resources
// router.put('/:id/resources', studyGroupController.updateResources);

// Remove a member from group
// router.delete('/:groupId/members/:memberId', studyGroupController.removeMember);

module.exports = router; 