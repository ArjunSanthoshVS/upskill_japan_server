const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboardController');
const { verifyToken } = require('../../middleware/auth');

// All routes are prefixed with /api/admin/dashboard
router.use(verifyToken);

// Get overall dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

// Get time series data for charts
router.get('/timeseries', dashboardController.getTimeSeriesData);

// Get recent activity
router.get('/recent-activity', dashboardController.getRecentActivity);

// Get geographic distribution
router.get('/geographic-data', dashboardController.getGeographicData);

module.exports = router; 