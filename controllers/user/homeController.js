const User = require('../../models/user.model');
const Course = require('../../models/course.model');
const translationService = require('../../utils/translationService');

exports.getProfile = async (req, res) => {
  try {
    const language = req.query.language || 'en';
    const user = await User.findById(req.user.userId).select('-password');
    
    // Convert to plain object and add translations if needed
    const userData = user.toObject();
    if (language !== 'en') {
      userData.studyLevel = await translationService.translate(userData.studyLevel, language);
      if (userData.preferences) {
        userData.preferences.preferredLanguage = await translationService.translate(userData.preferences.preferredLanguage, language);
      }
    }

    res.status(200).json({
      status: 'success',
      data: { user: userData }
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
    const language = req.query.language || 'en';

    const user = await User.findById(req.user.userId)
      .populate({
        path: 'courses.course',
        select: 'title level modules'
      })
      .select('courses');

    const formattedCourses = user.courses.map(userCourse => {
      const course = userCourse.course;      
      // Find all modules with their completion status
      const moduleStatuses = course.modules.map(module => {
        const moduleProgress = userCourse.moduleProgress.find(mp => mp.moduleId === module.id);
        const completedLessons = moduleProgress?.completedLessons || [];
        const isComplete = moduleProgress && module.lessons.length === completedLessons.length;
        
        return {
          module,
          isComplete,
          progress: moduleProgress?.progress || 0,
          isLocked: module.isLocked
        };
      });

      // Check if all unlocked modules are completed
      const allUnlockedModulesCompleted = moduleStatuses
        .filter(status => !status.isLocked)
        .every(status => status.isComplete);

      // Find first incomplete and unlocked module
      const currentModuleStatus = moduleStatuses.find(status => 
        !status.isComplete && !status.isLocked
      );

      // Get current module details
      let currentModule = null;
      if (currentModuleStatus) {
        currentModule = {
          id: currentModuleStatus.module.id,
          title: currentModuleStatus.module.title,
          progress: currentModuleStatus.progress
        };
      }

      // Find the next lesson
      let nextLessonDetails = null;
      if (currentModule) {
        const currentModuleData = currentModuleStatus.module;
        const moduleProgressData = userCourse.moduleProgress.find(mp => mp.moduleId === currentModule.id);
        const completedLessons = moduleProgressData?.completedLessons || [];

        // Find the first incomplete lesson in the current module
        const nextIncompleteLesson = currentModuleData.lessons.find(lesson => 
          !completedLessons.includes(lesson.id)
        );

        if (nextIncompleteLesson) {
          nextLessonDetails = {
            moduleId: currentModule.id,
            moduleTitle: currentModuleData.title,
            lessonId: nextIncompleteLesson.id,
            lessonTitle: nextIncompleteLesson.title
          };
        }
      }

      // If no next lesson found in current module, look for next unlocked module
      if (!nextLessonDetails) {
        const currentModuleIndex = currentModule 
          ? moduleStatuses.findIndex(status => status.module.id === currentModule.id)
          : -1;
        
        const nextUnlockedModule = moduleStatuses
          .slice(currentModuleIndex + 1)
          .find(status => !status.isLocked);

        if (nextUnlockedModule && nextUnlockedModule.module.lessons.length > 0) {
          nextLessonDetails = {
            moduleId: nextUnlockedModule.module.id,
            moduleTitle: nextUnlockedModule.module.title,
            lessonId: nextUnlockedModule.module.lessons[0].id,
            lessonTitle: nextUnlockedModule.module.lessons[0].title
          };
        }
      }

      return {
        courseId: course._id,
        title: course.title,
        level: course.level,
        overallProgress: userCourse.overallProgress || 0,
        lastAccessed: userCourse.lastAccessed,
        currentModule: currentModule,
        nextLesson: nextLessonDetails,
        hasLockedContent: course.modules.some(m => m.isLocked),
        completedModules: moduleStatuses
          .filter(status => status.isComplete)
          .map(status => ({
            id: status.module.id,
            title: status.module.title
          })),
        isAllComplete: allUnlockedModulesCompleted
      };
    });

    // Only translate if language is not English
    let coursesToReturn = formattedCourses;
    if (language !== 'en') {
      coursesToReturn = await Promise.all(
        formattedCourses.map(course => 
          translationService.translateCourseData(course, language)
        )
      );
    }

    res.status(200).json({
      status: 'success',
      data: { courses: coursesToReturn }
    });
  } catch (err) {
    console.error('Error in getUserCourses:', err);
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
    const language = req.query.language || 'en';

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
    const language = req.query.language || 'en';

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

    // Only translate if language is not English
    let eventsToReturn = events;
    if (language !== 'en') {
      eventsToReturn = await translationService.translateEvents(events, language);
    }

    res.status(200).json({
      status: 'success',
      data: { events: eventsToReturn }
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
}; 