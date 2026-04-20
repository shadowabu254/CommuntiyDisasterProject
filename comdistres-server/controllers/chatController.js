import db from "../models/index.js";
import { Op } from "sequelize";

// GET /api/chat/conversation/:userId1/:userId2
// Returns all messages between two users, oldest first
export const getConversation = async (req, res) => {
  try {
    const u1 = parseInt(req.params.userId1, 10);
    const u2 = parseInt(req.params.userId2, 10);

    const messages = await db.Message.findAll({
      where: {
        [Op.or]: [
          { senderId: u1, receiverId: u2 },
          { senderId: u2, receiverId: u1 },
        ],
      },
      order: [["createdAt", "ASC"]],
      include: [
        { model: db.User, as: "sender",   attributes: ["id", "name", "email"] },
        { model: db.User, as: "receiver", attributes: ["id", "name", "email"] },
      ],
    });

    res.json(messages);
  } catch (err) {
    console.error("getConversation error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/chat/conversations
// Returns the latest message per unique conversation partner for the logged-in user
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all unique partner IDs
    const [rows] = await db.sequelize.query(
      `SELECT DISTINCT
         CASE WHEN senderId = :uid THEN receiverId ELSE senderId END AS partnerId
       FROM messages
       WHERE senderId = :uid OR receiverId = :uid`,
      { replacements: { uid: userId } }
    );

    const partnerIds = rows.map(r => r.partnerId);

    // For each partner get the latest message + unread count
    const convos = await Promise.all(partnerIds.map(async (partnerId) => {
      const lastMsg = await db.Message.findOne({
        where: {
          [Op.or]: [
            { senderId: userId,    receiverId: partnerId },
            { senderId: partnerId, receiverId: userId    },
          ],
        },
        order: [["createdAt", "DESC"]],
      });

      const unreadCount = await db.Message.count({
        where: {
          senderId:   partnerId,
          receiverId: userId,
          status:     { [Op.ne]: "read" },
        },
      });

      const partner = await db.User.findByPk(partnerId, {
        attributes: ["id", "name", "email", "role"],
      });

      return {
        partner,
        lastMessage:     lastMsg?.message   || null,
        lastMessageTime: lastMsg?.createdAt || null,
        unreadCount,
      };
    }));

    // Sort newest first
    convos.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    res.json(convos);
  } catch (err) {
    console.error("getUserConversations error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/chat/notifications
export const getNotifications = async (req, res) => {
  try {
    const [notifications] = await db.sequelize.query(
      `SELECT * FROM notifications WHERE userId = :uid ORDER BY createdAt DESC LIMIT 50`,
      { replacements: { uid: req.user.id } }
    );
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/chat/notifications/read
export const markNotificationsAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (!notificationIds?.length) return res.json({ message: "Nothing to update" });
    await db.sequelize.query(
      `UPDATE notifications SET isRead = TRUE WHERE id IN (:ids)`,
      { replacements: { ids: notificationIds } }
    );
    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/chat/unread-count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await db.Message.count({
      where: { receiverId: req.user.id, status: { [Op.ne]: "read" } },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};