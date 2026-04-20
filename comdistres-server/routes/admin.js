import express from "express";
import {
  getAnalytics,
  getLiveReports,
  getAllUsers,
  getAllReports,
  updateUserRole,
  toggleUserStatus,
  getSettings,
  updateSettings,
  getGISAnalytics
} from "../controllers/adminController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const router = express.Router();

// Protect all admin routes
router.use(authenticate);
router.use(authorizeAdmin);

router.get("/analytics", getAnalytics);
router.get("/reports/live", getLiveReports);
router.get("/users", getAllUsers);
router.get("/reports", getAllReports);
router.put("/users/:id/role", updateUserRole);
router.put("/users/:id/:action", toggleUserStatus); // action: activate or deactivate
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.get("/gis-analytics", getGISAnalytics);
export default router;