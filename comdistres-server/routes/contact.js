import express from "express";
import {
  submitContactMessage,
  getContactMessages,
  getMessageById,
  updateMessageStatus,
  replyToMessage,
  toggleStar,
  deleteMessage,
} from "../controllers/contactController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Inline admin/coordinator check — allows role 1 (admin) AND role 2 (coordinator)
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (req.user.role !== 1 && req.user.role !== 2) {
    return res.status(403).json({ error: "Admin or Coordinator access required" });
  }
  next();
};

// ── Public ─────────────────────────────────────────────────────────────────
router.post("/submit", submitContactMessage);

// ── Admin + Coordinator ────────────────────────────────────────────────────
router.get   ("/messages",            authenticate, requireAdmin, getContactMessages);
router.get   ("/messages/:id",        authenticate, requireAdmin, getMessageById);
router.put   ("/messages/:id/status", authenticate, requireAdmin, updateMessageStatus);
router.put   ("/messages/:id/reply",  authenticate, requireAdmin, replyToMessage);
router.put   ("/messages/:id/star",   authenticate, requireAdmin, toggleStar);
router.delete("/messages/:id",        authenticate, requireAdmin, deleteMessage);

export default router;