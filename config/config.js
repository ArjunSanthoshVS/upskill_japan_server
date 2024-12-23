require('dotenv').config();

module.exports = {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGODB_URI || 'mongodb+srv://arjunsanthosh738:PRostNJiPWVlVBC8@cluster0.npbm9.mongodb.net/',
    jwtSecret: process.env.JWT_SECRET || 'upskill_japan',
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
}; 