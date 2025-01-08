const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const classController = require('../../controllers/user/classController');

// Public routes
router.get('/upcoming', classController.getUpcomingClasses);
router.get('/ongoing', classController.getOngoingClasses);
router.get('/previous', classController.getPreviousClasses);
router.get('/:id', classController.getClassById);
router.get('/:classId/messages', classController.getChatMessages);

// Protected routes - require authentication
router.use(authMiddleware);
router.post('/', classController.createClass);
router.post('/:id/join', classController.joinClass);
router.patch('/:id/status', classController.updateClassStatus);
// router.post('/:classId/messages', classController.sendChatMessage);

module.exports = router; 