import db from "../models/index.js";

const Report = db.Report;
const User = db.User;

export const createReport = async (req, res) => {
  try {
    const { title, description, disasterType, severity, location, latitude, longitude, imageUrl } = req.body;
    
    const report = await Report.create({
      title,
      description,
      disasterType,
      severity: severity || 'medium',
      status: 'Pending',
      location: location || 'Not specified',
      latitude,
      longitude,
      imageUrl,
      reporterId: req.user.id  // This matches your DB column
    });
    
    res.status(201).json(report);
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const reports = await Report.findAll({ 
      order: [["id", "DESC"]],
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    console.log(reports.data)
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getReportById = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Get report by ID error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateReport = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    await report.update(req.body);
    res.json(report);
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const assignVolunteer = async (req, res) => {
  try {
    const { volunteerId } = req.body;
    const reportId = req.params.id;

    console.log('Assigning volunteer:', { reportId, volunteerId }); // Debug log

    // Validate inputs
    if (!volunteerId) {
      return res.status(400).json({ message: "Volunteer ID is required" });
    }

    // Find the report
    const report = await Report.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Verify volunteer exists and has role 3
    const volunteer = await User.findByPk(volunteerId);
    if (!volunteer) {
      return res.status(404).json({ message: "Volunteer not found" });
    }
    if (volunteer.role !== 3) {
      return res.status(400).json({ message: "Selected user is not a volunteer" });
    }

    // Update report with volunteer assignment
    await report.update({ 
      reporterId: volunteerId,  // Assign to this volunteer
      status: 'assigned' 
    });

    res.json({ 
      message: "Volunteer assigned successfully", 
      report: await Report.findByPk(reportId, {
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'name', 'email']
          }
        ]
      })
    });
  } catch (error) {
    console.error('Assign volunteer error:', error);
    res.status(500).json({ error: error.message });
  }
};
export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    await report.destroy();
    res.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: error.message });
  }
};