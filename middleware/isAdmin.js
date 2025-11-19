import User from "../models/user.model.js";

export const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin only access" });
    }
    next();
  } catch (error) {
    console.error("isAdmin error:", error);
    res.status(500).json({ message: error.message });
  }
};
