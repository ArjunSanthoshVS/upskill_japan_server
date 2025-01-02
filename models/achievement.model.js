const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['vocabulary', 'grammar', 'reading', 'speaking', 'writing', 'listening', 'streak', 'general'],
        required: true
    },
    level: {
        type: String,
        enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
        required: true
    },
    requirements: {
        type: {
            type: String,
            enum: ['lesson_completion', 'practice_score', 'streak', 'time_spent', 'quiz_score'],
            required: true
        },
        value: {
            type: Number,
            required: true
        }
    },
    icon: {
        type: String,
        required: true
    },
    xpReward: {
        type: Number,
        required: true
    }
});

// Predefined JLPT N5 Achievements
const N5_ACHIEVEMENTS = [
    // Vocabulary Achievement
    {
        id: 'n5_vocabulary',
        title: 'Vocabulary Master',
        description: 'Complete all N5 vocabulary lessons',
        category: 'vocabulary',
        level: 'N5',
        requirements: {
            type: 'lesson_completion',
            value: 3
        },
        icon: '📝',
        xpReward: 200
    },
    
    // Grammar Achievement
    {
        id: 'n5_grammar',
        title: 'Grammar Master',
        description: 'Complete all N5 grammar lessons',
        category: 'grammar',
        level: 'N5',
        requirements: {
            type: 'lesson_completion',
            value: 3
        },
        icon: '✍️',
        xpReward: 200
    },

    // Reading Achievement
    {
        id: 'n5_reading',
        title: 'Reading Master',
        description: 'Complete all N5 reading lessons',
        category: 'reading',
        level: 'N5',
        requirements: {
            type: 'lesson_completion',
            value: 3
        },
        icon: '📖',
        xpReward: 200
    },

    // Speaking Achievement
    {
        id: 'n5_speaking',
        title: 'Speaking Master',
        description: 'Complete all N5 speaking lessons',
        category: 'speaking',
        level: 'N5',
        requirements: {
            type: 'lesson_completion',
            value: 3
        },
        icon: '🗣️',
        xpReward: 200
    },

    // Writing Achievement
    {
        id: 'n5_writing',
        title: 'Writing Master',
        description: 'Complete all N5 writing lessons',
        category: 'writing',
        level: 'N5',
        requirements: {
            type: 'lesson_completion',
            value: 3
        },
        icon: '✏️',
        xpReward: 200
    },

    // Listening Achievement
    {
        id: 'n5_listening',
        title: 'Listening Master',
        description: 'Complete all N5 listening lessons',
        category: 'listening',
        level: 'N5',
        requirements: {
            type: 'lesson_completion',
            value: 3
        },
        icon: '👂',
        xpReward: 200
    },

    // Streak Achievement
    {
        id: 'n5_streak',
        title: 'Streak Master',
        description: 'Maintain a 30-day study streak',
        category: 'streak',
        level: 'N5',
        requirements: {
            type: 'streak',
            value: 30
        },
        icon: '🌟',
        xpReward: 500
    }
];

// Static method to get all N5 achievements
achievementSchema.statics.getN5Achievements = function() {
    return N5_ACHIEVEMENTS;
};

const Achievement = mongoose.model('Achievement', achievementSchema);

module.exports = Achievement; 