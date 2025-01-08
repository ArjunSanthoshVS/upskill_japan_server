const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true,
        default: 60
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    maxParticipants: {
        type: Number,
        default: 50
    },
    materials: [{
        title: String,
        url: String
    }],
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        required: true
    }
}, {
    timestamps: true
});

// Add index for efficient querying
classSchema.index({ startTime: 1, status: 1 });

module.exports = mongoose.model('Class', classSchema); 