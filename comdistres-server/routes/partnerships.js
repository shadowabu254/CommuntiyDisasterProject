import express from "express";
import {
  applyPartnership,
  getPartnerships,
  getPartnershipById,
  updatePartnershipStatus,
  deletePartnership,
} from "../controllers/partnershipController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const router = express.Router();

// ── Public ─────────────────────────────────────────────────────────────────
router.post("/apply", applyPartnership);

// ── Admin / Coordinator ────────────────────────────────────────────────────
router.get("/",           authenticate, authorizeAdmin, getPartnerships);
router.get("/:id",        authenticate, authorizeAdmin, getPartnershipById);
router.put("/:id/status", authenticate, authorizeAdmin, updatePartnershipStatus);
router.delete("/:id",     authenticate, authorizeAdmin, deletePartnership);

export default router;