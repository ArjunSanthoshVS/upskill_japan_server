const User = require('../../models/user.model');
const bcrypt = require('bcryptjs');

// Get all users with filters
exports.getUsers = async (req, res) => {
    try {
        const { search, level, status, page = 1, limit = 10 } = req.query;
        const query = {};

        // Apply filters
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (level) {
            query.studyLevel = level;
        }
        if (status) {
            query.status = status;
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Get users with pagination
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await User.countDocuments(query);

        res.status(200).json({
            users,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error in getUsers:', error);
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    activeUsers: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                        }
                    },
                    averageStreak: { $avg: '$streak' },
                    byLevel: {
                        $push: {
                            level: '$studyLevel',
                            count: 1
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalUsers: 1,
                    activeUsers: 1,
                    averageStreak: { $round: ['$averageStreak', 1] },
                    byLevel: 1
                }
            }
        ]);

        // Process level statistics
        const levelStats = stats[0].byLevel.reduce((acc, curr) => {
            acc[curr.level] = (acc[curr.level] || 0) + curr.count;
            return acc;
        }, {});

        res.status(200).json({
            ...stats[0],
            byLevel: levelStats
        });
    } catch (error) {
        console.error('Error in getUserStats:', error);
        res.status(500).json({ message: 'Error fetching user statistics', error: error.message });
    }
};

// Get single user
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('-password')
            .populate({
                path: 'courses.course',
                select: 'title description category level'
            });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Format the courses data
        const formattedUser = user.toObject();
        formattedUser.courses = formattedUser.courses.map(course => ({
            ...course,
            title: course.course?.title || 'Unknown Course',
            description: course.course?.description || '',
            category: course.course?.category || '',
            level: course.course?.level || '',
            courseId: course.course?._id || course.course
        }));

        // Format skills data
        if (formattedUser.skills) {
            formattedUser.skills = {
                vocabulary: Math.round(formattedUser.skills.vocabulary || 0),
                grammar: Math.round(formattedUser.skills.grammar || 0),
                reading: Math.round(formattedUser.skills.reading || 0),
                speaking: Math.round(formattedUser.skills.speaking || 0),
                writing: Math.round(formattedUser.skills.writing || 0),
                lastUpdated: formattedUser.skills.lastUpdated || new Date().toISOString()
            };
        }

        res.status(200).json(formattedUser);
    } catch (error) {
        console.error('Error in getUserById:', error);
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
};

// Create new user
exports.createUser = async (req, res) => {
    try {
        const { email, password, fullName, studyLevel } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Create new user
        const user = new User({
            email,
            password,
            fullName,
            studyLevel,
            status: 'active'
        });

        await user.save();

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json(userResponse);
    } catch (error) {
        console.error('Error in createUser:', error);
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const { fullName, email, studyLevel, status } = req.body;
        const userId = req.params.userId;

        // Check if email is being changed and if it's already taken
        if (email) {
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email is already taken' });
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    fullName,
                    email,
                    studyLevel,
                    status
                }
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error in updateUser:', error);
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};

// Toggle user status
exports.toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = user.status === 'active' ? 'inactive' : 'active';
        await user.save();

        res.status(200).json({
            _id: user._id,
            status: user.status
        });
    } catch (error) {
        console.error('Error in toggleUserStatus:', error);
        res.status(500).json({ message: 'Error toggling user status', error: error.message });
    }
};

// Reset user password
exports.resetUserPassword = async (req, res) => {
    try {
        // Generate a random password
        const tempPassword = Math.random().toString(36).slice(-8);
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        // Update user's password
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: { password: hashedPassword } },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // In a real application, you would send this password to the user's email
        res.status(200).json({
            message: 'Password reset successful',
            tempPassword, // In production, this should be sent via email instead
            user
        });
    } catch (error) {
        console.error('Error in resetUserPassword:', error);
        res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
}; 