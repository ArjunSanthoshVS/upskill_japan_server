const StudyGroup = require('../../models/studygroup.model');

// Create study group
exports.createStudyGroup = async (req, res) => {
    try {
        const { name, description, category, nextMeeting } = req.body;
        
        const studyGroup = new StudyGroup({
            name,
            description,
            category,
            nextMeeting: {
                date: nextMeeting?.date || null,
                topic: nextMeeting?.topic || '',
                meetingLink: nextMeeting?.meetingLink || ''
            },
            admin: req.user.adminId,
            members: []
        });

        await studyGroup.save();
        res.status(201).json({ success: true, data: studyGroup });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update study group
exports.updateStudyGroup = async (req, res) => {
    try {
        const { name, description, category, nextMeeting, isActive } = req.body;
        
        const updateData = {
            ...(name && { name }),
            ...(description && { description }),
            ...(category && { category }),
            ...(isActive !== undefined && { isActive }),
            ...(nextMeeting && {
                nextMeeting: {
                    date: nextMeeting.date || null,
                    topic: nextMeeting.topic || '',
                    meetingLink: nextMeeting.meetingLink || ''
                }
            }),
            updatedAt: new Date()
        };

        const studyGroup = await StudyGroup.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        if (!studyGroup) {
            return res.status(404).json({ success: false, message: 'Study group not found' });
        }

        res.status(200).json({ success: true, data: studyGroup });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all study groups
exports.getAllStudyGroups = async (req, res) => {
    try {
        const { search } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const studyGroups = await StudyGroup.find(query)
            .populate('admin', 'name')
            .populate('members', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: studyGroups });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get study group by id
exports.getStudyGroupById = async (req, res) => {
    try {
        const studyGroup = await StudyGroup.findById(req.params.id)
            .populate('admin', 'name')
            .populate('members', 'name');

        if (!studyGroup) {
            return res.status(404).json({ success: false, message: 'Study group not found' });
        }

        res.status(200).json({ success: true, data: studyGroup });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete study group
exports.deleteStudyGroup = async (req, res) => {
    try {
        const studyGroup = await StudyGroup.findByIdAndDelete(req.params.id);

        if (!studyGroup) {
            return res.status(404).json({ success: false, message: 'Study group not found' });
        }

        res.status(200).json({ success: true, message: 'Study group deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}; 