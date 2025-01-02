const Class = require('../../models/class.model');
const User = require('../../models/user.model');

// Helper function to categorize classes
const categorizeClasses = (classes) => {
  const now = new Date();
  return classes.reduce((acc, classItem) => {
    if (classItem.status === 'cancelled') {
      return acc;
    }
    
    if (classItem.status === 'completed') {
      acc.previous.push(classItem);
    } else if (classItem.startTime > now) {
      acc.upcoming.push(classItem);
    } else if (classItem.endTime > now) {
      acc.ongoing.push(classItem);
    } else {
      // Update status to completed if not already
      if (classItem.status !== 'completed') {
        Class.findByIdAndUpdate(classItem._id, { status: 'completed' }).exec();
      }
      acc.previous.push(classItem);
    }
    return acc;
  }, { upcoming: [], ongoing: [], previous: [] });
};

// Get all live classes
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate({
        path: 'hostId',
        select: 'fullName email'
      })
      .populate({
        path: 'participants',
        select: 'fullName email'
      })
      .sort({ startTime: -1 });

    const categorizedClasses = categorizeClasses(classes);

    // Transform the data to match frontend expectations
    const transformedClasses = {
      upcoming: categorizedClasses.upcoming.map(c => ({
        ...c.toObject(),
        id: c._id,
        hostId: {
          _id: c.hostId._id,
          name: c.hostId.fullName,
          email: c.hostId.email
        }
      })),
      ongoing: categorizedClasses.ongoing.map(c => ({
        ...c.toObject(),
        id: c._id,
        hostId: {
          _id: c.hostId._id,
          name: c.hostId.fullName,
          email: c.hostId.email
        }
      })),
      previous: categorizedClasses.previous.map(c => ({
        ...c.toObject(),
        id: c._id,
        hostId: {
          _id: c.hostId._id,
          name: c.hostId.fullName,
          email: c.hostId.email
        }
      }))
    };

    res.status(200).json(transformedClasses);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Error fetching classes', error: error.message });
  }
};

// Get specific class details
exports.getClassDetails = async (req, res) => {
  try {
    const classDetails = await Class.findById(req.params.id)
      .populate({
        path: 'hostId',
        select: 'fullName email'
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
        name: classDetails.hostId.fullName,
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
    ).populate('hostId', 'fullName email');

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
      .populate('hostId', 'fullName email')
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