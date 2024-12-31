const User = require('../../models/user.model');

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

        // Update streak
        const hasMinimumActivity = 
            todayActivity.goalsCompleted > 0 || 
            todayActivity.lessonsCompleted > 0 || 
            todayActivity.practiceCompleted > 0;

        if (hasMinimumActivity) {
            if (!user.lastStreak) {
                // First activity ever
                user.streak = 1;
                user.longestStreak = 1;
                user.lastStreak = today;
            } else if (isToday(user.lastStreak)) {
                // Already updated today, no change needed
                return;
            } else if (areConsecutiveDays(user.lastStreak, today)) {
                // Consecutive day, increment streak
                user.streak += 1;
                if (user.streak > user.longestStreak) {
                    user.longestStreak = user.streak;
                }
            } else {
                // Streak broken, reset to 1
                user.streak = 1;
            }
            user.lastStreak = today;
        }

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

// Get user's streak information
exports.getStreakInfo = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if streak is still valid (not broken)
        if (user.lastStreak) {
            const lastStreakDate = new Date(user.lastStreak);
            const diffTime = Math.abs(today - lastStreakDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays > 1) {
                // Streak is broken
                user.streak = 0;
                await user.save();
            }
        }

        res.status(200).json({
            success: true,
            data: {
                currentStreak: user.streak,
                longestStreak: user.longestStreak,
                lastActive: user.lastStreak,
                todayActivity: user.dailyActivity.find(a => isToday(a.date)) || null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 