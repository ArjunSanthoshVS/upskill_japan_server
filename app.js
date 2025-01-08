const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const config = require('./config/config');
const adminRoutes = require('./routes/admin/admin.routes');
const authRoutes = require('./routes/user/auth.routes');
const homeRoutes = require('./routes/user/home.routes');
const courseRoutes = require('./routes/user/course.routes');
const profileRoutes = require('./routes/user/profile.routes');
const classRoutes = require('./routes/user/class.routes');
const communityRoutes = require('./routes/user/community.routes');
const studygroupRoutes = require('./routes/admin/studygroup.routes');
const forumRoutes = require('./routes/admin/forum.routes');
const dashboardRoutes = require('./routes/admin/dashboard.routes');
const liveclassRoutes = require('./routes/admin/liveclass.routes');
const userManagementRoutes = require('./routes/admin/user.routes');
const courseAdminRoutes = require('./routes/admin/course.routes');
const goalRoutes = require('./routes/user/goal.routes');
const progressRoutes = require('./routes/user/progress.routes');
const achievementRoutes = require('./routes/user/achievement.routes');
const streakRoutes = require('./routes/user/streak.routes');

const socketHandler = require('./socket/chat');
const path = require('path');
const fs = require('fs');
const ensureUploadDirs = require('./utils/ensureUploadDirs');

const app = express();

// Ensure upload directories exist
ensureUploadDirs();

// Initialize Socket.IO with the server

// Connect to MongoDB
mongoose.connect(config.mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: false // Allow cross-origin resource sharing for uploads
}));

// Configure CORS
app.use(cors({
    origin: ['http://localhost:5173', 'https://upskilljapan.netlify.app', 'https://japanese-lms-features-test.netlify.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Content-Length', 'Content-Range'],
    maxAge: 86400 // 24 hours
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log(path.join(__dirname, 'public/uploads'));
// Serve static files from public directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/achievements', achievementRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/admin/courses', courseAdminRoutes);
app.use('/api/admin/forum', forumRoutes);
app.use('/api/admin/liveclass', liveclassRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/studygroups', studygroupRoutes);
app.use('/api/admin/users', userManagementRoutes);
// app.use('/api/admin/achievements', achievementRoutes);

// User routes
app.use('/api/user/achievements', achievementRoutes);
app.use('/api/user/goals', goalRoutes);
app.use('/api/user/streak', streakRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: {
            message: err.message || 'Internal server error',
            status: statusCode
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: 'Route not found',
            status: 404
        }
    });
});

const PORT = config.port;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

socketHandler.init(server);
module.exports = app;