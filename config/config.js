require('dotenv').config();

module.exports = {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN
}; 