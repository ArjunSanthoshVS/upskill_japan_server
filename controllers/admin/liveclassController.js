const Class = require('../../models/class.model');
const User = require('../../models/user.model');

// Helper function to categorize classes
const categorizeClasses = async (classes) => {
  const now = new Date();
  const result = { upcoming: [], ongoing: [], previous: [] };
  
  for (const classItem of classes) {
    if (classItem.status === 'cancelled') {
      continue;
    }

    // Convert dates to ensure proper comparison
    const startTime = new Date(classItem.startTime);
    const endTime = new Date(classItem.endTime);
    let statusChanged = false;

    // Determine the correct status based on current time
    let newStatus = classItem.status;
    if (startTime > now) {
      if (classItem.status !== 'upcoming') {
        newStatus = 'upcoming';
        statusChanged = true;
      }
      result.upcoming.push(classItem);
    } else if (endTime > now) {
      if (classItem.status !== 'ongoing') {
        newStatus = 'ongoing';
        statusChanged = true;
      }
      result.ongoing.push(classItem);
    } else {
      if (classItem.status !== 'completed') {
        newStatus = 'completed';
        statusChanged = true;
      }
      result.previous.push(classItem);
    }

    // Update the class status in database if changed
    if (statusChanged) {
      try {
        await Class.findByIdAndUpdate(classItem._id, { status: newStatus });
        classItem.status = newStatus; // Update the local object as well
      } catch (error) {
        console.error(`Error updating class status for ${classItem._id}:`, error);
      }
    }
  }

  return result;
};

// Get all live classes
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('hostId', 'name email')
      .populate('participants', 'fullName email')
      .sort({ startTime: -1 });

    if (!classes) {
      return res.status(200).json({
        upcoming: [],
        ongoing: [],
        previous: []
      });
    }

    const categorizedClasses = await categorizeClasses(classes);

    // Transform the data to match frontend expectations with null checks
    const transformClasses = (classList) => 
      classList.map(c => {
        if (!c) return null;
        const classObj = c.toObject();
        return {
          ...classObj,
          id: classObj._id,
          hostId: classObj.hostId ? {
            _id: classObj.hostId._id,
            name: classObj.hostId.name || 'Unknown',
            email: classObj.hostId.email || ''
          } : {
            _id: '',
            name: 'Unknown',
            email: ''
          },
          participants: Array.isArray(classObj.participants) ? classObj.participants.map(p => ({
            _id: p._id,
            name: p.fullName || 'Unknown',
            email: p.email || ''
          })) : []
        };
      }).filter(Boolean);

    const transformedClasses = {
      upcoming: transformClasses(categorizedClasses.upcoming),
      ongoing: transformClasses(categorizedClasses.ongoing),
      previous: transformClasses(categorizedClasses.previous)
    };

    res.status(200).json(transformedClasses);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ 
      message: 'Error fetching classes', 
      error: error.message 
    });
  }
};

// Get specific class details
exports.getClassDetails = async (req, res) => {
  try {
    const classDetails = await Class.findById(req.params.id)
      .populate({
        path: 'hostId',
        select: 'name email'
      })
      .populate({
        path: 'participants',
        select: 'fullName email'
      });

    if (!classDetails) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Transform the data to match frontend expectations
    const transformedClass = {
      ...classDetails.toObject(),
      id: classDetails._id,
      hostId: {
        _id: classDetails.hostId._id,
        name: classDetails.hostId.name,
        email: classDetails.hostId.email
      }
    };

    res.status(200).json(transformedClass);
  } catch (error) {
    console.error('Error fetching class details:', error);
    res.status(500).json({ message: 'Error fetching class details', error: error.message });
  }
};

// Create a new class
exports.createClass = async (req, res) => {
  try {
    const {
      title,
      description,
      hostId,
      startTime,
      duration,
      maxParticipants,
      meetingLink,
      level,
      materials
    } = req.body;

    // Calculate end time based on duration
    const endTime = new Date(new Date(startTime).getTime() + duration * 60000);

    const newClass = new Class({
      title,
      description,
      hostId,
      startTime,
      endTime,
      duration,
      maxParticipants,
      meetingLink,
      level,
      materials: materials || [],
      status: 'upcoming'
    });

    await newClass.save();

    const populatedClass = await Class.findById(newClass._id)
      .populate('hostId', 'fullName email');

    res.status(201).json(populatedClass);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ message: 'Error creating class', error: error.message });
  }
};

// Update class details
exports.updateClass = async (req, res) => {
  try {
    const {
      title,
      description,
      startTime,
      duration,
      maxParticipants,
      meetingLink,
      level,
      materials
    } = req.body;

    const classToUpdate = await Class.findById(req.params.id);

    if (!classToUpdate) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classToUpdate.status === 'completed') {
      return res.status(400).json({ message: 'Cannot update completed class' });
    }

    // Calculate new end time if start time or duration changed
    const endTime = startTime || duration
      ? new Date(new Date(startTime || classToUpdate.startTime).getTime() + (duration || classToUpdate.duration) * 60000)
      : classToUpdate.endTime;

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        startTime,
        endTime,
        duration,
        maxParticipants,
        meetingLink,
        level,
        materials
      },
      { new: true }
    ).populate('hostId', 'name email');

    res.status(200).json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ message: 'Error updating class', error: error.message });
  }
};

// Cancel a class
exports.cancelClass = async (req, res) => {
  try {
    const classToCancel = await Class.findById(req.params.id);

    if (!classToCancel) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classToCancel.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel completed class' });
    }

    classToCancel.status = 'cancelled';
    await classToCancel.save();

    res.status(200).json({ message: 'Class cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling class:', error);
    res.status(500).json({ message: 'Error cancelling class', error: error.message });
  }
};

// Get class analytics
exports.getClassAnalytics = async (req, res) => {
  try {
    console.log('Getting class analytics for:', req.params.id);
    const classData = await Class.findById(req.params.id)
      .populate('hostId', 'name email')
      .populate('participants', 'fullName email');

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const analytics = {
      totalParticipants: classData.participants.length,
      enrollmentRate: (classData.participants.length / classData.maxParticipants) * 100,
      status: classData.status,
      duration: classData.duration,
      startTime: classData.startTime,
      endTime: classData.endTime,
      host: classData.hostId,
      level: classData.level
    };

    res.status(200).json(analytics);
  } catch (error) {
    console.error('Error fetching class analytics:', error);
    res.status(500).json({ message: 'Error fetching class analytics', error: error.message });
  }
}; 