const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Middleware to check if user is authenticated (for backward compatibility)
exports.authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No auth token found' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Add user info to request
        req.user = {
            userId: user._id,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        res.status(401).json({ message: 'Authentication failed' });
    }
};

// Middleware to check if user is authenticated (new version)
exports.isAuthenticated = exports.authenticate;

// Middleware to check if user is admin
exports.isAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const user = await User.findById(req.user.userId);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        next();
    } catch (error) {
        res.status(403).json({ message: 'Admin verification failed' });
    }
};

exports.verifyToken = (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user data to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}; 