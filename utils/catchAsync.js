/**
 * Wraps an async function and catches any errors, passing them to the next middleware
 * @param {Function} fn - The async function to wrap
 * @returns {Function} Express middleware function
 */
const catchAsync = fn => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = catchAsync; 