const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    interfaceLanguage: {
        type: String,
        enum: ['en', 'ja'],
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
    }
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