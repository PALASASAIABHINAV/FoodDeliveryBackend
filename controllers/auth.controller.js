import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/token.js";
import { sendOtpMail } from "../utils/mail.js";

export const signUp=async(req,res)=>{
    try {
        const {fullName,email,password,mobile,role}=req.body;
        const user=await User.findOne({email});

        if(user){
            return res.status(400).json({message:"User Already exist."});
        }

        if(password.length<6){
            return res.status(400).json({message:"Password is Weak."});
        
        }
        if(mobile.length<10){
            return res.status(400).json({message:"Mobile number is Not Correct."});
        }

        const hashPassword=await bcrypt.hash(password,10);

        const newUser=await User.create({
            fullName,
            email,
            password:hashPassword,
            mobile,
            role
        });

        const token=await generateToken(newUser._id);
        res.cookie("token",token,{
            secure:true,
            sameSite:"None",
            maxAge:7*24*60*60*1000,
            httpOnly:true
        });

        return res.status(201).json({newUser});

    } catch (error) {
        return res.status(500).json(`signup error ${error}`)
    }
}

export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User Not found." });
        }
        
        // ✅ Check if user signed up via Google (no password)
        if (!user.password) {
            return res.status(400).json({ 
                message: "Please sign in with Google" 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect Password" });
        }

        const token = await generateToken(user._id);
        res.cookie("token", token, {
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true
        });

        return res.status(200).json(user);

    } catch (error) {
        return res.status(500).json(`signin error ${error}`);
    }
};

export const  signOut=async(req,res)=>{
   try {
      res.clearCookie("token");
      return res.status(200).json({message:"logout successfully."});
   } catch (error) {
      return res.status(500).json(`signout error ${error}`);
   }
}

export const sendOtp=async(req,res)=>{
    try {
        const {email}=req.body;
        const user=await User.findOne({email});
        if(!user){
            return res.status(400).json({message:"User does not exist."});
        }
        const otp=Math.floor(1000 + Math.random() * 900000).toString();
        user.resetOtp=otp;
        user.otpExpires=Date.now()+5*60*1000;
        user.isOtpVerified=false;
        await user.save();
        await sendOtpMail(email,otp);
        return res.status(200).json({message:"Otp Send successfully"});
    } catch (error) {
        return res.status(500).json(`send otp error ${error}`);
    
    }
}

export const verifyOtp=async(req,res)=>{
    try {
        const {email,otp}=req.body;
        const user= await User.findOne({email});
        if(!user || user.resetOtp!=otp || user.otpExpires<Date.now()){
            return res.status(400).json({message:"OTP Invalid/Expired"});
        }

        user.isOtpVerified=true;
        user.resetOtp=undefined;

        user.otpExpires=undefined;
        await user.save();

        return res.status(200).json({message:"otp verify successfully."});
    } catch (error) {
        return res.status(500).json(`verify otp error ${error}`);
    }
}


export const resetPassword=async(req,res)=>{
    try {
        const {email,newPassword}=req.body;
        const user=await User.findOne({email});
        if(!user || !user.isOtpVerified){
            return res.status(400).json({message:"Otp verification required"});
        }

        const hashedPassword=await bcrypt.hash(newPassword,10);
        user.password=hashedPassword;
        user.isOtpVerified=false;
        await user.save();
        return res.status(200).json({message:"Password Changed Successfully"});
    } catch (error) {
        return res.status(500).json(`reset password error ${error}`);
    }
}


export const googleAuth = async (req, res) => {
    try {
        const { email, fullName, mobile, role, isSignUp } = req.body; // ✅ Added isSignUp flag
        
        // Check if user exists
        let user = await User.findOne({ email });
        
        // ✅ SIGN IN flow - user must exist
        if (!isSignUp) {
            if (!user) {
                return res.status(404).json({ 
                    message: "Account not found. Please sign up first.",
                    needsSignUp: true // ✅ Flag for frontend
                });
            }
            
            // Generate token for existing user
            const token = await generateToken(user._id);
            res.cookie("token", token, {
                secure: true,
                sameSite: "None",
                maxAge: 7 * 24 * 60 * 60 * 1000,
                httpOnly: true
            });
            
            return res.status(200).json({ 
                message: "Sign in successful",
                user: {
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    mobile: user.mobile
                }
            });
        }
        
        // ✅ SIGN UP flow - create new user
        if (user) {
            return res.status(400).json({ 
                message: "Account already exists. Please sign in instead.",
                needsSignIn: true // ✅ Flag for frontend
            });
        }
        
        // Validate required fields for signup
        if (!fullName || !mobile || !role) {
            return res.status(400).json({ 
                message: "Please provide all required information" 
            });
        }
        
        if (mobile.length < 10) {
            return res.status(400).json({ 
                message: "Mobile number must be at least 10 digits" 
            });
        }
        
        // Create new user
        user = await User.create({
            fullName,
            email,
            mobile,
            role,
            password: null // Google users don't have password
        });
        
        console.log("✅ New Google user created:", user.email);
        
        // Generate token
        const token = await generateToken(user._id);
        res.cookie("token", token, {
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true
        });
        
        return res.status(201).json({ 
            message: "Sign up successful",
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                mobile: user.mobile
            }
        });
        
    } catch (error) {
        console.error("❌ Google auth error:", error);
        return res.status(500).json({ message: `Google auth error: ${error.message}` });
    }
};