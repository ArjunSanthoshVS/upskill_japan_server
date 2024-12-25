const User = require('../../models/user.model');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');

const register = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                error: 'Email already registered'
            });
        }

        // Create new user
        const user = new User(req.body);
        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            config.jwtSecret,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                nativeLanguage: user.nativeLanguage
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error in registration. Please try again later.'
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Verify password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            config.jwtSecret,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                nativeLanguage: user.nativeLanguage
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error in login. Please try again later.'
        });
    }
};

module.exports = {
    register,
    login
}; 