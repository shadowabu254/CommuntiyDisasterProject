import express from "express";
import {
  applyVolunteer,
  getVolunteers,
  getVolunteerById,
  updateVolunteerStatus,
  deleteVolunteer,
} from "../controllers/volunteerController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const router = express.Router();

// ── Public — anyone can submit ─────────────────────────────────────────────
router.post("/apply", applyVolunteer);

// ── Admin / Coordinator ────────────────────────────────────────────────────
router.get("/",           authenticate, authorizeAdmin, getVolunteers);
router.get("/:id",        authenticate, authorizeAdmin, getVolunteerById);
router.put("/:id/status", authenticate, authorizeAdmin, updateVolunteerStatus);
router.delete("/:id",     authenticate, authorizeAdmin, deleteVolunteer);

export default router;