const ForumPost = require('../../models/communityforum.model');
const StudyGroup = require('../../models/studygroup.model');
const StudyGroupMessage = require('../../models/studygroupmessage.model');
const User = require('../../models/user.model');

exports.getAllForumPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const category = req.query.category || '';
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
        const postsWithLikeStatus = posts.map(post => {
            const postObj = post.toObject();
            postObj.likes = post.likes ? post.likes.filter(like => like).map(like => like._id?.toString()) : [];
            postObj.hasLiked = postObj.likes.includes(currentUserId);
            postObj.comments = post.comments || [];
            return postObj;
        });

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
        const post = await ForumPost.findById(req.params.id)
            .populate('author', 'name email')
            .populate('comments.user', 'fullName email')
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

        // Add a field to indicate if the current user has liked the post
        const currentUserId = req.user.userId.toString();
        postObject.likes = post.likes ? post.likes.filter(like => like).map(like => like._id?.toString()) : [];
        postObject.hasLiked = postObject.likes.includes(currentUserId);

        // Add hasLiked field to each comment
        postObject.comments = postObject.comments.map(comment => {
            const commentLikes = comment.likes ? comment.likes.filter(like => like).map(like => like._id?.toString()) : [];
            return {
                ...comment,
                likes: commentLikes,
                hasLiked: commentLikes.includes(currentUserId)
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
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        const post = await ForumPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Forum post not found' });
        }

        const comment = {
            user: req.user.userId, // Use the authenticated user's ID
            content: content.trim(),
            createdAt: new Date()
        };

        post.comments.push(comment);
        await post.save();

        // Fetch the populated comment to return
        const populatedPost = await ForumPost.findById(post._id)
            .populate({
                path: 'comments.user',
                select: 'fullName email'
            });

        // Get the newly added comment with populated user data
        const newComment = populatedPost.comments[populatedPost.comments.length - 1];

        // Ensure we have the complete user data
        const commentToReturn = {
            _id: newComment._id,
            content: newComment.content,
            user: {
                _id: newComment.user._id,
                name: newComment.user.fullName || 'Anonymous',
                email: newComment.user.email
            },
            createdAt: newComment.createdAt
        };

        res.json(commentToReturn);
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
        const { postId, commentId } = req.params;
        const userId = req.user.userId;

        const post = await ForumPost.findById(postId);
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
        const { search, category } = req.query;
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

        const formattedGroups = studyGroups.map(group => ({
            ...group.toObject(),
            memberCount: group.members.length
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
        const studyGroups = await StudyGroup.find({
            members: req.user.userId,
            isActive: true
        })
            .populate('admin', 'name')
            .select('-resources')
            .sort({ createdAt: -1 });

        const formattedGroups = studyGroups.map(group => ({
            ...group.toObject(),
            memberCount: group.members.length
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

