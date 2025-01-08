const User = require('../../models/user.model');
const Course = require('../../models/course.model');
const OpenAI = require('openai');
const { updateDailyActivity } = require('./streakController');
const translationService = require('../../utils/translationService');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Helper function to generate goals using OpenAI
const generateGoalsWithAI = async (userData) => {
    const prompt = `As a Japanese language learning assistant, create 3 personalized daily study goals for a student with the following profile:
    - Current JLPT level: ${userData.studyLevel}
    - Study streak: ${userData.streak} days
    - Course progress: ${userData.courses.map(c => `${c.course.title}: ${c.overallProgress}%`).join(', ')}
    - Last active: ${new Date(userData.lastActive).toLocaleDateString()}

    Generate 3 specific, achievable goals in this JSON format:
    [
        {"text": "goal description", "type": "goal_type", "deadline": "time_in_hours"},
        ...
    ]
    
    Types should be one of: lesson, practice, review, speaking, writing, vocabulary.
    Each goal should be specific to their level and progress.
    Deadline should be hours from now (between 12-24).`;

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
    });

    const goalsData = JSON.parse(response.choices[0].message.content);
    return goalsData.map(goal => ({
        ...goal,
        deadline: new Date(Date.now() + goal.deadline * 60 * 60 * 1000),
        generatedAt: new Date()
    }));
};

// Helper function to translate goals
const translateGoals = async (goals, language = 'en') => {
    if (!goals || !Array.isArray(goals) || language === 'en') {
        return goals.map(goal => {
            const plainGoal = goal.toObject ? goal.toObject() : goal;
            return {
                _id: plainGoal._id,
                text: plainGoal.text,
                type: plainGoal.type,
                completed: plainGoal.completed,
                deadline: plainGoal.deadline,
                generatedAt: plainGoal.generatedAt,
                updatedAt: plainGoal.updatedAt
            };
        });
    }

    try {
        const translatedGoals = await Promise.all(goals.map(async goal => {
            const plainGoal = goal.toObject ? goal.toObject() : goal;
            
            return {
                ...plainGoal,
                text: await translationService.translate(plainGoal.text, language),
                type: await translationService.translate(plainGoal.type, language)
            };
        }));

        // Clean up the response by removing unnecessary fields
        return translatedGoals.map(goal => ({
            _id: goal._id,
            text: goal.text,
            type: goal.type,
            completed: goal.completed,
            deadline: goal.deadline,
            generatedAt: goal.generatedAt,
            updatedAt: goal.updatedAt
        }));
    } catch (error) {
        console.error('Error translating goals:', error);
        return goals;
    }
};

// Generate new daily goals
exports.generateDailyGoals = async (req, res) => {
    try {
        const language = req.query.language || 'en';
        const user = await User.findById(req.user.userId).populate('courses.course');
        
        // Check if goals were already generated today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (user.lastGoalsGenerated && new Date(user.lastGoalsGenerated) >= today) {
            const translatedGoals = await translateGoals(user.dailyGoals, language);
            return res.status(400).json({
                status: 'error',
                message: 'Daily goals were already generated today',
                data: { goals: translatedGoals }
            });
        }

        // Generate new goals
        const goals = await generateGoalsWithAI(user);

        // Update user with new goals
        user.dailyGoals = goals;
        user.lastGoalsGenerated = new Date();
        await user.save();

        // Process goals (translate if needed or convert to plain objects)
        const processedGoals = await translateGoals(goals, language);

        res.status(200).json({
            status: 'success',
            data: { goals: processedGoals }
        });
    } catch (err) {
        console.error('Error generating daily goals:', err);
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
};

// Get current daily goals
exports.getDailyGoals = async (req, res) => {
    try {
        const language = req.query.language || 'en';
        const user = await User.findById(req.user.userId).select('dailyGoals lastGoalsGenerated');
        
        // Check if goals need to be regenerated
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (!user.lastGoalsGenerated || new Date(user.lastGoalsGenerated) < today) {
            // Generate new goals if none exist for today
            const fullUser = await User.findById(req.user.userId).populate('courses.course');
            const goals = await generateGoalsWithAI(fullUser);
            
            user.dailyGoals = goals;
            user.lastGoalsGenerated = new Date();
            await user.save();
        }

        // Process goals (translate if needed or convert to plain objects)
        const processedGoals = await translateGoals(user.dailyGoals, language);

        res.status(200).json({
            status: 'success',
            data: { goals: processedGoals }
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
};

// Update goal completion status
exports.updateGoalStatus = async (req, res) => {
    try {
        const { goalId } = req.params;
        const { completed } = req.body;
        const language = req.query.language || 'en';

        // Find the user and the specific goal in one query
        const user = await User.findOne({
            _id: req.user.userId,
            'dailyGoals._id': goalId
        });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User or goal not found'
            });
        }

        // Find the goal in the dailyGoals array
        const goal = user.dailyGoals.find(g => g._id.toString() === goalId);
        
        if (!goal) {
            return res.status(404).json({
                status: 'error',
                message: 'Goal not found'
            });
        }

        // If the goal is being marked as completed and wasn't completed before
        if (completed && !goal.completed) {
            // Update daily activity and streak
            await updateDailyActivity(user._id, {
                goalsCompleted: 1
            });
        }

        // Update the goal status using findOneAndUpdate to handle versioning
        const updatedUser = await User.findOneAndUpdate(
            { 
                _id: req.user.userId,
                'dailyGoals._id': goalId
            },
            { 
                $set: { 
                    'dailyGoals.$.completed': completed,
                    'dailyGoals.$.updatedAt': new Date()
                }
            },
            { 
                new: true,
                runValidators: true
            }
        );

        if (!updatedUser) {
            return res.status(404).json({
                status: 'error',
                message: 'Failed to update goal status'
            });
        }

        // Get the updated goal and process it
        const updatedGoal = updatedUser.dailyGoals.find(g => g._id.toString() === goalId);
        const processedGoal = await translateGoals([updatedGoal], language);

        res.status(200).json({
            status: 'success',
            data: { 
                goal: processedGoal[0],
                streak: updatedUser.streak,
                longestStreak: updatedUser.longestStreak
            }
        });
    } catch (err) {
        console.error('Error updating goal status:', err);
        res.status(500).json({
            status: 'error',
            message: err.message || 'Failed to update goal status'
        });
    }
}; 