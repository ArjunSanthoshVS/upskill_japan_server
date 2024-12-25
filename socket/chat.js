const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const classController = require('../controllers/user/classController');
const { saveAudioFile } = require('../utils/fileUpload');

let io;
const connectedUsers = new Map();
const hostStreams = new Map(); // Track host streams by classId
const hostStatus = new Map(); // Store class ID -> host status

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
            
            const { userId, classId, isHost } = socket.handshake.query;
            
            connectedUsers.set(socket.id, { userId, classId, isHost });
            socket.join(classId);
            
            // Handle host status check
            socket.on('check-host-status', ({ classId }) => {
                const isHostActive = hostStatus.get(classId) || false;
                console.log(`Host status check for class ${classId}: ${isHostActive}`);
                socket.emit('host-status', { isHostActive });

                // If host is active, notify them to send a new offer
                if (isHostActive) {
                    socket.to(classId).emit('offer-requested');
                }
            });

            // Handle host stream start
            socket.on('host-stream-started', (classId) => {
                console.log(`Host stream started for class ${classId}`);
                hostStatus.set(classId, true);
                hostStreams.set(classId, socket.id);
                socket.to(classId).emit('host-stream-available');
            });

            // Handle host stream stop
            socket.on('host-stream-stopped', (classId) => {
                console.log(`Host stream stopped for class ${classId}`);
                hostStatus.set(classId, false);
                hostStreams.delete(classId);
                socket.to(classId).emit('host-stream-ended');
            });

            // Handle class leaving
            socket.on('leave_class', async ({ classId, userId, isHost }) => {
                console.log(`User ${userId} leaving class ${classId}`);
                
                if (isHost === 'true') {
                    console.log('Host is leaving the class');
                    hostStatus.set(classId, false);
                    hostStreams.delete(classId);
                    socket.to(classId).emit('host-stream-ended');
                    
                    // Notify all users in the class that host has left
                    socket.to(classId).emit('class_ended', {
                        message: 'Host has ended the class'
                    });
                }

                // Remove user from the class room
                socket.leave(classId);
                connectedUsers.delete(socket.id);

                // Notify remaining users about the departure
                socket.to(classId).emit('user_left', {
                    userId,
                    isHost
                });
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                const userData = connectedUsers.get(socket.id);
                if (userData) {
                    if (userData.isHost === 'true') {
                        const classId = userData.classId;
                        hostStatus.set(classId, false);
                        hostStreams.delete(classId);
                        socket.to(classId).emit('host-stream-ended');
                        socket.to(classId).emit('class_ended', {
                            message: 'Host has disconnected'
                        });
                    }
                    socket.to(userData.classId).emit('user_left', {
                        userId: userData.userId,
                        isHost: userData.isHost
                    });
                }
                connectedUsers.delete(socket.id);
                console.log('Socket Disconnected');
            });

            // Handle offer request
            socket.on('request-offer', async ({ classId }) => {
                console.log(`Offer requested for class ${classId}`);
                // Notify host that a new student needs an offer
                socket.to(classId).emit('offer-requested');
            });

            // Handle offer
            socket.on('offer', (data) => {
                console.log(`Forwarding offer to students in class ${data.classId}`);
                // Forward offer to all students in the class
                socket.to(data.classId).emit('offer', data);
            });

            // Handle answer
            socket.on('answer', (data) => {
                console.log(`Forwarding answer to host in class ${data.classId}`);
                // Forward answer to the host
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
        });
    },
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    },
};
