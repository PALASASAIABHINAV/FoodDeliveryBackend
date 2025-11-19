import express from "express";
import { getCurrentUser, toggleOnlineStatus, updateUserLocation } from "../controllers/user.controller.js";
import { isAuth } from "../middleware/isAuth.js";
const userRoute=express.Router();


userRoute.get("/current",isAuth,getCurrentUser);
userRoute.post("/update-location",isAuth,updateUserLocation);
userRoute.post("/toggle-online", isAuth, toggleOnlineStatus);
userRoute.get("/test", (req, res) => {
    res.send("User route is working");
});



export default userRoute;   