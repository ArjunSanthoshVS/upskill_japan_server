const Class = require('../models/class.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const ChatMessage = require('../models/chat.model');

// Get upcoming classes
exports.getUpcomingClasses = catchAsync(async (req, res) => {
    const classes = await Class.find({
        startTime: { $gt: new Date() },
        status: 'upcoming'
    })
        .populate('hostId', 'name email')
        .sort({ startTime: 1 });

    res.status(200).json({
        status: 'success',
        data: classes
    });
});

// Get ongoing classes
exports.getOngoingClasses = catchAsync(async (req, res) => {
    const now = new Date();
    console.log(now);
    const classes = await Class.find({
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: 'ongoing'
    })
        .populate('hostId', 'name email')
        .sort({ startTime: 1 });

    res.status(200).json({
        status: 'success',
        data: classes
    });
});

// Get previous classes
exports.getPreviousClasses = catchAsync(async (req, res) => {
    const classes = await Class.find({
        endTime: { $lt: new Date() },
        status: 'completed'
    })
        .populate('hostId', 'name email')
        .sort({ startTime: -1 });

    res.status(200).json({
        status: 'success',
        data: classes
    });
});

// Create a new class
exports.createClass = catchAsync(async (req, res) => {
    const newClass = await Class.create({
        ...req.body,
        hostId: req.user.userId
    });

    res.status(201).json({
        status: 'success',
        data: newClass
    });
});

// Join a class
exports.joinClass = catchAsync(async (req, res) => {
    const classId = req.params.id;
    const userId = req.user.userId;

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
        throw new AppError('Class not found', 404);
    }

    if (classDoc.participants.includes(userId)) {
        throw new AppError('You are already enrolled in this class', 400);
    }

    if (classDoc.participants.length >= classDoc.maxParticipants) {
        throw new AppError('Class is full', 400);
    }

    classDoc.participants.push(userId);
    await classDoc.save();

    res.status(200).json({
        status: 'success',
        message: 'Successfully joined the class'
    });
});

// Update class status
exports.updateClassStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const classDoc = await Class.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
    );

    if (!classDoc) {
        throw new AppError('Class not found', 404);
    }

    res.status(200).json({
        status: 'success',
        data: classDoc
    });
});

// Add this controller function
exports.getClassById = catchAsync(async (req, res) => {
    console.log(req.params.id);
    const classDoc = await Class.findById(req.params.id)
        .populate('hostId', 'name email');

    if (!classDoc) {
        throw new AppError('Class not found', 404);
    }

    res.status(200).json({
        status: 'success',
        data: classDoc
    });
});

// Add these new methods to the existing controller
exports.getChatMessages = async (req, res) => {
    try {
        const { classId } = req.params;
        const messages = await ChatMessage.find({ classId })
            .sort({ timestamp: 1 })
            .limit(100);
        
        // Format messages to match the frontend expected structure
        const formattedMessages = messages.map(msg => ({
            id: msg._id.toString(),
            senderId: msg.senderId,
            senderName: msg.senderName,
            content: msg.content,
            type: msg.type,
            classId: msg.classId,
            timestamp: msg.timestamp
        }));
        
        res.status(200).json(formattedMessages);
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({ message: 'Error fetching chat messages', error });
    }
};

exports.saveMessage = async (messageData) => {
    try {
        console.log('Attempting to save message with data:', messageData);
        
        if (!messageData.senderId || !messageData.senderName) {
            console.error('Missing required fields:', { 
                senderId: messageData.senderId, 
                senderName: messageData.senderName 
            });
            throw new Error('Missing required fields for message');
        }
        
        const message = new ChatMessage(messageData);
        const savedMessage = await message.save();
        
        // Format the saved message to match the frontend expected structure
        const formattedMessage = {
            id: savedMessage._id.toString(),
            senderId: savedMessage.senderId,
            senderName: savedMessage.senderName,
            content: savedMessage.content,
            type: savedMessage.type,
            classId: savedMessage.classId,
            timestamp: savedMessage.timestamp
        };
        
        console.log('Message saved successfully:', formattedMessage);
        return formattedMessage;
    } catch (error) {
        console.error('Error in saveMessage:', error);
        throw error;
    }
}; 