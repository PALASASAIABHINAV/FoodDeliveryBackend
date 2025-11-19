import jwt from "jsonwebtoken"

export const generateToken=async (userId)=>{
    try {
        const token=await jwt.sign({userId},process.env.JWT_SECRET_KEY,{expiresIn:"7d"});
        return token
    } catch (error) {
        console.log(error);
    }
}