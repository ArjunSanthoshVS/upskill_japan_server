const Course = require('../../models/course.model');
const User = require('../../models/user.model');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

// Get all courses with detailed stats
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate({
        path: 'modules.lessons',
        select: 'title type duration completed'
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

// Get course by ID with detailed stats
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate({
        path: 'modules.lessons',
        select: 'title type duration completed'
      });

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    res.status(200).json({
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

// Create new course
exports.createCourse = async (req, res) => {
  try {
    const { title, description, level, modules } = req.body;

    // Validate required fields
    if (!title || !description || !level || !modules) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields'
      });
    }

    // Create course
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

// Update course
exports.updateCourse = async (req, res) => {
  try {
    const { title, description, level, modules } = req.body;
    const courseId = req.params.id;

    const course = await Course.findByIdAndUpdate(
      courseId,
      {
        title,
        description,
        level,
        modules,
        updatedAt: Date.now()
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    res.status(200).json({
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

// Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get course statistics
exports.getCourseStats = async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    // Get enrolled users
    const enrolledUsers = await User.find({
      'enrolledCourses.courseId': courseId
    });

    // Calculate statistics
    const totalStudents = enrolledUsers.length;
    const completedLessons = enrolledUsers.reduce((total, user) => {
      const courseProgress = user.enrolledCourses.find(
        c => c.courseId.toString() === courseId
      );
      return total + (courseProgress?.completedLessons?.length || 0);
    }, 0);

    const totalLessons = course.modules.reduce(
      (total, module) => total + module.lessons.length,
      0
    );

    const stats = {
      totalStudents,
      averageProgress: totalStudents ? (completedLessons / (totalStudents * totalLessons)) * 100 : 0,
      completionRate: totalStudents ? (completedLessons / (totalStudents * totalLessons)) * 100 : 0,
      activeModules: course.modules.length
    };

    res.status(200).json({
      status: 'success',
      data: { stats }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Export course data
exports.exportCourseData = async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId).populate({
      path: 'modules.lessons',
      select: 'title type duration completed'
    });

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: path.join(__dirname, `../../temp/course_${courseId}.csv`),
      header: [
        { id: 'moduleTitle', title: 'Module' },
        { id: 'lessonTitle', title: 'Lesson' },
        { id: 'type', title: 'Type' },
        { id: 'duration', title: 'Duration (min)' },
        { id: 'completed', title: 'Completed' }
      ]
    });

    // Prepare data for CSV
    const records = [];
    course.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        records.push({
          moduleTitle: module.title,
          lessonTitle: lesson.title,
          type: lesson.type,
          duration: lesson.duration,
          completed: lesson.completed ? 'Yes' : 'No'
        });
      });
    });

    // Write CSV file
    await csvWriter.writeRecords(records);

    // Send file
    const filePath = path.join(__dirname, `../../temp/course_${courseId}.csv`);
    res.download(filePath, `course_${courseId}.csv`, (err) => {
      if (err) {
        res.status(500).json({
          status: 'error',
          message: 'Error downloading file'
        });
      }
      // Clean up temp file
      fs.unlink(filePath, () => {});
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Export all courses data
exports.exportAllCoursesData = async (req, res) => {
  try {
    const courses = await Course.find().populate({
      path: 'modules.lessons',
      select: 'title type duration completed'
    });

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: path.join(__dirname, '../../temp/all_courses.csv'),
      header: [
        { id: 'courseTitle', title: 'Course' },
        { id: 'level', title: 'Level' },
        { id: 'moduleTitle', title: 'Module' },
        { id: 'lessonTitle', title: 'Lesson' },
        { id: 'type', title: 'Type' },
        { id: 'duration', title: 'Duration (min)' },
        { id: 'completed', title: 'Completed' }
      ]
    });

    // Prepare data for CSV
    const records = [];
    courses.forEach(course => {
      course.modules.forEach(module => {
        module.lessons.forEach(lesson => {
          records.push({
            courseTitle: course.title,
            level: course.level,
            moduleTitle: module.title,
            lessonTitle: lesson.title,
            type: lesson.type,
            duration: lesson.duration,
            completed: lesson.completed ? 'Yes' : 'No'
          });
        });
      });
    });

    // Write CSV file
    await csvWriter.writeRecords(records);

    // Send file
    const filePath = path.join(__dirname, '../../temp/all_courses.csv');
    res.download(filePath, 'all_courses.csv', (err) => {
      if (err) {
        res.status(500).json({
          status: 'error',
          message: 'Error downloading file'
        });
      }
      // Clean up temp file
      fs.unlink(filePath, () => {});
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
}; 