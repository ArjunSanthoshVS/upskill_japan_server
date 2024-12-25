const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');
const Joi = require('joi');

// Admin Authentication Middleware
exports.authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token, authorization denied'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select('-password');
        
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Token is not valid'
            });
        }

        req.admin = admin;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token is not valid'
        });
    }
};

// Admin Login Validation
exports.validateAdminLogin = (req, res, next) => {
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

// Admin Creation Validation
exports.validateAdminCreation = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string()
            .min(2)
            .max(50)
            .required()
            .messages({
                'string.min': 'Name must be at least 2 characters long',
                'string.max': 'Name cannot exceed 50 characters',
                'any.required': 'Name is required'
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