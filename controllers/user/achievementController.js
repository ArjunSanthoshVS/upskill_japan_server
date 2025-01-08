const Achievement = require('../../models/achievement.model');
const User = require('../../models/user.model');
const translationService = require('../../utils/translationService');

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

// Get user's achievements with progress
const getUserAchievements = async (req, res) => {
    try {
        const userId = req.user.userId;
        const language = req.query.language || 'en';
        const [user, allAchievementTemplates] = await Promise.all([
            User.findById(userId),
            Achievement.find({})
        ]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Process each achievement template to include progress and translations
        const achievementsWithProgress = await Promise.all(
            allAchievementTemplates.map(async (achievement) => {
                const baseAchievement = achievement.toObject();
                
                // Only translate if language is not English
                if (language !== 'en') {
                    const [translatedTitle, translatedDescription] = await Promise.all([
                        translationService.translate(baseAchievement.title, language),
                        translationService.translate(baseAchievement.description, language)
                    ]);
                    baseAchievement.title = translatedTitle;
                    baseAchievement.description = translatedDescription;
                }

                // First check in recentAchievements
                const recentProgress = user.recentAchievements.find(a => a.achievementId === achievement.id);
                if (recentProgress) {
                    return {
                        ...baseAchievement,
                        currentProgress: recentProgress.currentProgress,
                        isCompleted: recentProgress.isCompleted,
                        completedAt: recentProgress.completedAt
                    };
                }

                // Then check in allAchievements
                const userProgress = user.allAchievements.find(a => a.achievementId === achievement.id);
                if (userProgress) {
                    return {
                        ...baseAchievement,
                        currentProgress: userProgress.currentProgress,
                        isCompleted: userProgress.isCompleted,
                        completedAt: userProgress.completedAt
                    };
                }

                // If not found in either, calculate progress
                const progress = await calculateProgress(user, achievement);
                return {
                    ...baseAchievement,
                    currentProgress: progress,
                    isCompleted: progress === 100,
                    completedAt: progress === 100 ? new Date() : null
                };
            })
        );

        // Sort achievements: completed first, then by progress
        const sortedAchievements = achievementsWithProgress.sort((a, b) => {
            if (a.isCompleted && !b.isCompleted) return -1;
            if (!a.isCompleted && b.isCompleted) return 1;
            return b.currentProgress - a.currentProgress;
        });

        // Get recent achievements (completed in the last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Use the user's recentAchievements array directly
        const recentAchievements = await Promise.all(user.recentAchievements
            .map(async recentAchievement => {
                const baseAchievement = allAchievementTemplates.find(a => a.id === recentAchievement.achievementId);
                if (!baseAchievement) return null;

                const achievementObj = baseAchievement.toObject();
                
                // Only translate if language is not English
                if (language !== 'en') {
                    const [translatedTitle, translatedDescription] = await Promise.all([
                        translationService.translate(achievementObj.title, language),
                        translationService.translate(achievementObj.description, language)
                    ]);
                    achievementObj.title = translatedTitle;
                    achievementObj.description = translatedDescription;
                }

                return {
                    ...achievementObj,
                    currentProgress: recentAchievement.currentProgress,
                    isCompleted: recentAchievement.isCompleted,
                    completedAt: recentAchievement.completedAt
                };
            })
            .filter(Boolean)); // Remove any null values

        res.status(200).json({
            success: true,
            achievements: sortedAchievements,
            recentAchievements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user achievements',
            error: error.message
        });
    }
};

// Update achievement progress
const updateAchievementProgress = async (req, res) => {
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
        const isCompleted = progress === 100;

        // Update or create achievement progress
        const achievementIndex = user.achievements.findIndex(a => a.achievementId === achievementId);
        const achievementData = {
            achievementId: achievement.id,
            title: achievement.title,
            description: achievement.description,
            category: achievement.category,
            level: achievement.level,
            icon: achievement.icon,
            currentProgress: progress,
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
            lastUpdated: new Date()
        };

        if (achievementIndex === -1) {
            user.achievements.push(achievementData);
        } else {
            user.achievements[achievementIndex] = achievementData;
        }

        await user.save();

        res.status(200).json({
            success: true,
            achievement: achievementData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating achievement progress',
            error: error.message
        });
    }
};

// Delete all achievements for all users
const deleteAllAchievements = async (req, res) => {
    try {
        // Update all users to remove their achievements from all achievement-related fields
        await User.updateMany(
            {},
            {
                $set: {
                    achievements: [],
                    recentAchievements: [],
                    allAchievements: []
                }
            }
        );

        // Delete all achievement templates
        await Achievement.deleteMany({});

        res.status(200).json({
            success: true,
            message: 'Successfully deleted all achievements'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting achievements',
            error: error.message
        });
    }
};

// Set achievements for all users based on their study level
const setUserAchievements = async (req, res) => {
    try {
        // Get all users
        const users = await User.find({});

        // Get all achievement templates
        const achievements = await Achievement.find({});

        let successCount = 0;
        let errorCount = 0;

        // Process each user
        for (const user of users) {
            try {
                // Filter achievements matching user's study level
                const userLevelAchievements = achievements
                    .filter(achievement => achievement.level === user.studyLevel)
                    .map(achievement => ({
                        achievementId: achievement.id,
                        title: achievement.title,
                        description: achievement.description,
                        category: achievement.category,
                        level: achievement.level,
                        icon: achievement.icon,
                        currentProgress: 0,
                        isCompleted: false,
                        completedAt: null,
                        lastUpdated: new Date()
                    }));

                // Update user's achievements
                user.allAchievements = userLevelAchievements;

                await user.save();
                successCount++;
            } catch (error) {
                console.error(`Error setting achievements for user ${user._id}:`, error);
                errorCount++;
            }
        }

        res.status(200).json({
            success: true,
            message: `Successfully set achievements for ${successCount} users. ${errorCount} users failed.`,
            successCount,
            errorCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error setting user achievements',
            error: error.message
        });
    }
};

module.exports = {
    initializeAchievements,
    getUserAchievements,
    updateAchievementProgress,
    deleteAllAchievements,
    setUserAchievements
}; 