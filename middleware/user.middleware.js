const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = 'backend/public/uploads/forum';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// User Authentication Middleware
exports.authenticateUser = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No auth token found' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

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

// User Role Check Middleware
exports.checkRole = (roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const user = await User.findById(req.user.userId);
            if (!user || !roles.includes(user.role)) {
                return res.status(403).json({ message: 'Access denied' });
            }

            next();
        } catch (error) {
            res.status(403).json({ message: 'Role verification failed' });
        }
    };
};

// File Upload Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

exports.upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
        files: 5 // Maximum 5 files per upload
    }
});

// Multer Error Handler
exports.handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'File too large. Maximum size is 5MB.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                message: 'Too many files. Maximum is 5 files per upload.'
            });
        }
        return res.status(400).json({
            message: err.message
        });
    }
    
    if (err) {
        return res.status(400).json({
            message: err.message
        });
    }
    next();
};

// File Delete Helper
exports.deleteFiles = async (files) => {
    if (!Array.isArray(files)) return;
    
    for (const file of files) {
        const filePath = path.join(uploadDir, file.filename);
        try {
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
            }
        } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error);
        }
    }
};

// User Registration Validation
exports.validateRegistration = (req, res, next) => {
    const schema = Joi.object({
        fullName: Joi.string()
            .min(2)
            .max(50)
            .required()
            .messages({
                'string.min': 'Full name must be at least 2 characters long',
                'string.max': 'Full name cannot exceed 50 characters',
                'any.required': 'Full name is required'
            }),
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please enter a valid email',
                'any.required': 'Email is required'
            }),
        password: Joi.string()
            .min(6)
            .required()
            .pattern(new RegExp('^[a-zA-Z0-9]{6,30}$'))
            .messages({
                'string.min': 'Password must be at least 6 characters long',
                'string.pattern.base': 'Password must contain only alphanumeric characters',
                'any.required': 'Password is required'
            }),
        nativeLanguage: Joi.string()
            .max(50)
            .allow('')
            .optional()
            .messages({
                'string.max': 'Native language name cannot exceed 50 characters'
            })
    });

    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
        }));
        return res.status(400).json({ errors });
    }
    next();
};

// User Login Validation
exports.validateLogin = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please enter a valid email',
                'any.required': 'Email is required'
            }),
        password: Joi.string()
            .required()
            .messages({
                'any.required': 'Password is required'
            })
    });

    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
        }));
        return res.status(400).json({ errors });
    }
    next();
}; 