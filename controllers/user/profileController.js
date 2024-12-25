const User = require('../../models/user.model');
const Course = require('../../models/course.model');

// Get user profile details
exports.getProfileDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('courses.course');

    const stats = {
      streak: user.streak || 0,
      totalStudyTime: 0,
      completedLessons: 0
    };

    // Calculate stats from user's courses
    user.courses.forEach(course => {
      stats.totalStudyTime += course.lastAccessed ? 
        Math.floor((new Date() - new Date(course.lastAccessed)) / (1000 * 60 * 60)) : 0;
      stats.completedLessons += Math.floor((course.progress / 100) * 
        (course.course.lessons ? course.course.lessons.length : 0));
    });

    res.status(200).json({
      status: 'success',
      data: {
        profile: {
          fullName: user.fullName,
          email: user.email,
          nativeLanguage: user.nativeLanguage,
          stats,
          courses: user.courses
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, nativeLanguage } = req.body;
    
    // Check if email is already taken
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user.userId } });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is already in use'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        fullName: fullName || req.user.fullName,
        email: email || req.user.email,
        nativeLanguage: nativeLanguage || req.user.nativeLanguage
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

// Update notification settings
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { notifications } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { notificationSettings: notifications },
      { new: true }
    ).select('notificationSettings');

    res.status(200).json({
      status: 'success',
      data: { notificationSettings: updatedUser.notificationSettings }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Update language preferences
exports.updateLanguagePreferences = async (req, res) => {
  try {
    const { interfaceLanguage, studyLevel } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        interfaceLanguage,
        studyLevel
      },
      { new: true }
    ).select('interfaceLanguage studyLevel');

    res.status(200).json({
      status: 'success',
      data: { 
        interfaceLanguage: updatedUser.interfaceLanguage,
        studyLevel: updatedUser.studyLevel
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Update privacy settings
exports.updatePrivacySettings = async (req, res) => {
  try {
    const { privacySettings } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { privacySettings },
      { new: true }
    ).select('privacySettings');

    res.status(200).json({
      status: 'success',
      data: { privacySettings: updatedUser.privacySettings }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
}; 