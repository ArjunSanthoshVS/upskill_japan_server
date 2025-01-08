const Course = require('../../models/course.model');
const User = require('../../models/user.model');
const Achievement = require('../../models/achievement.model');
const translationService = require('../../utils/translationService');

// Create new course
exports.createCourse = async (req, res) => {
  try {
    const { title, description, level, modules } = req.body;

    if (!title || !description || !level || !modules) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields'
      });
    }

    const course = await Course.create({
      title,
      description,
      level,
      modules
    });

    res.status(201).json({
      status: 'success',
      data: { course }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Add new lesson to a module
exports.addLessonToModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { id, title, type, duration, content, questions } = req.body;

    // Validate required fields
    if (!id || !title || !type || !duration) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields: id, title, type, duration'
      });
    }

    // Validate lesson type
    const validTypes = ['writing', 'reading', 'vocabulary', 'grammar', 'listening', 'practice'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid lesson type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Find the course and module
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({
        status: 'error',
        message: 'Module not found'
      });
    }

    // Create new lesson object
    const newLesson = {
      id,
      title,
      type,
      duration,
      completed: false
    };

    // Add questions if provided
    if (questions && Array.isArray(questions)) {
      newLesson.questions = questions;
    }

    // Add lesson to module
    module.lessons.push(newLesson);

    // Update module progress
    module.progress = (module.lessons.filter(lesson => lesson.completed).length / module.lessons.length) * 100;

    // Update course total progress
    const totalLessons = course.modules.reduce((sum, mod) => sum + mod.lessons.length, 0);
    const completedLessons = course.modules.reduce((sum, mod) => sum + mod.lessons.filter(lesson => lesson.completed).length, 0);
    course.totalProgress = (completedLessons / totalLessons) * 100;

    // Save the updated course
    await course.save();

    res.status(201).json({
      status: 'success',
      data: {
        lesson: newLesson,
        moduleProgress: module.progress,
        totalProgress: course.totalProgress
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    res.status(200).json({
      status: 'success',
      data: { courses }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get courses by level
exports.getCoursesByLevel = async (req, res) => {
  try {
    const { level } = req.params;
    const { language } = req.query;

    const courses = await Course.find({ level });

    // If language is not specified or is English, return courses as is
    let coursesToReturn = courses;
    if (language && language !== 'en') {
      coursesToReturn = await Promise.all(
        courses.map(async (course) => {
          const courseData = course.toObject();
          const translatedCourse = await translationService.translateCourseData(courseData, language);

          // Also translate module titles and descriptions
          if (translatedCourse.modules) {
            translatedCourse.modules = await Promise.all(
              translatedCourse.modules.map(async (module) => ({
                ...module,
                title: await translationService.translate(module.title, language),
                description: await translationService.translate(module.description, language),
                lessons: await Promise.all(
                  module.lessons.map(async (lesson) => ({
                    ...lesson,
                    title: await translationService.translate(lesson.title, language)
                  }))
                )
              }))
            );
          }

          return translatedCourse;
        })
      );
    } else {
      coursesToReturn = courses.map(course => course.toObject());
    }

    res.status(200).json({
      status: 'success',
      data: { courses: coursesToReturn }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get featured courses
exports.getFeaturedCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .select('title description level modules')
      .limit(3);

    const language = req.query.language || 'en';

    // Only translate if language is not English
    let coursesToReturn = courses;
    if (language !== 'en') {
      coursesToReturn = await Promise.all(
        courses.map(course => translationService.translateCourseData(course.toObject(), language))
      );
    } else {
      coursesToReturn = courses.map(course => course.toObject());
    }

    res.status(200).json({
      status: 'success',
      data: { courses: coursesToReturn }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Search courses
exports.searchCourses = async (req, res) => {
  try {
    const { query } = req.query;
    const courses = await Course.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    });
    res.status(200).json({
      status: 'success',
      data: { courses }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get course by ID
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    const user = await User.findById(userId);
    const userCourseProgress = user.courses.find(
      c => c.course.toString() === id
    );

    const courseData = course.toObject();

    if (userCourseProgress) {
      courseData.userProgress = {
        overallProgress: userCourseProgress.overallProgress,
        moduleProgress: {}
      };

      courseData.modules = courseData.modules.map(module => {
        const moduleProgress = userCourseProgress.moduleProgress.find(
          mp => mp.moduleId === module.id
        );

        return {
          ...module,
          userProgress: moduleProgress ? {
            progress: moduleProgress.progress,
            completedLessons: moduleProgress.completedLessons
          } : {
            progress: 0,
            completedLessons: []
          }
        };
      });
    } else {
      courseData.userProgress = {
        overallProgress: 0,
        moduleProgress: {}
      };

      courseData.modules = courseData.modules.map(module => ({
        ...module,
        userProgress: {
          progress: 0,
          completedLessons: []
        }
      }));
    }

    res.status(200).json({
      status: 'success',
      data: { course: courseData }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Enroll in a course
exports.enrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if already enrolled
    const isEnrolled = user.courses.some(c => c.course.toString() === courseId);
    if (isEnrolled) {
      return res.status(400).json({
        status: 'error',
        message: 'Already enrolled in this course'
      });
    }

    // Add course to user's courses with initial progress
    user.courses.push({
      course: courseId,
      progress: 0,
      moduleProgress: course.modules.map(module => ({
        moduleId: module.id,
        progress: 0,
        completedLessons: []
      }))
    });

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Successfully enrolled in course'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Update course progress
exports.updateCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.user;
    const { progress } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const courseIndex = user.courses.findIndex(c => c.course.toString() === courseId);
    if (courseIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found in user\'s enrolled courses'
      });
    }

    user.courses[courseIndex].progress = progress;
    await user.save();

    res.status(200).json({
      status: 'success',
      data: { progress }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Helper function to update achievements based on lesson completion
const updateAchievementsForLesson = async (user, course, module, lessonId) => {
  const lesson = module.lessons.find(l => l.id === lessonId);
  if (!lesson) return;

  // Get the achievement for this level and type
  const achievement = await Achievement.findOne({
    level: course.level,
    category: lesson.type
  });

  // If no achievement found for this type, return early
  if (!achievement) return;

  // Calculate total completed lessons of this type
  const totalCompletedLessons = user.courses.reduce((total, userCourse) => {
    return total + userCourse.moduleProgress.reduce((moduleTotal, moduleProgress) => {
      const courseModule = userCourse.course.modules.find(m => m.id === moduleProgress.moduleId);
      if (!courseModule) return moduleTotal;

      return moduleTotal + moduleProgress.completedLessons.reduce((lessonTotal, completedLessonId) => {
        const completedLesson = courseModule.lessons.find(l => l.id === completedLessonId);
        if (!completedLesson || completedLesson.type !== lesson.type) return lessonTotal;
        return lessonTotal + 1;
      }, 0);
    }, 0);
  }, 0);

  // Find the user's achievement progress
  const userAchievement = user.allAchievements.find(a =>
    a.achievementId === achievement.id && !a.isCompleted
  );

  if (userAchievement) {
    // Calculate progress
    const progress = Math.min((totalCompletedLessons / achievement.requirements.value) * 100, 100);
    userAchievement.currentProgress = progress;
    userAchievement.lastUpdated = new Date();

    // Check if achievement should be completed
    if (progress === 100 && !userAchievement.isCompleted) {
      userAchievement.isCompleted = true;
      userAchievement.currentProgress = 100;
      userAchievement.completedAt = new Date();

      // Move to recent achievements
      if (user.recentAchievements.length >= 10) {
        user.recentAchievements.shift(); // Remove oldest
      }
      user.recentAchievements.push(userAchievement);

      // Remove from allAchievements
      user.allAchievements = user.allAchievements.filter(a =>
        a.achievementId !== userAchievement.achievementId
      );
    }
  }
};

// Update lesson status
exports.updateLessonStatus = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const userId = req.user.userId;
    const { completed } = req.body;

    const user = await User.findById(userId).populate('courses.course');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const courseIndex = user.courses.findIndex(c => c.course._id.toString() === courseId);
    if (courseIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found in user\'s enrolled courses'
      });
    }

    const moduleProgress = user.courses[courseIndex].moduleProgress.find(
      m => m.moduleId === moduleId
    );

    if (!moduleProgress) {
      return res.status(404).json({
        status: 'error',
        message: 'Module not found'
      });
    }

    // Get course details for progress calculation
    const course = user.courses[courseIndex].course;
    const module = course.modules.find(m => m.id === moduleId);

    // Update completed lessons
    if (completed) {
      if (!moduleProgress.completedLessons.includes(lessonId)) {
        moduleProgress.completedLessons.push(lessonId);

        // Get the achievement for this level and type
        const lesson = module.lessons.find(l => l.id === lessonId);
        if (lesson) {
          const achievement = await Achievement.findOne({
            level: course.level,
            category: lesson.type
          });

          if (achievement) {
            // Find the user's achievement progress
            const userAchievement = user.allAchievements.find(a =>
              a.achievementId === achievement.id && !a.isCompleted
            );

            if (userAchievement) {
              // Calculate total completed lessons of this type
              const totalCompletedLessons = user.courses.reduce((total, userCourse) => {
                return total + userCourse.moduleProgress.reduce((moduleTotal, moduleProgress) => {
                  const courseModule = userCourse.course.modules.find(m => m.id === moduleProgress.moduleId);
                  if (!courseModule) return moduleTotal;

                  return moduleTotal + moduleProgress.completedLessons.reduce((lessonTotal, completedLessonId) => {
                    const completedLesson = courseModule.lessons.find(l => l.id === completedLessonId);
                    if (!completedLesson || completedLesson.type !== lesson.type) return lessonTotal;
                    return lessonTotal + 1;
                  }, 0);
                }, 0);
              }, 0);

              // Update progress
              const progress = Math.min((totalCompletedLessons / achievement.requirements.value) * 100, 100);
              userAchievement.currentProgress = progress;
              userAchievement.lastUpdated = new Date();

              // Check if achievement should be completed
              if (progress === 100 && !userAchievement.isCompleted) {
                userAchievement.isCompleted = true;
                userAchievement.currentProgress = 100;
                userAchievement.completedAt = new Date();

                // Move to recent achievements
                if (user.recentAchievements.length >= 10) {
                  user.recentAchievements.shift(); // Remove oldest
                }
                user.recentAchievements.push(userAchievement);

                // Remove from allAchievements
                user.allAchievements = user.allAchievements.filter(a =>
                  a.achievementId !== userAchievement.achievementId
                );
              }
            }
          }
        }
      }

      // Find next lesson
      const currentLessonIndex = module.lessons.findIndex(l => l.id === lessonId);
      let nextLesson = null;
      let nextModule = null;

      if (currentLessonIndex < module.lessons.length - 1) {
        // Next lesson is in the same module
        nextLesson = module.lessons[currentLessonIndex + 1];
        nextModule = module;
      } else {
        // Check next module
        const currentModuleIndex = course.modules.findIndex(m => m.id === moduleId);
        if (currentModuleIndex < course.modules.length - 1) {
          nextModule = course.modules[currentModuleIndex + 1];
          nextLesson = nextModule.lessons[0];
        }
      }

      // Update next lesson in user's course data
      if (nextLesson && nextModule) {
        user.courses[courseIndex].nextLesson = {
          moduleId: nextModule.id,
          lessonId: nextLesson.id
        };
      } else {
        // Course completed
        user.courses[courseIndex].nextLesson = null;
      }
    } else {
      moduleProgress.completedLessons = moduleProgress.completedLessons.filter(
        id => id !== lessonId
      );
    }

    // Calculate module progress
    moduleProgress.progress = (moduleProgress.completedLessons.length / module.lessons.length) * 100;

    // Calculate overall course progress
    const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    const completedLessons = user.courses[courseIndex].moduleProgress.reduce(
      (acc, m) => acc + m.completedLessons.length,
      0
    );
    const overallProgress = (completedLessons / totalLessons) * 100;

    // Update both overall progress and overallProgress field
    user.courses[courseIndex].progress = overallProgress;
    user.courses[courseIndex].overallProgress = overallProgress;

    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        moduleProgress: {
          progress: moduleProgress.progress,
          completedLessons: moduleProgress.completedLessons
        },
        courseProgress: overallProgress,
        nextLesson: user.courses[courseIndex].nextLesson
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get user's course progress
exports.getUserCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    // Find the user and populate the course reference
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Find the course in user's enrolled courses
    const userCourse = user.courses.find(
      c => c.course.toString() === courseId
    );

    if (!userCourse) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found in user\'s enrolled courses'
      });
    }

    // Get the course details
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    // Format the response
    const progressData = {
      overallProgress: userCourse.overallProgress || 0,
      moduleProgress: {}
    };

    // Add module progress data
    if (userCourse.moduleProgress && Array.isArray(userCourse.moduleProgress)) {
      userCourse.moduleProgress.forEach(moduleProgress => {
        progressData.moduleProgress[moduleProgress.moduleId] = {
          progress: moduleProgress.progress || 0,
          completedLessons: moduleProgress.completedLessons || []
        };
      });
    }

    res.status(200).json({
      status: 'success',
      data: progressData
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Update module progress
exports.updateModuleProgress = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const userId = req.user.userId;
    const { completedLessons } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    const courseIndex = user.courses.findIndex(c => c.course.toString() === courseId);
    if (courseIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found in user\'s enrolled courses'
      });
    }

    // Find the module in the course
    const module = course.modules.find(m => m.id === moduleId);
    if (!module) {
      return res.status(404).json({
        status: 'error',
        message: 'Module not found'
      });
    }

    // Calculate module progress
    const totalLessons = module.lessons.length;
    const completedLessonsCount = completedLessons.length;
    const moduleProgress = (completedLessonsCount / totalLessons) * 100;

    // Update module progress in user's course data
    if (!user.courses[courseIndex].moduleProgress) {
      user.courses[courseIndex].moduleProgress = [];
    }

    const moduleProgressIndex = user.courses[courseIndex].moduleProgress.findIndex(
      m => m.moduleId === moduleId
    );

    if (moduleProgressIndex === -1) {
      user.courses[courseIndex].moduleProgress.push({
        moduleId,
        progress: moduleProgress,
        completedLessons
      });
    } else {
      user.courses[courseIndex].moduleProgress[moduleProgressIndex] = {
        moduleId,
        progress: moduleProgress,
        completedLessons
      };
    }

    // Calculate overall course progress
    const totalModules = course.modules.length;
    const totalModuleProgress = user.courses[courseIndex].moduleProgress.reduce(
      (sum, module) => sum + module.progress,
      0
    );
    const overallProgress = totalModuleProgress / totalModules;

    // Update overall course progress
    user.courses[courseIndex].progress = overallProgress;

    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        moduleProgress,
        overallProgress,
        completedLessons
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get lesson content
exports.getLessonContent = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const userId = req.user.userId;
    const language = req.query.language || 'en';

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    // Find the module
    const module = course.modules.find(m => m.id === moduleId);
    if (!module) {
      return res.status(404).json({
        status: 'error',
        message: 'Module not found'
      });
    }

    // Find the lesson
    const lesson = module.lessons.find(l => l.id === lessonId);
    if (!lesson) {
      return res.status(404).json({
        status: 'error',
        message: 'Lesson not found'
      });
    }

    // Get user's progress for this lesson
    const user = await User.findById(userId);
    const userCourse = user.courses.find(c => c.course.toString() === courseId);
    const moduleProgress = userCourse?.moduleProgress?.find(m => m.moduleId === moduleId);
    const isCompleted = moduleProgress?.completedLessons?.includes(lessonId) || false;

    // Format the lesson content
    const lessonContent = {
      title: lesson.title,
      content: lesson.content,
      questions: lesson.questions.map(q => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer
      })),
      isCompleted,
      type: lesson.type,
      duration: lesson.duration
    };

    // Only translate if language is not English
    const finalContent = language !== 'en'
      ? await translationService.translateLessonContent(lessonContent, language)
      : lessonContent;

    res.status(200).json({
      status: 'success',
      data: {
        lesson: finalContent
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
}; 