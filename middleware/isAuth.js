import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const isAuth = (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }
    console.log("JWT_SECRET:", process.env.JWT_SECRET_KEY);
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.userId = decoded.userId;
    next();

  } catch (error) {
    console.error("Auth Error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }

    return res.status(500).json({ message: `isAuth error: ${error.message}` });
  }
};

