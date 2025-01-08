const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'No token provided',
                    status: 401,
                    shouldRedirect: true
                }
            });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (jwtError) {
            // Token is invalid or expired
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid or expired token',
                    status: 401,
                    shouldRedirect: true
                }
            });
        }
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: {
                message: 'Authentication failed',
                status: 401,
                shouldRedirect: true
            }
        });
    }
};

module.exports = authMiddleware; 