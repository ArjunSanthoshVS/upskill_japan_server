const User = require('../../models/user.model');

const getProgressData = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId)
            .populate('courses.course', 'title name level description'); // Added title to populated fields

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get all courses data
        const courses = user.courses.map(course => ({
            id: course.course._id,
            name: course.course.title,
            level: course.course.level,
            overallProgress: course.overallProgress,
        }));

        // Get skill breakdown from the skills field
        const skillBreakdown = {
            vocabulary: user.skills?.vocabulary || 0,
            grammar: user.skills?.grammar || 0,
            reading: user.skills?.reading || 0,
            speaking: user.skills?.speaking || 0,
            writing: user.skills?.writing || 0,
            lastUpdated: user.skills?.lastUpdated
        };

        // Get recent achievements (limited to 10 as per model)
        const achievements = user.recentAchievements.map(achievement => ({
            type: achievement.category,
            description: achievement.description,
            icon: getIconColorForCategory(achievement.category)
        }));

        // Get active study recommendations
        const recommendations = user.studyRecommendations
            .filter(rec => rec.status === 'pending')
            .map(rec => ({
                title: rec.title,
                description: rec.description,
                type: rec.type,
                priority: rec.priority,
                generatedAt: rec.generatedAt
            }));

        // Get streak information
        const streak = {
            current: user.streak || 0,
            best: user.longestStreak || 0,
            lastStreak: user.lastStreak
        };

        res.json({
            courses,
            skillBreakdown,
            achievements,
            recommendations,
            streak
        });
    } catch (error) {
        console.error('Error fetching progress data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Helper function to calculate monthly improvement from daily activity
const calculateMonthlyImprovement = (dailyActivity) => {
    if (!dailyActivity || dailyActivity.length === 0) return 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    const recentActivity = dailyActivity.filter(activity =>
        new Date(activity.date) >= thirtyDaysAgo
    );

    if (recentActivity.length < 2) return 0;

    const oldestActivity = recentActivity[0];
    const latestActivity = recentActivity[recentActivity.length - 1];

    // Calculate improvement based on completed tasks and time spent
    const oldMetrics = oldestActivity.goalsCompleted + oldestActivity.lessonsCompleted;
    const newMetrics = latestActivity.goalsCompleted + latestActivity.lessonsCompleted;

    if (oldMetrics === 0) return 0;

    return Math.round(((newMetrics - oldMetrics) / oldMetrics) * 100);
};

// Helper function to map achievement categories to icon colors
const getIconColorForCategory = (category) => {
    const iconMap = {
        vocabulary: 'blue',
        grammar: 'green',
        reading: 'yellow',
        speaking: 'red',
        writing: 'purple',
        streak: 'yellow',
        general: 'blue'
    };
    return iconMap[category] || 'blue';
};

module.exports = {
    getProgressData
}; 