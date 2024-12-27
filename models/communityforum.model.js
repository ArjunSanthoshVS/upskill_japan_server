const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    enum: ['text', 'voice'],
    required: true
  },
  audioUrl: {
    type: String,
    required: function() {
      return this.contentType === 'voice';
    }
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    enum: ['text', 'voice'],
    required: true
  },
  audioUrl: {
    type: String,
    required: function() {
      return this.contentType === 'voice';
    }
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: [{
    type: {
      type: String,
      required: true
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  replies: [replySchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

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
  comments: [commentSchema],
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