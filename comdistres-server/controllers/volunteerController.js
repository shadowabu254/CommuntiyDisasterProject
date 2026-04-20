import db from "../models/index.js";
const VolunteerApplication = db.VolunteerApplication;

const makeRef = () => "VOL-" + Date.now().toString(36).toUpperCase().slice(-6);

// POST /api/volunteers/apply  (public)
export const applyVolunteer = async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, idNumber, county, town, address,
      skills, otherSkills, hasVehicle, hasFirstAidCert, languages,
      availableDays, availableTimes, hoursPerMonth, startDate, remoteAvailable,
      experienceLevel, previousOrg, whyVolunteer,
      emergencyContactName, emergencyContactPhone, medicalConditions,
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !county || !whyVolunteer ||
        !emergencyContactName || !emergencyContactPhone) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    // Arrays → comma-separated strings
    const skillsStr = Array.isArray(skills)        ? skills.join(",")        : (skills        || null);
    const daysStr   = Array.isArray(availableDays)  ? availableDays.join(",") : (availableDays  || null);
    const timesStr  = Array.isArray(availableTimes) ? availableTimes.join(",") : (availableTimes || null);

    const app = await VolunteerApplication.create({
      firstName, lastName, email, phone,
      idNumber:       idNumber        || null,
      county,
      town:           town            || null,
      address:        address         || null,
      skills:         skillsStr,
      otherSkills:    otherSkills     || null,
      hasVehicle:     !!hasVehicle,
      hasFirstAidCert:!!hasFirstAidCert,
      languages:      languages       || null,
      availableDays:  daysStr,
      availableTimes: timesStr,
      hoursPerMonth:  hoursPerMonth   || null,
      startDate:      startDate       || null,
      remoteAvailable:!!remoteAvailable,
      experienceLevel:experienceLevel || "none",
      previousOrg:    previousOrg     || null,
      whyVolunteer,
      emergencyContactName,
      emergencyContactPhone,
      medicalConditions: medicalConditions || null,
      status:          "pending",
      referenceNumber: makeRef(),
    });

    // Mirror into contact_messages so it appears in the inbox
    await db.ContactMessage.create({
      name:    `${firstName} ${lastName}`,
      email, phone,
      subject: `Volunteer Application — ${firstName} ${lastName}`,
      message: `Skills: ${skillsStr || "—"}\nAvailability: ${daysStr || "—"} | ${timesStr || "—"}\nHours/month: ${hoursPerMonth || "—"}\nWhy volunteer: ${whyVolunteer}\nRef: ${app.referenceNumber}`,
      type:   "volunteer",
      status: "new",
    });

    res.status(201).json({
      message: "Application submitted successfully",
      referenceNumber: app.referenceNumber,
      application: app,
    });
  } catch (error) {
    console.error("applyVolunteer error:", error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/volunteers  (admin/coordinator)
export const getVolunteers = async (req, res) => {
  try {
    const { status, county } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (county && county !== 'all') where.county = county;

    const apps = await VolunteerApplication.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [{
        model: db.User, as: "reviewer",
        attributes: ["id","name","email"],
        required: false,
      }],
    });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/volunteers/:id
export const getVolunteerById = async (req, res) => {
  try {
    const app = await VolunteerApplication.findByPk(req.params.id, {
      include: [{ model: db.User, as: "reviewer", attributes: ["id","name","email"], required: false }],
    });
    if (!app) return res.status(404).json({ error: "Application not found" });
    res.json(app);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/volunteers/:id/status  (admin/coordinator)
export const updateVolunteerStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const app = await VolunteerApplication.findByPk(req.params.id);
    if (!app) return res.status(404).json({ error: "Application not found" });
    await app.update({
      status,
      adminNotes: adminNotes !== undefined ? adminNotes : app.adminNotes,
      reviewedBy: req.user?.id || null,
    });
    res.json(app);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/volunteers/:id  (admin)
export const deleteVolunteer = async (req, res) => {
  try {
    const app = await VolunteerApplication.findByPk(req.params.id);
    if (!app) return res.status(404).json({ error: "Application not found" });
    await app.destroy();
    res.json({ message: "Application deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};