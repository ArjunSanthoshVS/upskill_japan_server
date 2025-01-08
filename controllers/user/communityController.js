const ForumPost = require('../../models/communityforum.model');
const StudyGroup = require('../../models/studygroup.model');
const StudyGroupMessage = require('../../models/studygroupmessage.model');
const User = require('../../models/user.model');
const translationService = require('../../utils/translationService');

exports.getAllForumPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const language = req.query.language || 'en';
        const status = 'active';

        const query = {
            status,
            ...(search && {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            }),
            ...(category && { category })
        };

        const totalPosts = await ForumPost.countDocuments(query);
        const posts = await ForumPost.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('author', 'fullName email')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'fullName email'
                }
            })
            .populate('likes', '_id');

        // Convert posts to plain objects and add hasLiked field
        const currentUserId = req.user.userId.toString();
        const postsWithLikeStatus = await Promise.all(posts.map(async post => {
            const postObj = post.toObject();
            postObj.likes = post.likes ? post.likes.filter(like => like).map(like => like._id?.toString()) : [];
            postObj.hasLiked = postObj.likes.includes(currentUserId);
            postObj.comments = post.comments || [];

            // Only translate if language is not English
            if (language !== 'en') {
                postObj.title = await translationService.translate(postObj.title, language);
                postObj.description = await translationService.translate(postObj.description, language);
                postObj.category = await translationService.translate(postObj.category, language);

                // Translate comments if they exist
                if (postObj.comments.length > 0) {
                    postObj.comments = await Promise.all(postObj.comments.map(async comment => ({
                        ...comment,
                        content: await translationService.translate(comment.content, language)
                    })));
                }
            }

            return postObj;
        }));

        res.json({
            posts: postsWithLikeStatus,
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createForumPost = async (req, res) => {
    const { title, description, category, links = [] } = req.body;

    // Fetch admin details
    const user = await User.findById(req.user.userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Process attachments if any
    const attachments = req.files ? req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        type: file.mimetype,
        filename: file.originalname
    })) : [];

    const post = await ForumPost.create({
        title,
        description,
        category,
        author: {
            _id: user._id,
            name: user.fullName,
            email: user.email
        },
        authorModel: 'User',
        attachments,
        links
    });

    res.status(201).json(post);
};

exports.getForumPostById = async (req, res) => {
    try {
        const { language = 'en' } = req.query;
        
        const post = await ForumPost.findById(req.params.id)
            .populate('author', 'name email')
            .populate('comments.user', 'fullName email')
            .populate('comments.replies.user', 'fullName email')
            .populate('comments.likes')
            .populate('likes', 'fullName email');

        if (!post) {
            return res.status(404).json({ message: 'Forum post not found' });
        }

        // Only increment view if the query param is true or not provided
        const shouldIncrementView = req.query.incrementView !== 'false';
        if (shouldIncrementView) {
            post.views += 1;
            await post.save();
        }

        // Convert the post to a plain object to modify it
        const postObject = post.toObject();

        // Only translate if language is not English
        if (language !== 'en') {
            try {
                const [translatedTitle, translatedDescription] = await Promise.all([
                    translationService.translate(postObject.title, language),
                    translationService.translate(postObject.description, language)
                ]);
                
                postObject.title = translatedTitle;
                postObject.description = translatedDescription;
            } catch (translationError) {
                console.error('Translation error:', translationError);
                // Continue with original text if translation fails
            }
        }

        // Add a field to indicate if the current user has liked the post
        const currentUserId = req.user.userId.toString();
        postObject.likes = post.likes ? post.likes.filter(like => like).map(like => like._id?.toString()) : [];
        postObject.hasLiked = postObject.likes.includes(currentUserId);

        // Add hasLiked field to each comment and format replies
        postObject.comments = postObject.comments.map(comment => {
            const commentLikes = comment.likes ? comment.likes.filter(like => like).map(like => like._id?.toString()) : [];
            
            // Format replies to include proper user data
            const formattedReplies = comment.replies.map(reply => ({
                ...reply,
                user: {
                    _id: reply.user._id,
                    fullName: reply.user.fullName,
                    email: reply.user.email
                }
            }));

            return {
                ...comment,
                likes: commentLikes,
                hasLiked: commentLikes.includes(currentUserId),
                replies: formattedReplies
            };
        });
        
        res.json(postObject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.toggleLikeForumPost = async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Forum post not found' });
        }

        const userId = req.user.userId;
        const userIdStr = userId.toString();

        // Initialize likes array if it doesn't exist
        if (!post.likes) {
            post.likes = [];
        }

        // Find the like index, ensuring we handle null/undefined values
        const likeIndex = post.likes.findIndex(id => id && id.toString() === userIdStr);

        if (likeIndex === -1) {
            post.likes.push(userId);
        } else {
            post.likes.splice(likeIndex, 1);
        }

        await post.save();

        // Return the updated likes array as strings, filtering out any null/undefined values
        const updatedLikes = post.likes.filter(id => id).map(id => id.toString());
        res.json({
            likes: updatedLikes,
            hasLiked: updatedLikes.includes(userIdStr)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { content, contentType } = req.body;
        let audioUrl = null;

        if (!content || !contentType || !['text', 'voice'].includes(contentType)) {
            return res.status(400).json({ message: 'Invalid comment data' });
        }

        // Handle voice comment upload
        if (contentType === 'voice' && req.file) {
            // Save only the relative path
            audioUrl = `${req.file.filename}`;
        } else if (contentType === 'voice' && !req.file) {
            return res.status(400).json({ message: 'Voice comment requires audio file' });
        }

        // First get the user data
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const post = await ForumPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Forum post not found' });
        }

        const comment = {
            user: req.user.userId,
            content: content.trim(),
            contentType,
            audioUrl,
            createdAt: new Date(),
            reactions: [],
            replies: []
        };

        post.comments.push(comment);
        await post.save();

        // Get the newly added comment
        const newComment = post.comments[post.comments.length - 1];

        // Format the comment with user data
        const commentToReturn = {
            _id: newComment._id,
            content: newComment.content,
            contentType: newComment.contentType,
            audioUrl: newComment.audioUrl,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email
            },
            reactions: [],
            replies: [],
            createdAt: newComment.createdAt
        };

        res.json(commentToReturn);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addReply = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { content, contentType } = req.body;
        let audioUrl = null;

        if (!content || !contentType || !['text', 'voice'].includes(contentType)) {
            return res.status(400).json({ message: 'Invalid reply data' });
        }

        // Handle voice reply upload
        if (contentType === 'voice' && req.file) {
            // Save only the relative path
            audioUrl = `${req.file.filename}`;
        } else if (contentType === 'voice' && !req.file) {
            return res.status(400).json({ message: 'Voice reply requires audio file' });
        }

        // First get the user data
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        console.log(id);
        const post = await ForumPost.findById(id);
        if (!post) {
            return res.status(404).json({ message: 'Forum post not found' });
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const reply = {
            user: req.user.userId,
            content: content.trim(),
            contentType,
            audioUrl,
            createdAt: new Date(),
            likes: []
        };

        comment.replies.push(reply);
        await post.save();

        // Get the newly added reply
        const newReply = comment.replies[comment.replies.length - 1];

        // Format the reply with user data
        const replyToReturn = {
            _id: newReply._id,
            content: newReply.content,
            contentType: newReply.contentType,
            audioUrl: newReply.audioUrl,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email
            },
            likes: [],
            createdAt: newReply.createdAt
        };

        res.json(replyToReturn);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.toggleReaction = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { reactionType } = req.body;

        if (!reactionType) {
            return res.status(400).json({ message: 'Reaction type is required' });
        }

        const post = await ForumPost.findById(id);
        if (!post) {
            return res.status(404).json({ message: 'Forum post not found' });
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const userId = req.user.userId;
        const existingReaction = comment.reactions.find(r => r.type === reactionType);

        if (existingReaction) {
            const userIndex = existingReaction.users.indexOf(userId);
            if (userIndex === -1) {
                existingReaction.users.push(userId);
            } else {
                existingReaction.users.splice(userIndex, 1);
                // Remove the reaction type if no users are left
                if (existingReaction.users.length === 0) {
                    comment.reactions = comment.reactions.filter(r => r.type !== reactionType);
                }
            }
        } else {
            comment.reactions.push({
                type: reactionType,
                users: [userId]
            });
        }

        await post.save();

        res.json({
            reactions: comment.reactions,
            hasReacted: comment.reactions.some(r => r.type === reactionType && r.users.includes(userId))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getForumPostsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = 'active';

        const query = { category, status };
        const totalPosts = await ForumPost.countDocuments(query);
        const posts = await ForumPost.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('-comments');

        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.toggleCommentLike = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const userId = req.user.userId;

        const post = await ForumPost.findById(id);
        if (!post) {
            return res.status(404).json({ message: 'Forum post not found' });
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Initialize likes array if it doesn't exist
        if (!comment.likes) {
            comment.likes = [];
        }

        const userIdStr = userId.toString();
        const likeIndex = comment.likes.findIndex(id => id && id.toString() === userIdStr);

        if (likeIndex === -1) {
            comment.likes.push(userId);
        } else {
            comment.likes.splice(likeIndex, 1);
        }

        await post.save();

        // Return the updated likes array and status
        const updatedLikes = comment.likes.filter(id => id).map(id => id.toString());
        res.json({
            commentId,
            likes: updatedLikes,
            hasLiked: updatedLikes.includes(userIdStr)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all study groups
exports.getAllStudyGroups = async (req, res) => {
    try {
        const { search, category, language = 'en' } = req.query;
        const query = { isActive: true };

        if (category) query.category = category;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const studyGroups = await StudyGroup.find(query)
            .populate('admin', 'name')
            .select('-resources')
            .sort({ createdAt: -1 });

        const formattedGroups = await Promise.all(studyGroups.map(async group => {
            const groupObj = group.toObject();
            groupObj.memberCount = group.members.length;

            // Only translate if language is not English
            if (language !== 'en') {
                groupObj.name = await translationService.translate(groupObj.name, language);
                groupObj.description = await translationService.translate(groupObj.description, language);
                groupObj.category = await translationService.translate(groupObj.category, language);
                
                if (groupObj.nextMeeting) {
                    groupObj.nextMeeting.topic = await translationService.translate(groupObj.nextMeeting.topic, language);
                }
            }

            return groupObj;
        }));

        res.status(200).json({ success: true, data: formattedGroups });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get study group details
exports.getStudyGroupDetails = async (req, res) => {
    try {
        const studyGroup = await StudyGroup.findById(req.params.id)
            .populate('admin', 'name')
            .populate('members', 'name');

        if (!studyGroup) {
            return res.status(404).json({ success: false, message: 'Study group not found' });
        }

        const isUserMember = studyGroup.members.some(
            member => member._id.toString() === req.user.userId.toString()
        );

        const formattedGroup = {
            ...studyGroup.toObject(),
            memberCount: studyGroup.members.length,
            isUserMember
        };

        res.status(200).json({ success: true, data: formattedGroup });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Join a study group
exports.joinStudyGroup = async (req, res) => {
    try {
        const studyGroup = await StudyGroup.findById(req.params.id);

        if (!studyGroup) {
            return res.status(404).json({ success: false, message: 'Study group not found' });
        }

        if (!studyGroup.isActive) {
            return res.status(400).json({ success: false, message: 'This study group is no longer active' });
        }

        const isMember = studyGroup.members.includes(req.user.userId);
        if (isMember) {
            return res.status(400).json({ success: false, message: 'You are already a member of this group' });
        }

        studyGroup.members.push(req.user.userId);
        await studyGroup.save();

        res.status(200).json({ success: true, message: 'Successfully joined the study group' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Leave a study group
exports.leaveStudyGroup = async (req, res) => {
    try {
        const studyGroup = await StudyGroup.findById(req.params.id);

        if (!studyGroup) {
            return res.status(404).json({ success: false, message: 'Study group not found' });
        }

        const memberIndex = studyGroup.members.indexOf(req.user.userId);
        if (memberIndex === -1) {
            return res.status(400).json({ success: false, message: 'You are not a member of this group' });
        }

        studyGroup.members.splice(memberIndex, 1);
        await studyGroup.save();

        res.status(200).json({ success: true, message: 'Successfully left the study group' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get user's study groups
exports.getMyStudyGroups = async (req, res) => {
    try {
        const language = req.query.language || 'en';
        
        const studyGroups = await StudyGroup.find({
            members: req.user.userId,
            isActive: true
        })
            .populate('admin', 'name')
            .select('-resources')
            .sort({ createdAt: -1 });

        const formattedGroups = await Promise.all(studyGroups.map(async group => {
            const groupObj = group.toObject();
            groupObj.memberCount = group.members.length;

            // Only translate if language is not English
            if (language !== 'en') {
                groupObj.name = await translationService.translate(groupObj.name, language);
                groupObj.description = await translationService.translate(groupObj.description, language);
                groupObj.category = await translationService.translate(groupObj.category, language);
                
                if (groupObj.nextMeeting) {
                    groupObj.nextMeeting.topic = await translationService.translate(groupObj.nextMeeting.topic, language);
                }
            }

            return groupObj;
        }));

        res.status(200).json({ success: true, data: formattedGroups });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get study group resources
exports.getStudyGroupResources = async (req, res) => {
    try {
        const studyGroup = await StudyGroup.findById(req.params.id)
            .select('resources members');

        if (!studyGroup) {
            return res.status(404).json({ success: false, message: 'Study group not found' });
        }

        const isMember = studyGroup.members.includes(req.user.userId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: 'Access denied. You must be a member to view resources' });
        }

        res.status(200).json({ success: true, data: studyGroup.resources });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get study group messages
exports.getStudyGroupMessages = async (req, res) => {
    try {
        const { id: studyGroupId } = req.params;
        const messages = await StudyGroupMessage.find({ studyGroupId })
            .populate({
                path: 'sender',
                select: '_id name email',
                model: 'User'
            })
            .sort({ createdAt: 1 });

        // Format the messages to ensure they have all required fields
        const formattedMessages = messages.map(msg => {
            // Extract email username if name is not available
            const senderName = msg.sender?.name ||
                (msg.sender?.email ? msg.sender.email.split('@')[0] : 'Unknown User');

            return {
                _id: msg._id,
                content: msg.content,
                studyGroupId: msg.studyGroupId,
                createdAt: msg.createdAt,
                sender: {
                    _id: msg.sender?._id,
                    name: senderName,
                    email: msg.sender?.email
                }
            };
        });

        res.status(200).json(formattedMessages);
    } catch (error) {
        console.error('Error fetching study group messages:', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
};

// Send message to study group
exports.sendStudyGroupMessage = async (req, res) => {
    try {
        const { id: studyGroupId } = req.params;
        const { content } = req.body;
        const sender = req.user.userId;

        const message = new StudyGroupMessage({
            studyGroupId,
            content,
            sender
        });

        await message.save();

        const populatedMessage = await StudyGroupMessage.findById(message._id)
            .populate({
                path: 'sender',
                select: '_id name email',
                model: 'User'
            });

        // Format the response to match the get messages format
        const senderName = populatedMessage.sender?.name ||
            (populatedMessage.sender?.email ? populatedMessage.sender.email.split('@')[0] : 'Unknown User');

        const formattedMessage = {
            _id: populatedMessage._id,
            content: populatedMessage.content,
            studyGroupId: populatedMessage.studyGroupId,
            createdAt: populatedMessage.createdAt,
            sender: {
                _id: populatedMessage.sender?._id,
                name: senderName,
                email: populatedMessage.sender?.email
            }
        };

        res.status(201).json(formattedMessage);
    } catch (error) {
        console.error('Error sending study group message:', error);
        res.status(500).json({ message: 'Failed to send message' });
    }
};

exports.toggleReplyLike = async (req, res) => {
    try {
        const { id, commentId, replyId } = req.params;
        const userId = req.user.userId;

        const post = await ForumPost.findById(id);
        if (!post) {
            return res.status(404).json({ message: 'Forum post not found' });
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const reply = comment.replies.id(replyId);
        if (!reply) {
            return res.status(404).json({ message: 'Reply not found' });
        }

        // Initialize likes array if it doesn't exist
        if (!reply.likes) {
            reply.likes = [];
        }

        const userIdStr = userId.toString();
        const likeIndex = reply.likes.findIndex(id => id && id.toString() === userIdStr);

        if (likeIndex === -1) {
            reply.likes.push(userId);
        } else {
            reply.likes.splice(likeIndex, 1);
        }

        await post.save();

        // Return the updated likes array and status
        const updatedLikes = reply.likes.filter(id => id).map(id => id.toString());
        res.json({
            replyId,
            likes: updatedLikes,
            hasLiked: updatedLikes.includes(userIdStr)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

