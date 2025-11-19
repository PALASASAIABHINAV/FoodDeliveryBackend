import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import { isAdmin } from "../middleware/isAdmin.js";
import { adminApproveOwner, adminGetOwnerRequests, adminRejectOwner, submitOwnerVerification } from "../controllers/ownerVerification.controller.js";

const router = express.Router();

// OWNER
router.post("/request", isAuth, submitOwnerVerification);

// ADMIN
router.get("/admin/requests", isAuth, isAdmin, adminGetOwnerRequests);
router.put("/admin/requests/:id/approve", isAuth, isAdmin, adminApproveOwner);
router.put("/admin/requests/:id/reject", isAuth, isAdmin, adminRejectOwner);

export default router;
