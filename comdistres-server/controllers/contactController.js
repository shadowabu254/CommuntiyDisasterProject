import db from "../models/index.js";

// Helper — always read from db at call time, never at module load time
const CM = () => db.ContactMessage;

// POST /api/contact/submit  (public)
export const submitContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message, type } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "name, email, subject and message are required" });
    }
    const msg = await CM().create({
      name,
      email,
      phone:   phone  || null,
      subject,
      message,
      type:    type   || "general",
      status:  "new",
    });
    res.status(201).json({
      message: "Message sent successfully! We'll get back to you soon.",
      id:      msg.id,
      data:    msg,
    });
  } catch (error) {
    console.error("submitContactMessage error:", error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/contact/messages  (admin only)
export const getContactMessages = async (req, res) => {
  try {
    const messages = await CM().findAll({
      order: [["createdAt", "DESC"]],
      include: [{
        model:      db.User,
        as:         "replier",
        attributes: ["id", "name", "email"],
        required:   false,
      }],
    });
    res.json(messages);
  } catch (error) {
    console.error("getContactMessages error:", error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/contact/messages/:id
export const getMessageById = async (req, res) => {
  try {
    const msg = await CM().findByPk(req.params.id, {
      include: [{
        model:      db.User,
        as:         "replier",
        attributes: ["id", "name", "email"],
        required:   false,
      }],
    });
    if (!msg) return res.status(404).json({ error: "Message not found" });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/contact/messages/:id/status
export const updateMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const msg = await CM().findByPk(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    await msg.update({ status });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/contact/messages/:id/reply
export const replyToMessage = async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ error: "reply text is required" });
    const msg = await CM().findByPk(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    await msg.update({
      reply,
      status:    "replied",
      repliedAt: new Date(),
      repliedBy: req.user?.id || null,
    });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/contact/messages/:id/star
export const toggleStar = async (req, res) => {
  try {
    const msg = await CM().findByPk(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    await msg.update({ starred: !msg.starred });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/contact/messages/:id  (admin only)
export const deleteMessage = async (req, res) => {
  try {
    const msg = await CM().findByPk(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    await msg.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};