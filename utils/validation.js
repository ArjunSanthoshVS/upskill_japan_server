const mongoose = require('mongoose');

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
exports.validateObjectId = (id) => {
    if (!id) return false;
    return mongoose.Types.ObjectId.isValid(id);
}; 