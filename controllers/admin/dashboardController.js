const User = require('../../models/user.model');
const Course = require('../../models/course.model');
const StudyGroup = require('../../models/studygroup.model');
const ForumPost = require('../../models/communityforum.model');

const dashboardController = {
  // Get overall dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      const [
        totalUsers,
        activeUsers,
        newUsers,
        totalCourses,
        activeCourses,
        totalGroups,
        activeGroups,
        forumStats,
        geoData
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
        User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        Course.countDocuments(),
        Course.countDocuments({ status: 'active' }),
        StudyGroup.countDocuments(),
        StudyGroup.countDocuments({ isActive: true }),
        ForumPost.aggregate([
          {
            $group: {
              _id: null,
              totalPosts: { $sum: 1 },
              totalEngagements: { $sum: { $size: '$comments' } }
            }
          }
        ]),
        User.aggregate([
          {
            $group: {
              _id: '$country',
              users: { $sum: 1 }
            }
          },
          {
            $sort: { users: -1 }
          },
          {
            $limit: 10
          }
        ])
      ]);

      // Get completed courses count from Course model
      const completedCourses = await Course.countDocuments({ totalProgress: 100 });

      // Format geographic data
      const formattedGeoData = geoData.map(item => ({
        country: item._id || 'Unknown',
        users: item.users
      }));

      const stats = {
        users: {
          total: totalUsers,
          active: activeUsers,
          new: newUsers
        },
        courses: {
          total: totalCourses,
          active: activeCourses,
          completed: completedCourses
        },
        studyGroups: {
          total: totalGroups,
          active: activeGroups
        },
        forum: {
          posts: forumStats[0]?.totalPosts || 0,
          engagement: Math.round((forumStats[0]?.totalEngagements || 0) / (forumStats[0]?.totalPosts || 1) * 100)
        },
        geographicData: {
          topCountries: formattedGeoData
        }
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
  },

  // Get time series data for charts
  getTimeSeriesData: async (req, res) => {
    try {
      const { range } = req.query;
      let dateRange;

      switch (range) {
        case 'day':
          dateRange = 1;
          break;
        case 'week':
          dateRange = 7;
          break;
        case 'month':
          dateRange = 30;
          break;
        case 'year':
          dateRange = 365;
          break;
        default:
          dateRange = 7;
      }

      const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);

      const [userStats, courseStats, postStats] = await Promise.all([
        User.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 }
            }
          }
        ]),
        Course.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 }
            }
          }
        ]),
        ForumPost.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      // Combine and format the data
      const timeSeriesData = [];
      for (let i = 0; i < dateRange; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        timeSeriesData.push({
          date: dateStr,
          users: userStats.find(stat => stat._id === dateStr)?.count || 0,
          courses: courseStats.find(stat => stat._id === dateStr)?.count || 0,
          posts: postStats.find(stat => stat._id === dateStr)?.count || 0
        });
      }

      res.json(timeSeriesData.reverse());
    } catch (error) {
      console.error('Error fetching time series data:', error);
      res.status(500).json({ message: 'Error fetching time series data' });
    }
  },

  // Get recent activity
  getRecentActivity: async (req, res) => {
    try {
      const recentActivity = [];

      // Get recent courses
      const recentCourses = await Course.find()
        .sort({ createdAt: -1 })
        .limit(5);

      // Get recent forum posts
      const forumPosts = await ForumPost.find()
        .sort({ createdAt: -1 })
        .limit(5);

      // Get recent study groups
      const studyGroups = await StudyGroup.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('admin', 'name');

      // Combine and sort activities
      recentCourses.forEach(course => {
        recentActivity.push({
          type: 'course_enrollment',
          description: `New course created: ${course.title || 'Untitled Course'}`,
          timestamp: course.createdAt
        });
      });

      forumPosts.forEach(post => {
        recentActivity.push({
          type: 'forum_post',
          description: `${post.author?.name || 'Anonymous'} created a new post: ${post.title || 'Untitled Post'}`,
          timestamp: post.createdAt
        });
      });

      studyGroups.forEach(group => {
        recentActivity.push({
          type: 'study_group',
          description: `${group.admin?.name || 'Anonymous'} created study group: ${group.name || 'Untitled Group'}`,
          timestamp: group.createdAt
        });
      });

      // Sort by timestamp and limit to 10 most recent activities
      const sortedActivity = recentActivity
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

      res.json(sortedActivity);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({ message: 'Error fetching recent activity' });
    }
  },

  // Get geographic distribution
  getGeographicData: async (req, res) => {
    try {
      const geoData = await User.aggregate([
        {
          $group: {
            _id: '$country',
            users: { $sum: 1 }
          }
        },
        {
          $sort: { users: -1 }
        },
        {
          $limit: 10
        }
      ]);

      const formattedData = geoData.map(item => ({
        country: item._id || 'Unknown',
        users: item.users
      }));

      res.json(formattedData);
    } catch (error) {
      console.error('Error fetching geographic data:', error);
      res.status(500).json({ message: 'Error fetching geographic data' });
    }
  }
};

module.exports = dashboardController; 