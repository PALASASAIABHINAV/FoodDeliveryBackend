import User from "../models/user.model.js";

export const getCurrentUser=async(req,res)=>{
    try {
        const userId=req.userId;
        if(!userId){
            return res.status(401).json({message:"Unauthorized"});
        }
        const user=await User.findById(userId).select("-password");
        if(!user){
            return res.status(404).json({message:"User not found"});
        }
        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json(`get current user error ${error}`);
    }
}
export const updateUserLocation = async (req, res) => {
  try {
    const userId = req.userId;
    const { lat, lon } = req.body;

    if (!lat || !lon) {
      return res.status(400).json({ message: "Latitude and longitude required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update location
    user.location = {
      type: 'Point',
      coordinates: [lon, lat] // MongoDB expects [longitude, latitude]
    };
    user.lastLocationUpdate = new Date();

    await user.save();

    res.status(200).json({
      message: "Location updated successfully",
      location: user.location
    });
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({ message: `Failed to update location: ${error.message}` });
  }
};

export const toggleOnlineStatus = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    user.isOnline = !user.isOnline;
    await user.save();

    res.status(200).json({
      success: true,
      isOnline: user.isOnline,
      message: `You are now ${user.isOnline ? "Online" : "Offline"}`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
