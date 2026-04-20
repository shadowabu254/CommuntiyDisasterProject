import db from "../models/index.js";
const Partnership = db.Partnership;

const makeRef = () => "PTR-" + Date.now().toString(36).toUpperCase().slice(-6);

// POST /api/partnerships/apply  (public)
export const applyPartnership = async (req, res) => {
  try {
    const {
      orgType, orgName, orgWebsite, orgSize, county, country, description,
      contributions, tier, fundingAmount, timeline, duration, specificNeeds,
      contactName, contactTitle, contactEmail, contactPhone,
      altContactName, altContactEmail, howHeard,
    } = req.body;

    if (!orgType || !orgName || !county || !contactName || !contactTitle || !contactEmail || !contactPhone) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const contribStr = Array.isArray(contributions) ? contributions.join(",") : (contributions || null);

    const partner = await Partnership.create({
      orgType, orgName,
      orgWebsite:    orgWebsite    || null,
      orgSize:       orgSize       || null,
      county,
      country:       country       || "Kenya",
      description:   description   || null,
      contributions: contribStr,
      tier:          tier          || null,
      fundingAmount: fundingAmount || null,
      timeline:      timeline      || null,
      duration:      duration      || null,
      specificNeeds: specificNeeds || null,
      contactName, contactTitle, contactEmail, contactPhone,
      altContactName:  altContactName  || null,
      altContactEmail: altContactEmail || null,
      howHeard:        howHeard        || null,
      status:          "pending",
      referenceNumber: makeRef(),
    });

    // Mirror into contact_messages inbox
    await db.ContactMessage.create({
      name:    contactName,
      email:   contactEmail,
      phone:   contactPhone,
      subject: `Partnership Application — ${orgName}`,
      message: `Organisation: ${orgName} (${orgType})\nCounty: ${county}\nContributions: ${contribStr || "—"}\nTier: ${tier || "Not selected"}\nContact: ${contactName}, ${contactTitle}\nRef: ${partner.referenceNumber}`,
      type:   "partnership",
      status: "new",
    });

    res.status(201).json({
      message: "Partnership application submitted successfully",
      referenceNumber: partner.referenceNumber,
      partnership: partner,
    });
  } catch (error) {
    console.error("applyPartnership error:", error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/partnerships  (admin/coordinator)
export const getPartnerships = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;

    const partners = await Partnership.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [{
        model: db.User, as: "approver",
        attributes: ["id","name","email"],
        required: false,
      }],
    });
    res.json(partners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/partnerships/:id
export const getPartnershipById = async (req, res) => {
  try {
    const p = await Partnership.findByPk(req.params.id, {
      include: [{ model: db.User, as: "approver", attributes: ["id","name","email"], required: false }],
    });
    if (!p) return res.status(404).json({ error: "Partnership not found" });
    res.json(p);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/partnerships/:id/status  (admin/coordinator)
export const updatePartnershipStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const p = await Partnership.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: "Partnership not found" });
    const updates = {
      status,
      adminNotes: adminNotes !== undefined ? adminNotes : p.adminNotes,
      approvedBy: req.user?.id || null,
    };
    if (status === "active") updates.approvedAt = new Date();
    await p.update(updates);
    res.json(p);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/partnerships/:id  (admin)
export const deletePartnership = async (req, res) => {
  try {
    const p = await Partnership.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: "Not found" });
    await p.destroy();
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};