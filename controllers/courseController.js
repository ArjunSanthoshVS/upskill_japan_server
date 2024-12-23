const Course = require('../models/course.model');
const User = require('../models/user.model');

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
    const courses = await Course.find({ level });
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

// Get featured courses
exports.getFeaturedCourses = async (req, res) => {
  try {
    const courses = await Course.find().limit(3);
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

// Update lesson status
exports.updateLessonStatus = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const userId = req.user.userId;
    const { completed } = req.body;

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

    const moduleProgress = user.courses[courseIndex].moduleProgress.find(
      m => m.moduleId === moduleId
    );

    if (!moduleProgress) {
      return res.status(404).json({
        status: 'error',
        message: 'Module not found'
      });
    }

    // Update completed lessons
    if (completed) {
      if (!moduleProgress.completedLessons.includes(lessonId)) {
        moduleProgress.completedLessons.push(lessonId);
      }
    } else {
      moduleProgress.completedLessons = moduleProgress.completedLessons.filter(
        id => id !== lessonId
      );
    }

    // Get course details for progress calculation
    const course = await Course.findById(courseId);
    const module = course.modules.find(m => m.id === moduleId);

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
        courseProgress: overallProgress
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

    res.status(200).json({
      status: 'success',
      data: {
        lesson: lessonContent
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
}; 