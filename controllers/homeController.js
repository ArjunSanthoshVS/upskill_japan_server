const User = require('../models/user.model');
const Course = require('../models/course.model');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

exports.getUserCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('courses.course')
      .select('courses');

    console.log('User courses:', user.courses);
    res.status(200).json({
      status: 'success',
      data: { courses: user.courses }
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

exports.updateCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { progress } = req.body;

    const user = await User.findOneAndUpdate(
      { 
        _id: req.user.userId,
        'courses.course': courseId
      },
      {
        $set: {
          'courses.$.progress': progress,
          'courses.$.lastAccessed': new Date()
        }
      },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      data: { progress }
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

exports.getStreak = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('streak');
    res.status(200).json({
      status: 'success',
      data: { streak: user.streak }
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

exports.getUpcomingEvents = async (req, res) => {
  try {
    // This would typically fetch from an Events collection
    // For now, returning mock data
    const events = [
      {
        title: 'Live Q&A Session',
        time: new Date().setHours(19, 0, 0, 0),
        type: 'qa'
      },
      {
        title: 'Grammar Workshop',
        time: new Date(Date.now() + 86400000).setHours(18, 0, 0, 0),
        type: 'workshop'
      }
    ];

    res.status(200).json({
      status: 'success',
      data: { events }
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
}; 