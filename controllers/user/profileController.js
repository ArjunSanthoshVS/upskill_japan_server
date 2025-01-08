const User = require('../../models/user.model');
const Course = require('../../models/course.model');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Get user profile details
exports.getProfileDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('courses.course');

    const stats = {
      streak: user.streak || 0,
      totalStudyTime: 0,
      completedLessons: 0,
      studyLevel: user.studyLevel || 'N5'
    };

    // Calculate total study time based on completed lessons' duration
    user.courses.forEach(course => {
      if (course.course && course.course.modules) {
        // For each module in the course
        course.moduleProgress.forEach(moduleProgress => {
          const module = course.course.modules.find(m => m.id === moduleProgress.moduleId);
          if (module && module.lessons) {
            // Get completed lessons for this module
            moduleProgress.completedLessons.forEach(completedLessonId => {
              const lesson = module.lessons.find(l => l.id === completedLessonId);
              if (lesson) {
                stats.completedLessons++;
                stats.totalStudyTime += lesson.duration || 0;
              }
            });
          }
        });
      }
    });

    // Convert total study time from minutes to hours
    stats.totalStudyTime = stats.totalStudyTime / 60;

    // Study level is already in user model, no need to calculate
    stats.studyLevel = user.studyLevel;

    res.status(200).json({
      status: 'success',
      data: {
        profile: {
          fullName: user.fullName,
          email: user.email,
          nativeLanguage: user.nativeLanguage,
          interfaceLanguage: user.interfaceLanguage || 'en',
          stats,
          courses: user.courses
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message || 'Error fetching profile details'
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
    const { interfaceLanguage } = req.body;

    // Validate interface language
    if (interfaceLanguage && !['en', 'hi'].includes(interfaceLanguage)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid interface language. Only "en" and "hi" are supported.'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        interfaceLanguage
      },
      { new: true }
    ).select('interfaceLanguage studyLevel');

    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        interfaceLanguage: updatedUser.interfaceLanguage,
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message || 'Error updating language preferences'
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

// Update skill percentage
exports.updateSkillPercentage = async (req, res) => {
  try {
    const skillType = req.params.skillType; // Get skillType from URL parameter
    const { percentage } = req.body;
    const userId = req.user.userId;

    // Validate skill type
    const validSkills = ['writing', 'reading', 'speaking', 'listening', 'vocabulary', 'grammar'];
    if (!validSkills.includes(skillType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid skill type'
      });
    }

    // Validate percentage
    if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Percentage must be a number between 0 and 100'
      });
    }

    // Find user and update the skill
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Initialize skills object if it doesn't exist
    if (!user.skills) {
      user.skills = {};
    }

    // Update the specific skill and lastUpdated timestamp
    user.skills[skillType] = percentage;
    user.skills.lastUpdated = new Date();

    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        skills: user.skills
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

exports.generateStudyRecommendations = async (req, res) => {
  try {
    const { completedLessonId, nextLessonDetails } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!userId || !completedLessonId || !nextLessonDetails) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Find the user and their course details
    const user = await User.findById(userId).populate({
      path: 'courses.course',
      populate: {
        path: 'modules',
        populate: {
          path: 'lessons'
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get the completed lesson and next lesson details
    const userCourse = user.courses.find(c =>
      c.moduleProgress.some(m =>
        m.completedLessons.includes(completedLessonId) ||
        m.moduleId === nextLessonDetails.moduleId
      )
    );

    if (!userCourse || !userCourse.course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Find the completed lesson and next lesson details from the course
    let completedLesson, nextLesson;

    // Search through all modules and their lessons
    for (const module of userCourse.course.modules) {

      if (Array.isArray(module.lessons)) {
        for (const lesson of module.lessons) {

          // Compare using lesson.id instead of _id
          if (lesson.id === completedLessonId) {
            completedLesson = lesson;
          }

          // Compare module.id and lesson.id instead of _id
          if (module.id === nextLessonDetails.moduleId &&
            lesson.id === nextLessonDetails.lessonId) {
            nextLesson = lesson;
          }
        }
      } else {
        console.log('Module lessons is not an array:', typeof module.lessons);
      }
    }

    if (!completedLesson || !nextLesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson details not found'
      });
    }

    // Get user's current skills
    const currentSkills = user.skills || {};

    // Generate AI recommendations using OpenAI
    const prompt = {
      role: "system",
      content: `You are a Japanese language learning assistant. Generate 3 study recommendations based on the following information. Return ONLY a valid JSON array.

Current Learning Status:
- Completed Lesson: ${completedLesson.title} (Type: ${completedLesson.type})
- Next Lesson: ${nextLesson.title} (Type: ${nextLesson.type})
- Current Skills: Writing: ${currentSkills.writing || 0}%, Reading: ${currentSkills.reading || 0}%, Speaking: ${currentSkills.speaking || 0}%, Listening: ${currentSkills.listening || 0}%, Vocabulary: ${currentSkills.vocabulary || 0}%, Grammar: ${currentSkills.grammar || 0}%

Return exactly 3 recommendations in this format:
[
  {
    "title": "string",
    "description": "string",
    "type": "writing|reading|speaking|listening|vocabulary|grammar",
    "priority": "high|medium|low",
    "reason": "string",
    "status": "pending"
  }
]`
    };

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a Japanese language learning assistant. Always respond with valid JSON only."
          },
          prompt
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      let recommendations;
      try {
        // Try to parse the AI response
        const aiResponse = JSON.parse(completion.choices[0].message.content);

        // Convert single object to array if needed
        const recommendationsArray = Array.isArray(aiResponse) ?
          aiResponse :
          aiResponse.recommendations ?
            aiResponse.recommendations :
            [aiResponse]; // If it's a single object, wrap it in array

        // Validate and format recommendations
        recommendations = recommendationsArray
          .filter(rec => rec && rec.title && rec.description) // Ensure valid objects
          .map(rec => ({
            title: String(rec.title).substring(0, 100),
            description: String(rec.description).substring(0, 150),
            type: rec.type || completedLesson.type, // Fallback to lesson type if missing
            priority: rec.priority || "medium",
            reason: String(rec.reason || "Practice recommendation").substring(0, 100),
            status: "pending"
          }))
          .slice(0, 3); // Ensure we only take 3 recommendations

        // If we don't have enough recommendations, add fallback ones
        while (recommendations.length < 3) {
          recommendations.push({
            title: recommendations.length === 0 ? "Review Current Lesson" :
              recommendations.length === 1 ? "Prepare for Next Lesson" :
                "Combined Practice",
            description: recommendations.length === 0 ?
              `Practice ${completedLesson.title} content thoroughly` :
              recommendations.length === 1 ?
                `Preview ${nextLesson.title} material` :
                "Practice both current and upcoming materials",
            type: recommendations.length === 1 ? nextLesson.type : completedLesson.type,
            priority: recommendations.length === 0 ? "high" : "medium",
            reason: recommendations.length === 0 ?
              "Reinforces current lesson content" :
              recommendations.length === 1 ?
                "Prepares for upcoming lesson" :
                "Bridges the gap between lessons",
            status: "pending"
          });
        }

      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);

        // Fallback recommendations if parsing fails
        recommendations = [
          {
            title: "Review Writing Practice",
            description: `Practice writing ${completedLesson.title} characters repeatedly to build muscle memory`,
            type: completedLesson.type,
            priority: "high",
            reason: "Reinforces the completed lesson content",
            status: "pending"
          },
          {
            title: "Prepare for Next Lesson",
            description: `Preview ${nextLesson.title} content to prepare for upcoming material`,
            type: nextLesson.type,
            priority: "medium",
            reason: "Helps build foundation for next lesson",
            status: "pending"
          },
          {
            title: "Combined Practice",
            description: "Practice both current and upcoming lesson materials together",
            type: completedLesson.type,
            priority: "medium",
            reason: "Bridges the gap between lessons",
            status: "pending"
          }
        ];
      }

      // Clear existing recommendations and add new ones
      user.studyRecommendations = recommendations;
      user.lastRecommendationGenerated = new Date();
      await user.save();

      return res.status(200).json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Error generating study recommendations:', error);
      return res.status(500).json({
        success: false,
        message: 'Error generating study recommendations'
      });
    }
  } catch (error) {
    console.error('Error generating study recommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating study recommendations'
    });
  }
};
