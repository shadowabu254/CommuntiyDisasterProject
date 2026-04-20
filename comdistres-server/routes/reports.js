import express from "express";
import {
  createReport,
  getReports,
  getReportById,
  updateReport,
  assignVolunteer,
  deleteReport
} from "../controllers/reportsController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post("/", createReport);
router.get("/", getReports);
router.get("/:id", getReportById);
router.put("/:id", updateReport);
router.put("/:id/assign", assignVolunteer);
router.delete("/:id", deleteReport);

export default router;