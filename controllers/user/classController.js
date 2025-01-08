const Class = require('../../models/class.model');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const ChatMessage = require('../../models/chat.model');
const translationService = require('../../utils/translationService');

// Helper function to translate class data
const translateClassData = async (classDoc, language) => {
    if (!classDoc || language === 'en') {
        return classDoc ? classDoc.toObject() : null;
    }

    const classObj = classDoc.toObject();
    return {
        ...classObj,
        title: await translationService.translate(classObj.title, language),
        description: await translationService.translate(classObj.description, language),
        hostId: {
            ...classObj.hostId,
            name: await translationService.translate(classObj.hostId.name, language)
        }
    };
};

// Helper function to translate multiple classes
const translateClasses = async (classes, language) => {
    if (!classes) return classes;
    if (language === 'en') {
        return classes.map(cls => cls.toObject());
    }
    return Promise.all(classes.map(cls => translateClassData(cls, language)));
};

// Helper function to update class status based on current time
const updateClassStatus = async (classDoc) => {
    const now = new Date();
    const startTime = new Date(classDoc.startTime);
    const endTime = new Date(classDoc.endTime);
    let statusChanged = false;
    let newStatus = classDoc.status;

    if (classDoc.status === 'cancelled') {
        return { statusChanged: false, newStatus };
    }

    if (startTime > now && classDoc.status !== 'upcoming') {
        newStatus = 'upcoming';
        statusChanged = true;
    } else if (startTime <= now && endTime > now && classDoc.status !== 'ongoing') {
        newStatus = 'ongoing';
        statusChanged = true;
    } else if (endTime <= now && classDoc.status !== 'completed') {
        newStatus = 'completed';
        statusChanged = true;
    }

    if (statusChanged) {
        try {
            await Class.findByIdAndUpdate(classDoc._id, { status: newStatus });
            classDoc.status = newStatus; // Update the local object
        } catch (error) {
            console.error(`Error updating class status for ${classDoc._id}:`, error);
        }
    }

    return { statusChanged, newStatus };
};

// Get upcoming classes
exports.getUpcomingClasses = catchAsync(async (req, res) => {
    const language = req.query.language || 'en';
    const now = new Date();
    const classes = await Class.find({
        startTime: { $gt: now },
        status: { $ne: 'cancelled' }
    })
        .populate('hostId', 'name email')
        .sort({ startTime: 1 });

    // Update status for each class if needed
    for (const classDoc of classes) {
        await updateClassStatus(classDoc);
    }

    // Filter again after status updates
    const upcomingClasses = classes.filter(c => c.status === 'upcoming');
    
    // Translate classes if needed
    const translatedClasses = await translateClasses(upcomingClasses, language);

    res.status(200).json({
        status: 'success',
        data: translatedClasses
    });
});

// Get ongoing classes
exports.getOngoingClasses = catchAsync(async (req, res) => {
    const language = req.query.language || 'en';
    const now = new Date();
    const classes = await Class.find({
        startTime: { $lte: now },
        endTime: { $gt: now },
        status: { $ne: 'cancelled' }
    })
        .populate('hostId', 'name email')
        .sort({ startTime: 1 });

    // Update status for each class if needed
    for (const classDoc of classes) {
        await updateClassStatus(classDoc);
    }

    // Filter again after status updates
    const ongoingClasses = classes.filter(c => c.status === 'ongoing');

    // Translate classes if needed
    const translatedClasses = await translateClasses(ongoingClasses, language);

    res.status(200).json({
        status: 'success',
        data: translatedClasses
    });
});

// Get previous classes
exports.getPreviousClasses = catchAsync(async (req, res) => {
    const language = req.query.language || 'en';
    const now = new Date();
    const classes = await Class.find({
        endTime: { $lt: now },
        status: { $ne: 'cancelled' }
    })
        .populate('hostId', 'name email')
        .sort({ startTime: -1 });

    // Update status for each class if needed
    for (const classDoc of classes) {
        await updateClassStatus(classDoc);
    }

    // Filter again after status updates
    const previousClasses = classes.filter(c => c.status === 'completed');

    // Translate classes if needed
    const translatedClasses = await translateClasses(previousClasses, language);

    res.status(200).json({
        status: 'success',
        data: translatedClasses
    });
});

// Get class by ID
exports.getClassById = catchAsync(async (req, res) => {
    const language = req.query.language || 'en';
    const classDoc = await Class.findById(req.params.id)
        .populate('hostId', 'name email');

    if (!classDoc) {
        throw new AppError('Class not found', 404);
    }

    // Translate class if needed
    const translatedClass = await translateClassData(classDoc, language);

    res.status(200).json({
        status: 'success',
        data: translatedClass
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
exports.getChatMessages = async (req, res) => {
    try {
        const { classId } = req.params;
        const messages = await ChatMessage.find({ classId })
            .sort({ timestamp: 1 })
            .limit(100);
        
        // Format messages without translation
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
        if (!messageData.senderId || !messageData.senderName) {
            console.error('Missing required fields:', { 
                senderId: messageData.senderId, 
                senderName: messageData.senderName 
            });
            throw new Error('Missing required fields for message');
        }
        
        const message = new ChatMessage(messageData);
        const savedMessage = await message.save();
        
        // Format the saved message
        const formattedMessage = {
            id: savedMessage._id.toString(),
            senderId: savedMessage.senderId,
            senderName: savedMessage.senderName,
            content: savedMessage.content,
            type: savedMessage.type,
            classId: savedMessage.classId,
            timestamp: savedMessage.timestamp
        };
        
        return formattedMessage;
    } catch (error) {
        console.error('Error in saveMessage:', error);
        throw error;
    }
}; 