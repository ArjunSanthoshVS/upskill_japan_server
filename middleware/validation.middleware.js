const Joi = require('joi');

const registerValidation = (req, res, next) => {
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

const loginValidation = (req, res, next) => {
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

module.exports = {
    registerValidation,
    loginValidation
}; 