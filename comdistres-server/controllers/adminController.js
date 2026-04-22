import db from "../models/index.js";
import { Op } from "sequelize";

const Report = db.Report;
const User = db.User;

// Get Analytics
export const getAnalytics = async (req, res) => {
  try {
    // Total counts
    const totalUsers = await User.count();
    const totalReports = await Report.count();
    const openReports = await Report.count({
      where: {
        status: {
          [Op.in]: ['pending', 'assigned', 'in-progress']
        }
      }
    });
    

    // Last 7 days reports
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentReports = await Report.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    // Average response time (in minutes)
    // This is a placeholder - you'll need to implement proper logic based on your requirements
    const avgResponseTime = 45; // Mock value

    // Reports by status
    const byStatus = await Report.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // Reports by disaster type
    const byType = await Report.findAll({
      attributes: [
        'disasterType',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['disasterType']
    });

    // Reports by severity
    const bySeverity = await Report.findAll({
      attributes: [
        'severity',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['severity']
    });

    // Users by role
    const byRole = await User.findAll({
      attributes: [
        'role',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['role']
    });

    res.json({
      summary: {
        users: totalUsers,
        reports: totalReports,
        openReports,
        recentReports,
        avgResponseTime
      },
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: parseInt(item.dataValues.count)
      })),
      byType: byType.map(item => ({
        type: item.disasterType,
        count: parseInt(item.dataValues.count)
      })),
      bySeverity: bySeverity.map(item => ({
        severity: item.severity,
        count: parseInt(item.dataValues.count)
      })),
      byRole: byRole.map(item => ({
        role: item.role,
        count: parseInt(item.dataValues.count)
      }))
    });
  }catch (error) {
  console.error('Analytics error:', error); // already there
  res.status(500).json({ 
    error: error.message, 
    stack: error.stack  // ✅ add this temporarily
  });
}
};

// Get Live Reports (recent 20)
export const getLiveReports = async (req, res) => {
  try {
    const reports = await Report.findAll({
      limit: 20,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    res.json(reports);
  }  catch (error) {
  console.error('Live reports error:', error);
  res.status(500).json({ 
    error: error.message, 
    stack: error.stack  // ✅ add this temporarily
  });
}
};

// Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'phone', 'role', 'isactive', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get All Reports
export const getAllReports = async (req, res) => {
  try {
    const reports = await Report.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'coordinator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update User Role
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({ role });
    res.json({ message: "Role updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Activate/Deactivate User
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newStatus = req.params.action === 'activate' ? true : false;
    await user.update({ isactive: newStatus });
    
    res.json({ message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Settings (mock for now)
export const getSettings = async (req, res) => {
  try {
    // You can store these in a settings table later
    const settings = {
      systemName: "Community Disaster Response System",
      maintenanceMode: false,
      allowRegistration: true,
      autoAssignCoordinators: false,
      notificationsEnabled: true,
      emailNotifications: true,
      smsNotifications: false,
      maxReportsPerUser: 50
    };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Settings (mock for now)
export const updateSettings = async (req, res) => {
  try {
    // Store in database later
    res.json({ message: "Settings updated successfully", settings: req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getGISAnalytics = async (req, res) => {
  try {
    // Get reports grouped by location zones
    const [locationStats] = await db.sequelize.query(`
      SELECT 
        ROUND(latitude, 2) as lat_zone,
        ROUND(longitude, 2) as lng_zone,
        COUNT(*) as report_count,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count
      FROM reports
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      GROUP BY lat_zone, lng_zone
      ORDER BY report_count DESC
      LIMIT 20
    `);

    // Get disaster type distribution by area
    const [disasterByArea] = await db.sequelize.query(`
      SELECT 
        location,
        disasterType,
        COUNT(*) as count
      FROM reports
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      GROUP BY location, disasterType
      ORDER BY count DESC
    `);

    res.json({
      hotspots: locationStats,
      disasterDistribution: disasterByArea
    });
  } catch (error) {
    console.error('GIS analytics error:', error);
    res.status(500).json({ error: error.message });
  }
};