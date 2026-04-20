import express from "express";
import { getAllUsers, updateRole } from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.js";
import { roleCheck } from "../middleware/roleCheck.js";

const router = express.Router();

router.get("/", authenticate, roleCheck(1), getAllUsers);
router.put("/:id/role", authenticate, roleCheck(1), updateRole);

export default router;
