const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const classController = require('../controllers/user/classController');
const { saveAudioFile } = require('../utils/fileUpload');

let io;
const connectedUsers = new Map();
const hostStreams = new Map(); // Track admin host streams by classId
const hostStatus = new Map(); // Store class ID -> admin host status
const studyGroupUsers = new Map(); // Track users in study groups

module.exports = {
    init: (server) => {
        io = socketIO(server, {
            cors: {
                origin: ["http://localhost:5173", "https://japanese-lms-features-test.netlify.app"],
                methods: ["GET", "POST"]
            }
        });

        io.on('connection', async (socket) => {
            console.log('Socket Connected');
            
            const { userId, classId, isAdmin, studyGroupId } = socket.handshake.query;
            
            // Handle study group connections
            if (studyGroupId) {
                socket.join(`study_group_${studyGroupId}`);
                studyGroupUsers.set(socket.id, { userId, studyGroupId });
                
                // Notify others in the study group about new user
                socket.to(`study_group_${studyGroupId}`).emit('user_joined_study_group', {
                    userId,
                    socketId: socket.id
                });
            } 
            // Handle class connections
            else if (classId) {
                connectedUsers.set(socket.id, { userId, classId, isAdmin });
                socket.join(classId);

                // If connecting user is admin, update host status
                if (isAdmin === 'true') {
                    hostStatus.set(classId, true);
                    hostStreams.set(classId, socket.id);
                    socket.to(classId).emit('host-stream-available');
                }
            }
            
            // Handle host status check
            socket.on('check-host-status', ({ classId }) => {
                const isHostActive = hostStatus.get(classId) || false;
                console.log(`Admin host status check for class ${classId}: ${isHostActive}`);
                socket.emit('host-status', { isHostActive });

                // If admin host is active, notify them to send a new offer
                if (isHostActive) {
                    socket.to(classId).emit('offer-requested');
                }
            });

            // Handle host stream start (admin only)
            socket.on('host-stream-started', (classId) => {
                const userData = connectedUsers.get(socket.id);
                if (userData && userData.isAdmin === 'true') {
                    console.log(`Admin host stream started for class ${classId}`);
                    hostStatus.set(classId, true);
                    hostStreams.set(classId, socket.id);
                    socket.to(classId).emit('host-stream-available');
                }
            });

            // Handle host stream stop (admin only)
            socket.on('host-stream-stopped', (classId) => {
                const userData = connectedUsers.get(socket.id);
                if (userData && userData.isAdmin === 'true') {
                    console.log(`Admin host stream stopped for class ${classId}`);
                    hostStatus.set(classId, false);
                    hostStreams.delete(classId);
                    socket.to(classId).emit('host-stream-ended');
                }
            });

            // Handle class leaving
            socket.on('leave_class', async ({ classId, userId, isAdmin }) => {
                console.log(`User ${userId} leaving class ${classId}`);
                
                if (isAdmin === 'true') {
                    console.log('Admin host is leaving the class');
                    hostStatus.set(classId, false);
                    hostStreams.delete(classId);
                    socket.to(classId).emit('host-stream-ended');
                    
                    // Notify all users in the class that admin host has left
                    socket.to(classId).emit('class_ended', {
                        message: 'Admin host has ended the class'
                    });
                }

                // Remove user from the class room
                socket.leave(classId);
                connectedUsers.delete(socket.id);

                // Notify remaining users about the departure
                socket.to(classId).emit('user_left', {
                    userId,
                    isAdmin
                });
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                const userData = connectedUsers.get(socket.id);
                const studyGroupData = studyGroupUsers.get(socket.id);

                if (userData) {
                    // Existing class disconnect logic
                    if (userData.isAdmin === 'true') {
                        const classId = userData.classId;
                        hostStatus.set(classId, false);
                        hostStreams.delete(classId);
                        socket.to(classId).emit('host-stream-ended');
                        socket.to(classId).emit('class_ended', {
                            message: 'Admin host has disconnected'
                        });
                    }
                    socket.to(userData.classId).emit('user_left', {
                        userId: userData.userId,
                        isAdmin: userData.isAdmin
                    });
                    connectedUsers.delete(socket.id);
                }

                if (studyGroupData) {
                    // Study group disconnect logic
                    socket.to(`study_group_${studyGroupData.studyGroupId}`).emit('user_left_study_group', {
                        userId: studyGroupData.userId,
                        socketId: socket.id
                    });
                    studyGroupUsers.delete(socket.id);
                }

                console.log('Socket Disconnected');
            });

            // Handle offer request
            socket.on('request-offer', async ({ classId }) => {
                console.log(`Offer requested for class ${classId}`);
                // Notify admin host that a new student needs an offer
                socket.to(classId).emit('offer-requested');
            });

            // Handle offer (from admin host)
            socket.on('offer', (data) => {
                const userData = connectedUsers.get(socket.id);
                if (userData && userData.isAdmin === 'true') {
                    console.log(`Forwarding admin offer to students in class ${data.classId}`);
                    // Forward offer to all students in the class
                    socket.to(data.classId).emit('offer', data);
                }
            });

            // Handle answer (from students to admin)
            socket.on('answer', (data) => {
                console.log(`Forwarding answer to admin host in class ${data.classId}`);
                // Forward answer to the admin host
                socket.to(data.classId).emit('answer', data);
            });

            // Handle ICE candidate
            socket.on('ice-candidate', (data) => {
                console.log(`Forwarding ICE candidate in class ${data.classId}`);
                // Broadcast ICE candidate to other peers in the class
                socket.to(data.classId).emit('ice-candidate', data);
            });

            // Handle text messages
            socket.on('send_message', async (messageData) => {
                try {
                    console.log('Received message data:', messageData);
                    
                    if (!messageData.senderName) {
                        throw new Error('Sender name is required');
                    }
                    
                    const message = {
                        id: uuidv4(),
                        senderId: messageData.userId,
                        senderName: messageData.senderName,
                        content: messageData.message,
                        type: 'text',
                        classId: messageData.classId,
                        timestamp: new Date()
                    };
                    
                    console.log('Saving message:', message);
                    
                    const savedMessage = await classController.saveMessage({
                        senderId: messageData.userId,
                        senderName: messageData.senderName,
                        content: messageData.message,
                        type: 'text',
                        classId: messageData.classId
                    });
                    
                    console.log('Message saved successfully:', savedMessage);
                    
                    socket.to(messageData.classId).emit('receive_message', savedMessage);
                    socket.emit('receive_message', savedMessage);
                } catch (error) {
                    console.error('Error handling message:', error);
                    console.error('Message data that caused error:', messageData);
                    socket.emit('error', { message: 'Failed to send message' });
                }
            });
            
            // Handle audio messages
            socket.on('send_audio', async (messageData) => {
                try {
                    console.log('Received audio data');
                    
                    if (!messageData.senderName) {
                        throw new Error('Sender name is required');
                    }
                    
                    const audioUrl = saveAudioFile(messageData.content, messageData.senderId);
                    console.log('Audio URL:', audioUrl);
                    const message = {
                        id: uuidv4(),
                        senderId: messageData.senderId,
                        senderName: messageData.senderName,
                        content: audioUrl,
                        type: 'audio',
                        classId: messageData.classId,
                        timestamp: new Date()
                    };
                    
                    console.log('Saving audio message');
                    
                    const savedMessage = await classController.saveMessage({
                        senderId: messageData.senderId,
                        senderName: messageData.senderName,
                        content: audioUrl,
                        type: 'audio',
                        classId: messageData.classId
                    });
                    
                    console.log('Audio message saved successfully');
                    
                    socket.to(messageData.classId).emit('receive_message', savedMessage);
                    socket.emit('receive_message', savedMessage);
                } catch (error) {
                    console.error('Error handling audio message:', error);
                    socket.emit('error', { message: 'Failed to send audio message' });
                }
            });

            // Study Group Message Handler
            socket.on('study_group_message', async (messageData) => {
                try {
                    const { studyGroupId, content, sender } = messageData;
                    
                    const message = {
                        id: uuidv4(),
                        content,
                        sender,
                        studyGroupId,
                        createdAt: new Date().toISOString()
                    };
                    
                    console.log('Broadcasting study group message:', message);
                    
                    // Broadcast to all users in the study group
                    io.to(`study_group_${studyGroupId}`).emit('study_group_message', message);
                } catch (error) {
                    console.error('Error handling study group message:', error);
                    socket.emit('error', { message: 'Failed to send message to study group' });
                }
            });

            // Handle study group disconnection
            socket.on('leave_study_group', ({ studyGroupId, _id }) => {
                socket.leave(`study_group_${studyGroupId}`);
                studyGroupUsers.delete(socket.id);
                socket.to(`study_group_${studyGroupId}`).emit('user_left_study_group', {
                    _id,
                    socketId: socket.id
                });
            });

            // Handle host audio state change
            socket.on('host_audio_state', ({ classId, isEnabled }) => {
                const userData = connectedUsers.get(socket.id);
                if (userData && userData.isAdmin === 'true') {
                    console.log(`Admin host audio state changed to ${isEnabled} for class ${classId}`);
                    socket.to(classId).emit('host_audio_state', { isEnabled });
                }
            });

            // Handle host video state change
            socket.on('host_video_state', ({ classId, isEnabled }) => {
                const userData = connectedUsers.get(socket.id);
                if (userData && userData.isAdmin === 'true') {
                    console.log(`Admin host video state changed to ${isEnabled} for class ${classId}`);
                    socket.to(classId).emit('host_video_state', { isEnabled });
                }
            });
        });
    },
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    },
};
