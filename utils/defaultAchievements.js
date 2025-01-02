const getDefaultAchievements = (studyLevel) => {
    const baseAchievements = [
        // Streak Achievement
        {
            achievementId: `${studyLevel.toLowerCase()}_streak`,
            title: 'Streak Master',
            description: `Maintain a 30-day study streak for ${studyLevel}`,
            category: 'streak',
            level: studyLevel,
            icon: '🌟',
            currentProgress: 0,
            isCompleted: false
        },
        // Vocabulary Achievement
        {
            achievementId: `${studyLevel.toLowerCase()}_vocabulary`,
            title: 'Vocabulary Master',
            description: `Complete all ${studyLevel} vocabulary lessons`,
            category: 'vocabulary',
            level: studyLevel,
            icon: '📝',
            currentProgress: 0,
            isCompleted: false
        },
        // Grammar Achievement
        {
            achievementId: `${studyLevel.toLowerCase()}_grammar`,
            title: 'Grammar Master',
            description: `Complete all ${studyLevel} grammar lessons`,
            category: 'grammar',
            level: studyLevel,
            icon: '✍️',
            currentProgress: 0,
            isCompleted: false
        },
        // Reading Achievement
        {
            achievementId: `${studyLevel.toLowerCase()}_reading`,
            title: 'Reading Master',
            description: `Complete all ${studyLevel} reading lessons`,
            category: 'reading',
            level: studyLevel,
            icon: '📖',
            currentProgress: 0,
            isCompleted: false
        },
        // Speaking Achievement
        {
            achievementId: `${studyLevel.toLowerCase()}_speaking`,
            title: 'Speaking Master',
            description: `Complete all ${studyLevel} speaking lessons`,
            category: 'speaking',
            level: studyLevel,
            icon: '🗣️',
            currentProgress: 0,
            isCompleted: false
        },
        // Writing Achievement
        {
            achievementId: `${studyLevel.toLowerCase()}_writing`,
            title: 'Writing Master',
            description: `Complete all ${studyLevel} writing lessons`,
            category: 'writing',
            level: studyLevel,
            icon: '✏️',
            currentProgress: 0,
            isCompleted: false
        },
        // Listening Achievement
        {
            achievementId: `${studyLevel.toLowerCase()}_listening`,
            title: 'Listening Master',
            description: `Complete all ${studyLevel} listening lessons`,
            category: 'listening',
            level: studyLevel,
            icon: '👂',
            currentProgress: 0,
            isCompleted: false
        }
    ];
    // Combine base achievements with level-specific ones
    return [...baseAchievements];
};

module.exports = getDefaultAchievements;
