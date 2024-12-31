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
        enum: ['vocabulary', 'grammar', 'reading', 'speaking', 'writing', 'streak', 'general'],
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
    // Vocabulary Achievements
    {
        id: 'n5_vocab_starter',
        title: 'Vocabulary Pioneer',
        description: 'Learn your first 100 N5 vocabulary words',
        category: 'vocabulary',
        level: 'N5',
        requirements: {
            type: 'lesson_completion',
            value: 100
        },
        icon: '📚',
        xpReward: 100
    },
    {
        id: 'n5_vocab_master',
        title: 'Vocabulary Master',
        description: 'Master 500 N5 vocabulary words',
        category: 'vocabulary',
        level: 'N5',
        requirements: {
            type: 'lesson_completion',
            value: 500
        },
        icon: '🎯',
        xpReward: 500
    },
    
    // Grammar Achievements
    {
        id: 'n5_grammar_basics',
        title: 'Grammar Foundations',
        description: 'Complete 10 basic grammar lessons',
        category: 'grammar',
        level: 'N5',
        requirements: {
            type: 'lesson_completion',
            value: 10
        },
        icon: '📝',
        xpReward: 100
    },
    {
        id: 'n5_grammar_expert',
        title: 'Grammar Expert',
        description: 'Score 90% or higher in 5 grammar quizzes',
        category: 'grammar',
        level: 'N5',
        requirements: {
            type: 'quiz_score',
            value: 5
        },
        icon: '🏆',
        xpReward: 200
    },

    // Reading Achievements
    {
        id: 'n5_reading_beginner',
        title: 'Reading Explorer',
        description: 'Complete 5 N5 reading practice sessions',
        category: 'reading',
        level: 'N5',
        requirements: {
            type: 'practice_score',
            value: 5
        },
        icon: '📖',
        xpReward: 150
    },
    {
        id: 'n5_reading_pro',
        title: 'Reading Pro',
        description: 'Achieve 85% accuracy in 10 reading exercises',
        category: 'reading',
        level: 'N5',
        requirements: {
            type: 'practice_score',
            value: 10
        },
        icon: '🎓',
        xpReward: 300
    },

    // Speaking Achievements
    {
        id: 'n5_speaking_starter',
        title: 'First Words',
        description: 'Complete your first speaking practice session',
        category: 'speaking',
        level: 'N5',
        requirements: {
            type: 'practice_score',
            value: 1
        },
        icon: '🗣️',
        xpReward: 50
    },
    {
        id: 'n5_speaking_confident',
        title: 'Confident Speaker',
        description: 'Complete 20 speaking practice sessions',
        category: 'speaking',
        level: 'N5',
        requirements: {
            type: 'practice_score',
            value: 20
        },
        icon: '🎤',
        xpReward: 400
    },

    // Writing Achievements
    {
        id: 'n5_writing_hiragana',
        title: 'Hiragana Master',
        description: 'Master all Hiragana characters',
        category: 'writing',
        level: 'N5',
        requirements: {
            type: 'quiz_score',
            value: 1
        },
        icon: 'あ',
        xpReward: 200
    },
    {
        id: 'n5_writing_katakana',
        title: 'Katakana Master',
        description: 'Master all Katakana characters',
        category: 'writing',
        level: 'N5',
        requirements: {
            type: 'quiz_score',
            value: 1
        },
        icon: 'ア',
        xpReward: 200
    },

    // Streak Achievements
    {
        id: 'n5_streak_week',
        title: 'Week Warrior',
        description: 'Maintain a 7-day study streak',
        category: 'streak',
        level: 'N5',
        requirements: {
            type: 'streak',
            value: 7
        },
        icon: '🔥',
        xpReward: 100
    },
    {
        id: 'n5_streak_month',
        title: 'Monthly Master',
        description: 'Maintain a 30-day study streak',
        category: 'streak',
        level: 'N5',
        requirements: {
            type: 'streak',
            value: 30
        },
        icon: '🌟',
        xpReward: 500
    },

    // General Achievements
    {
        id: 'n5_time_dedication',
        title: 'Dedicated Learner',
        description: 'Spend 50 hours studying N5 material',
        category: 'general',
        level: 'N5',
        requirements: {
            type: 'time_spent',
            value: 50
        },
        icon: '⏰',
        xpReward: 300
    },
    {
        id: 'n5_all_rounder',
        title: 'N5 All-Rounder',
        description: 'Score 80% or higher in all N5 skill assessments',
        category: 'general',
        level: 'N5',
        requirements: {
            type: 'quiz_score',
            value: 1
        },
        icon: '🌈',
        xpReward: 1000
    }
];

// Static method to get all N5 achievements
achievementSchema.statics.getN5Achievements = function() {
    return N5_ACHIEVEMENTS;
};

const Achievement = mongoose.model('Achievement', achievementSchema);

module.exports = Achievement; 