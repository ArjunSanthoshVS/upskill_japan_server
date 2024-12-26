const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema({
  title: {
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
    enum: ['General Discussion', 'Study Tips', 'JLPT Preparation', 'Grammar Help', 'Vocabulary', 'Culture', 'Resources', 'Events']
  },
  author: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'authorModel'
    },
    name: String,
    email: String
  },
  authorModel: {
    type: String,
    required: true,
    enum: ['User', 'Admin']
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active'
  },
  attachments: [{
    url: String,
    type: String,
    filename: String
  }],
  links: [{
    type: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('ForumPost', forumPostSchema); 