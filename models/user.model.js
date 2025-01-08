const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const dailyGoalSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['lesson', 'practice', 'review', 'speaking', 'writing', 'vocabulary'],
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    deadline: {
        type: Date,
        required: true
    }
});

const skillSchema = new mongoose.Schema({
    vocabulary: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    grammar: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    reading: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    speaking: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    writing: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const achievementProgressSchema = new mongoose.Schema({
    achievementId: {
        type: String,
        required: true
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
    icon: {
        type: String,
        required: true
    },
    currentProgress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date,
        default: null
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const studyRecommendationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['vocabulary', 'grammar', 'reading', 'speaking', 'writing', 'listening', 'general'],
        required: true
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    reason: {
        type: String,
        required: true
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'skipped'],
        default: 'pending'
    }
});

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [2, 'Full name must be at least 2 characters long'],
        maxlength: [50, 'Full name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    nativeLanguage: {
        type: String,
        trim: true,
        maxlength: [50, 'Native language name cannot exceed 50 characters']
    },
    courses: [{
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true
        },
        overallProgress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        nextLesson: {
            moduleId: {
                type: String
            },
            lessonId: {
                type: String
            }
        },
        moduleProgress: [{
            moduleId: {
                type: String,
                required: true
            },
            progress: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            },
            completedLessons: [{
                type: String
            }]
        }],
        lastAccessed: {
            type: Date,
            default: Date.now
        }
    }],
    streak: {
        type: Number,
        default: 0
    },
    lastStreak: {
        type: Date,
        default: null
    },
    longestStreak: {
        type: Number,
        default: 0
    },
    dailyActivity: [{
        date: {
            type: Date,
            required: true
        },
        goalsCompleted: {
            type: Number,
            default: 0
        },
        lessonsCompleted: {
            type: Number,
            default: 0
        },
        practiceCompleted: {
            type: Number,
            default: 0
        },
        totalTimeSpent: {
            type: Number, // in minutes
            default: 0
        }
    }],
    notificationSettings: {
        email: {
            type: Boolean,
            default: true
        },
        push: {
            type: Boolean,
            default: true
        },
        studyReminders: {
            type: Boolean,
            default: true
        },
        courseUpdates: {
            type: Boolean,
            default: true
        }
    },
    lastAccess: {
        type: Date,
        default: null
    },
    interfaceLanguage: {
        type: String,
        enum: ['en', 'hi'],
        default: 'en'
    },
    studyLevel: {
        type: String,
        enum: ['N5', 'N4', 'N3', 'N2', 'N1', 'Business'],
        default: 'N5'
    },
    privacySettings: {
        showProfile: {
            type: Boolean,
            default: true
        },
        showProgress: {
            type: Boolean,
            default: true
        },
        showActivity: {
            type: Boolean,
            default: true
        }
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    dailyGoals: [dailyGoalSchema],
    lastGoalsGenerated: {
        type: Date,
        default: null
    },
    skills: skillSchema,
    recentAchievements: {
        type: [achievementProgressSchema],
        default: [],
        validate: [array => array.length <= 10, 'Recent achievements cannot exceed 10 items']
    },
    allAchievements: {
        type: [achievementProgressSchema],
        default: []
    },
    studyRecommendations: {
        type: [studyRecommendationSchema],
        default: [],
        validate: [array => array.length <= 5, 'Active study recommendations cannot exceed 5 items']
    },
    lastRecommendationGenerated: {
        type: Date,
        default: null
    },
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User; 