const express = require('express');
const router = express.Router();
const {authenticate } = require('../../middleware/auth');
const { getProgressData } = require('../../controllers/user/progressController');

router.get('/', authenticate, getProgressData);

module.exports = router; 