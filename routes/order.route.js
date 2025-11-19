import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import { getOwnerOrders, getUserOrders, placeOrder, updateOrderStatus, updateOrderStatusByDeliveryBoy, verifyDeliveryOtp } from "../controllers/order.controller.js";

const orderRoute = express.Router();

orderRoute.post('/place-order',isAuth,placeOrder);
orderRoute.get('/',isAuth,getUserOrders);
orderRoute.get('/owner',isAuth,getOwnerOrders);
orderRoute.put("/update-status", isAuth, updateOrderStatus);
orderRoute.put("/delivery/update-status", isAuth, updateOrderStatusByDeliveryBoy);
orderRoute.post("/delivery/verify-otp", isAuth, verifyDeliveryOtp);

export default orderRoute;