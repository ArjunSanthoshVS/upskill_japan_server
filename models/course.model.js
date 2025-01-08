const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true }, // Array of options
  correctAnswer: { type: Number, required: true } // Index of the correct option
});

const lessonSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['writing', 'reading', 'vocabulary', 'grammar', 'listening', 'practice'],
    required: true
  },
  completed: { type: Boolean, default: false },
  duration: { type: Number, required: true }, // in minutes
  content: { type: [String], required: false }, // Array of content strings
  questions: [questionSchema] // Array of questions
});

const moduleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true }, // Store icon name as string
  progress: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: true },
  lessons: [lessonSchema]
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  level: {
    type: String,
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    required: true
  },
  modules: [moduleSchema],
  totalProgress: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
courseSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Course', courseSchema);
