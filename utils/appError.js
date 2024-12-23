/**
 * Custom error class for application-specific errors
 * @extends Error
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        
        this.statusCode = statusCode;
        this.status = 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError; 