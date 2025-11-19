import express from "express";
import {
  broadcastDeliveryAssignment,
  getDeliveryBoyAssignments,
  acceptAssignment,
  completeAssignment,
  getNearbyDeliveryBoys,
  getDeliveryBoyLiveLocation,
  getDeliveryStats,
  getDeliveryBoyEarnings,
  requestWithdraw
} from "../controllers/delivery.controller.js";
import { isAuth } from "../middleware/isAuth.js";

const deliveryRoute = express.Router();

// Owner routes
deliveryRoute.get("/nearby-delivery-boys", isAuth, getNearbyDeliveryBoys);
deliveryRoute.post("/broadcast", isAuth, broadcastDeliveryAssignment);

// Delivery boy routes
deliveryRoute.get("/my-assignments", isAuth, getDeliveryBoyAssignments);
deliveryRoute.post("/accept", isAuth, acceptAssignment);
deliveryRoute.post("/complete", isAuth, completeAssignment);
deliveryRoute.get("/live-location", isAuth, getDeliveryBoyLiveLocation);

// 💰 Earnings
deliveryRoute.get("/my-earnings", isAuth, getDeliveryBoyEarnings);
deliveryRoute.post("/withdraw", isAuth, requestWithdraw);


export default deliveryRoute;