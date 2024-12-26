const ForumPost = require('../../models/communityforum.model');
const Admin = require('../../models/admin.model');
const AppError = require('../../utils/appError');
const catchAsync = require('../../utils/catchAsync');

// Get all forum posts with pagination and filters
exports.getForumPosts = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.category) query.category = req.query.category;
    if (req.query.search) {
        query.$text = { $search: req.query.search };
    }

    // Execute query with pagination
    const [posts, total] = await Promise.all([
        ForumPost.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        ForumPost.countDocuments(query)
    ]);

    res.json({
        posts,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total
    });
});

// Get forum statistics
exports.getForumStats = catchAsync(async (req, res) => {
    const [totalPosts, flaggedPosts, categoryCounts] = await Promise.all([
        ForumPost.countDocuments(),
        ForumPost.countDocuments({ status: 'flagged' }),
        ForumPost.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    const activeCategories = categoryCounts.length;

    res.json({
        totalPosts,
        flaggedPosts,
        categoryCounts,
        activeCategories
    });
});

// Create a new forum post
exports.createForumPost = catchAsync(async (req, res) => {
    const { title, description, category, links = [] } = req.body;

    // Fetch admin details
    const admin = await Admin.findById(req.user.adminId);
    if (!admin) {
        throw new AppError('Admin not found', 404);
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
            _id: admin._id,
            name: admin.name,
            email: admin.email
        },
        authorModel: 'Admin',
        attachments,
        links
    });

    res.status(201).json(post);
});

// Update post status
exports.updatePostStatus = catchAsync(async (req, res) => {
    const { postId } = req.params;
    const { status } = req.body;

    if (!['active', 'flagged', 'archived'].includes(status)) {
        throw new AppError('Invalid status value', 400);
    }

    const post = await ForumPost.findByIdAndUpdate(
        postId,
        { status },
        { new: true, runValidators: true }
    );

    if (!post) {
        throw new AppError('Post not found', 404);
    }

    res.json(post);
});

// Delete forum post
exports.deleteForumPost = catchAsync(async (req, res) => {
    const { postId } = req.params;
    const post = await ForumPost.findByIdAndDelete(postId);

    if (!post) {
        throw new AppError('Post not found', 404);
    }

    res.status(204).send();
});

// Flag a post
exports.flagPost = catchAsync(async (req, res) => {
    const { postId } = req.params;
    const { reason } = req.body;

    // Fetch admin details
    const admin = await Admin.findById(req.user.adminId);
    if (!admin) {
        throw new AppError('Admin not found', 404);
    }

    const post = await ForumPost.findByIdAndUpdate(
        postId,
        {
            status: 'flagged',
            $push: {
                flags: {
                    user: admin._id,
                    name: admin.name,
                    reason
                }
            }
        },
        { new: true }
    );

    if (!post) {
        throw new AppError('Post not found', 404);
    }

    res.json(post);
}); 