const express = require('express');
const router = express.Router();
const authController = require('../../controllers/user/auth.controller');
const { registerValidation, loginValidation } = require('../../middleware/validation.middleware');

// Register route
router.post('/register', registerValidation, authController.register);

// Login route
router.post('/login', loginValidation, authController.login);

module.exports = router; 