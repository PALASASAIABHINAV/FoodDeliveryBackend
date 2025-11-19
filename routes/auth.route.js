import express from "express";
import { signUp,signIn,signOut,sendOtp,verifyOtp,resetPassword, googleAuth } from "../controllers/auth.controller.js";
const authRoute=express.Router();

authRoute.post("/signup",signUp);
authRoute.post("/signin",signIn);
authRoute.post("/signout",signOut);
authRoute.post("/send-otp",sendOtp);
authRoute.post("/verify-otp",verifyOtp);
authRoute.post("/reset-password",resetPassword);
authRoute.post("/google-auth",googleAuth);



export default authRoute;