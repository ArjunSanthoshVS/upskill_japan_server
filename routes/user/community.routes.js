const express = require('express');
const router = express.Router();
const {
    getAllForumPosts,
    getForumPostById,
    toggleLikeForumPost,
    addComment,
    getForumPostsByCategory,
    toggleCommentLike,
    getAllStudyGroups,
    getStudyGroupDetails,
    joinStudyGroup,
    leaveStudyGroup,
    getMyStudyGroups,
    getStudyGroupResources,
    getStudyGroupMessages,
    sendStudyGroupMessage,
    createForumPost
} = require('../../controllers/user/communityController');
const { authenticate } = require('../../middleware/auth');
const multer = require('../../middleware/multer');

// Apply authentication middleware to all routes
router.use(authenticate);

// Forum Routes
router.get('/forums', getAllForumPosts);
router.post('/forums', multer.array('attachments', 5), createForumPost);
router.get('/forums/category/:category', getForumPostsByCategory);
router.get('/forums/:id', getForumPostById);
router.post('/forums/:id/like', toggleLikeForumPost);
router.post('/forums/:id/comment', addComment);
router.post('/forums/:postId/comments/:commentId/like', toggleCommentLike);

// Study Group Routes
router.get('/studygroups', getAllStudyGroups);
router.get('/studygroups/:id', getStudyGroupDetails);
router.post('/studygroups/:id/join', joinStudyGroup);
router.post('/studygroups/:id/leave', leaveStudyGroup);
router.get('/mystudygroups', getMyStudyGroups);
router.get('/studygroups/:id/resources', getStudyGroupResources);

// Study group messages routes
router.get('/studygroups/:id/messages', getStudyGroupMessages);
router.post('/studygroups/:id/messages', sendStudyGroupMessage);

module.exports = router; 