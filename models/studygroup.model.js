const mongoose = require('mongoose');

const studyGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['JLPT N1', 'JLPT N2', 'JLPT N3', 'JLPT N4', 'JLPT N5', 'Kanji', 'Conversation', 'Grammar', 'General']
  },
  nextMeeting: {
    date: Date,
    topic: String,
    meetingLink: String
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resources: [{
    title: String,
    link: String,
    type: {
      type: String,
      enum: ['document', 'video', 'audio', 'link']
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
studyGroupSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('StudyGroup', studyGroupSchema); 