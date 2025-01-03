const User = require('../../models/user.model');
const Achievement = require('../../models/achievement.model');

// Helper function to check if two dates are consecutive
const areConsecutiveDays = (date1, date2) => {
    const day1 = new Date(date1).setHours(0, 0, 0, 0);
    const day2 = new Date(date2).setHours(0, 0, 0, 0);
    const diffTime = Math.abs(day2 - day1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
};

// Helper function to check if a date is today
const isToday = (date) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const compareDate = new Date(date).setHours(0, 0, 0, 0);
    return today === compareDate;
};

// Check and update daily access streak
exports.checkDailyStreak = async (req, res) => {
    try {
        console.log('Checking daily streak');
        const user = await User.findById(req.user.userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // If user has already accessed today, don't update streak
        if (user.lastAccess && isToday(user.lastAccess)) {
            return res.status(200).json({
                success: true,
                data: {
                    streak: user.streak,
                    longestStreak: user.longestStreak,
                    lastAccess: user.lastAccess,
                    alreadyCheckedToday: true
                }
            });
        }

        // Update streak based on last access
        if (!user.lastAccess) {
            // First time access
            user.streak = 1;
            user.longestStreak = 1;
        } else if (areConsecutiveDays(user.lastAccess, today)) {
            // Consecutive day access
            user.streak += 1;
            if (user.streak > user.longestStreak) {
                user.longestStreak = user.streak;
            }
        } else {
            // Streak broken, reset to 1
            user.streak = 1;
        }

        // Update streak achievement progress
        const streakAchievement = user.allAchievements.find(
            achievement => achievement.achievementId === 'n5_streak'
        );

        console.log('Streak achievement found', streakAchievement);

        if (!streakAchievement) {
            // If streak achievement doesn't exist, create it
            const n5Achievements = Achievement.getN5Achievements();
            const streakAchievementTemplate = n5Achievements.find(a => a.id === 'n5_streak');
            
            if (streakAchievementTemplate) {
                user.allAchievements.push({
                    achievementId: streakAchievementTemplate.id,
                    title: streakAchievementTemplate.title,
                    description: streakAchievementTemplate.description,
                    category: streakAchievementTemplate.category,
                    level: streakAchievementTemplate.level,
                    icon: streakAchievementTemplate.icon,
                    currentProgress: (user.streak / 30) * 100, // Calculate percentage based on 30-day requirement
                    isCompleted: user.streak >= 30,
                    completedAt: user.streak >= 30 ? today : null,
                    lastUpdated: today
                });
            }
        } else {
            console.log('Streak achievement found', streakAchievement);
            // Update existing streak achievement
            streakAchievement.currentProgress = (user.streak / 30) * 100;
            
            // Check if achievement is newly completed
            if (!streakAchievement.isCompleted && user.streak >= 30) {
                streakAchievement.isCompleted = true;
                streakAchievement.completedAt = today;
                
                // Add to recent achievements if not already there
                const isInRecent = user.recentAchievements.some(
                    a => a.achievementId === 'n5_streak'
                );
                
                if (!isInRecent) {
                    // Remove oldest achievement if array is full
                    if (user.recentAchievements.length >= 10) {
                        user.recentAchievements.shift();
                    }
                    user.recentAchievements.push(streakAchievement);
                }
            }
            
            streakAchievement.lastUpdated = today;
        }

        // Update last access time
        user.lastAccess = today;
        await user.save();

        res.status(200).json({
            success: true,
            data: {
                streak: user.streak,
                longestStreak: user.longestStreak,
                lastAccess: user.lastAccess,
                alreadyCheckedToday: false
            }
        });
    } catch (error) {
        console.error('Error checking daily streak:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update user's daily activity and streak
exports.updateDailyActivity = async (userId, activityData) => {
    try {
        const user = await User.findById(userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find today's activity record
        let todayActivity = user.dailyActivity.find(
            activity => isToday(activity.date)
        );

        if (!todayActivity) {
            // Create new activity record for today
            todayActivity = {
                date: today,
                goalsCompleted: 0,
                lessonsCompleted: 0,
                practiceCompleted: 0,
                totalTimeSpent: 0
            };
            user.dailyActivity.push(todayActivity);
        }

        // Update activity counts
        todayActivity.goalsCompleted += activityData.goalsCompleted || 0;
        todayActivity.lessonsCompleted += activityData.lessonsCompleted || 0;
        todayActivity.practiceCompleted += activityData.practiceCompleted || 0;
        todayActivity.totalTimeSpent += activityData.timeSpent || 0;

        // Keep only last 30 days of activity
        user.dailyActivity = user.dailyActivity
            .filter(activity => {
                const diffTime = Math.abs(today - activity.date);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 30;
            })
            .sort((a, b) => b.date - a.date);

        await user.save();
        return user;
    } catch (error) {
        console.error('Error updating daily activity:', error);
        throw error;
    }
};