const express = require('express');
const router = express.Router();
const forumController = require('../../controllers/admin/forumController');
const { verifyToken } = require('../../middleware/auth');
const multer = require('../../middleware/multer');

// All routes are protected with verifyToken middleware
router.use(verifyToken);

// Get forum posts with pagination and filters
router.get('/', forumController.getForumPosts);

// Get forum statistics
router.get('/stats', forumController.getForumStats);

// Create new forum post (with file upload support)
router.post('/', multer.array('attachments', 5), forumController.createForumPost);

// Update post status
router.patch('/:postId/status', forumController.updatePostStatus);

// Delete forum post
router.delete('/:postId', forumController.deleteForumPost);

// Flag a post
router.post('/:postId/flag', forumController.flagPost);

module.exports = router; 