import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

export const createOrUpdateShop = async (req, res) => {
  try {
    const { name, city, state, address, image } = req.body;
    const owner = req.userId;

    const user = await User.findById(owner);
if (user.role === "owner" && !user.isVerifiedOwner) {
  return res.status(403).json({
    message:
      "Your owner account is not verified yet. Please submit verification request.",
  });
}

    // 1️⃣ Validate inputs
    if (!owner) {
      return res.status(401).json({ message: "Unauthorized: missing owner ID" });
    }
    if (!name || !city || !state || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2️⃣ Find existing shop by owner
    let shop = await Shop.findOne({ owner });

    // 3️⃣ Handle image upload (only if new base64 image provided)
    let uploadedImage = null;
    if (image && image.startsWith("data:image")) {
      uploadedImage = await uploadOnCloudinary(image);
      if (!uploadedImage) {
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    // 4️⃣ Update existing shop
   if (shop) {
    // Delete old image if new one uploaded
  if (uploadedImage && shop.image?.public_id) {
    await deleteFromCloudinary(shop.image.public_id);
  }

  shop.name = name;
  shop.city = city;
  shop.state = state;
  shop.address = address;

  // ✅ FIX: keep the old image if no new upload
  shop.image = uploadedImage || shop.image;

  await shop.save();
  await shop.populate("owner", "-password");

  return res.status(200).json({
    message: "Shop updated successfully",
    shop,
  });
}


    // 5️⃣ Create new shop
    const newShop = await Shop.create({
      name,
      city,
      state,
      address,
      owner,
      image: uploadedImage,
    });

    await newShop.populate("owner", "-password");

    return res.status(201).json({
      message: "Shop created successfully",
      shop: newShop,
    });
  } catch (error) {
    console.error("Create/Update Shop Error:", error);
    return res.status(500).json({
      message: `Shop controller error: ${error.message}`,
    });
  }
};


export const getMyShop=async (req,res)=>{
    try {
        const ownerId=req.userId;
        if(!ownerId){
            return res.status(401).json({message:"Unauthorized"});
        }

        const shop=await Shop.findOne({owner:ownerId}).populate("owner items","-password");
        if(!shop){
            return res.status(404).json({message:"Shop not found"});
        }
        return res.status(200).json(shop);
    } catch (error) {
        return res.status(500).json(`get my shop error: ${error}`);
    }
}

export const getShopByCity=async(req,res)=>{
  try {
    const { city } = req.params;
    const shops = await Shop.find({
      city: { $regex: `^${city}$`, $options: "i" },
    }).populate("items");
    if (shops.length === 0) {
      return res.status(400).json({ message: "No shops found in this city" });
    }
    return res.status(200).json(shops);

  } catch (error) {
    return res.status(500).json(`get shop by city error: ${error}`);
  }
}