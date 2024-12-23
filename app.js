const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const config = require('./config/config');
const authRoutes = require('./routes/auth.routes');
const homeRoutes = require('./routes/home.routes');
const courseRoutes = require('./routes/course.routes');
const profileRoutes = require('./routes/profile.routes');
const classRoutes = require('./routes/class.routes');
const socketHandler = require('./socket/chat');
const path = require('path');

const app = express();

// Initialize Socket.IO with the server

// Connect to MongoDB
mongoose.connect(config.mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['Content-Type', 'Content-Length', 'Content-Range']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add specific CORS headers for audio files
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});

// Routes
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/classes', classRoutes);

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