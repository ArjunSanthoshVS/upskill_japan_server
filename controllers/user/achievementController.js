const Achievement = require('../../models/achievement.model');
const User = require('../../models/user.model');

// Initialize achievements for N5 level
const initializeAchievements = async (req, res) => {
    try {
        // Get predefined N5 achievements
        const n5Achievements = Achievement.getN5Achievements();
        
        // Insert all achievements if they don't exist
        const insertPromises = n5Achievements.map(achievement => {
            return Achievement.findOneAndUpdate(
                { id: achievement.id },
                achievement,
                { upsert: true, new: true }
            );
        });

        await Promise.all(insertPromises);

        res.status(200).json({
            success: true,
            message: 'N5 achievements initialized successfully',
            count: n5Achievements.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error initializing achievements',
            error: error.message
        });
    }
};

// Get all achievements
const getAllAchievements = async (req, res) => {
    try {
        const achievements = await Achievement.find({});
        res.status(200).json({
            success: true,
            data: achievements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching achievements',
            error: error.message
        });
    }
};

// Get achievements by level
const getAchievementsByLevel = async (req, res) => {
    try {
        const { level } = req.params;
        const achievements = await Achievement.find({ level });
        res.status(200).json({
            success: true,
            data: achievements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching achievements by level',
            error: error.message
        });
    }
};

// Get user's achievements
const getUserAchievements = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            recentAchievements: user.recentAchievements,
            allAchievements: user.allAchievements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user achievements',
            error: error.message
        });
    }
};

// Award achievement to user
const awardAchievement = async (req, res) => {
    try {
        const { userId, achievementId } = req.body;
        
        // Find the achievement
        const achievement = await Achievement.findOne({ id: achievementId });
        if (!achievement) {
            return res.status(404).json({
                success: false,
                message: 'Achievement not found'
            });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user already has this achievement
        const hasAchievement = user.allAchievements.some(a => a.id === achievementId);
        if (hasAchievement) {
            return res.status(400).json({
                success: false,
                message: 'User already has this achievement'
            });
        }

        // Add to recent achievements (maintain max 10)
        user.recentAchievements.unshift(achievement);
        if (user.recentAchievements.length > 10) {
            user.recentAchievements.pop();
        }

        // Add to all achievements
        user.allAchievements.push(achievement);

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Achievement awarded successfully',
            achievement
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error awarding achievement',
            error: error.message
        });
    }
};

// Set achievements for a user based on their study level
const setUserAchievements = async (req, res) => {
    try {
        const { userId, studyLevel } = req.body;

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get achievements for the user's level
        const achievements = await Achievement.find({ level: studyLevel });
        if (!achievements || achievements.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No achievements found for level ${studyLevel}`
            });
        }

        // Clear existing achievements for this level
        user.allAchievements = user.allAchievements.filter(a => a.level !== studyLevel);
        user.recentAchievements = user.recentAchievements.filter(a => a.level !== studyLevel);

        // Add new achievements
        for (const achievement of achievements) {
            const achievementData = {
                title: achievement.title,
                description: achievement.description,
                category: achievement.category,
                icon: achievement.icon,
                level: achievement.level,
                earnedAt: new Date()
            };

            // Add to all achievements
            user.allAchievements.push(achievementData);

            // Add to recent achievements (maintain max 10)
            user.recentAchievements.unshift(achievementData);
            if (user.recentAchievements.length > 10) {
                user.recentAchievements.pop();
            }
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: `Successfully set ${achievements.length} achievements for user`,
            count: achievements.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error setting user achievements',
            error: error.message
        });
    }
};

// Calculate achievement progress
const calculateProgress = async (user, achievement) => {
    switch (achievement.requirements.type) {
        case 'lesson_completion':
            const totalLessonsCompleted = user.courses.reduce((total, course) => {
                return total + course.moduleProgress.reduce((moduleTotal, module) => {
                    return moduleTotal + module.completedLessons.length;
                }, 0);
            }, 0);
            return Math.min((totalLessonsCompleted / achievement.requirements.value) * 100, 100);

        case 'streak':
            return Math.min((user.streak / achievement.requirements.value) * 100, 100);

        case 'time_spent':
            const totalTimeSpent = user.dailyActivity.reduce((total, activity) => {
                return total + activity.totalTimeSpent;
            }, 0);
            return Math.min((totalTimeSpent / (achievement.requirements.value * 60)) * 100, 100);

        case 'quiz_score':
        case 'practice_score':
            // For these types, we'll need to implement specific logic based on your quiz/practice data structure
            return 0;

        default:
            return 0;
    }
};

// Get achievement progress
const getAchievementProgress = async (req, res) => {
    try {
        const { achievementId } = req.params;
        const userId = req.user.userId;

        const [user, achievement] = await Promise.all([
            User.findById(userId),
            Achievement.findOne({ id: achievementId })
        ]);

        if (!user || !achievement) {
            return res.status(404).json({
                success: false,
                message: 'User or achievement not found'
            });
        }

        const progress = await calculateProgress(user, achievement);

        res.status(200).json({
            success: true,
            progress
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting achievement progress',
            error: error.message
        });
    }
};

module.exports = {
    initializeAchievements,
    getAllAchievements,
    getAchievementsByLevel,
    getUserAchievements,
    awardAchievement,
    setUserAchievements,
    getAchievementProgress
}; 