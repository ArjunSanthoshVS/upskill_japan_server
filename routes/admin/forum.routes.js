const express = require('express');
const router = express.Router();
const forumController = require('../../controllers/admin/forumController');
const { verifyToken } = require('../../middleware/auth');
const multer = require('../../middleware/multer');

// All routes are protected with verifyToken middleware
router.use(verifyToken);

// Get forum posts with pagination and filters
router.get('/posts', forumController.getForumPosts);

// Get forum statistics
router.get('/stats', forumController.getForumStats);

// Create new forum post (with file upload support)
router.post('/posts', multer.array('attachments', 5), forumController.createForumPost);

// Update post status
router.patch('/posts/:postId/status', forumController.updatePostStatus);

// Delete forum post
router.delete('/posts/:postId', forumController.deleteForumPost);

// Flag a post
router.post('/posts/:postId/flag', forumController.flagPost);

module.exports = router; 