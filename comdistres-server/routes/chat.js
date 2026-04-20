import express from "express";
import {
  getConversation,
  getUserConversations,
  getNotifications,
  markNotificationsAsRead,
  getUnreadCount,
} from "../controllers/chatController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/conversations",           getUserConversations);
router.get("/conversation/:userId1/:userId2", getConversation);
router.get("/notifications",           getNotifications);
router.get("/unread-count",            getUnreadCount);
router.put("/notifications/read",      markNotificationsAsRead);

export default router;