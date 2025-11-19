import Item from "../models/item.model.js";
import Shop from "../models/shop.model.js";
import Order from "../models/order.model.js";

import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

// ⭐ ADD: Add / update a review for an item
export const addItemReview = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // 1️⃣ Ensure item exists
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 2️⃣ Check that this user has at least one DELIVERED order containing this item
    const hasPurchased = await Order.exists({
      user: userId,
      shopOrder: {
        $elemMatch: {
          status: "DELIVERED",
          shopOrderItems: { $elemMatch: { item: itemId } },
        },
      },
    });

    if (!hasPurchased) {
      return res
        .status(403)
        .json({ message: "You can review only items you have received" });
    }

    // 3️⃣ Add or update review
    const existingIndex = item.reviews.findIndex(
      (r) => r.user.toString() === userId
    );

    if (existingIndex >= 0) {
      // update old review
      item.reviews[existingIndex].rating = rating;
      item.reviews[existingIndex].comment =
        comment ?? item.reviews[existingIndex].comment;
    } else {
      // push new review
      item.reviews.push({
        user: userId,
        rating,
        comment: comment || "",
      });
    }

    // 4️⃣ Recalculate rating summary
    if (item.reviews.length > 0) {
      const total = item.reviews.reduce((sum, r) => sum + r.rating, 0);
      item.rating.count = item.reviews.length;
      item.rating.average = total / item.reviews.length;
    } else {
      item.rating.count = 0;
      item.rating.average = 0;
    }

    await item.save();

    return res.status(200).json({
      success: true,
      message: "Review saved successfully",
      item,
    });
  } catch (error) {
    console.error("Add review error:", error);
    return res
      .status(500)
      .json({ message: `Failed to add review: ${error.message}` });
  }
};


export const addItem= async (req,res)=>{
    try {
        const {name,category,price,foodType,image,description,isAvailable }=req.body;
        const ownerId=req.userId;

        if(!ownerId){
            return res.status(401).json({message:"Unauthorized"});
        }

        const shop=await Shop.findOne({owner:ownerId});
        if(!shop){
            return res.status(404).json({message:"Shop not found"});
        }

        const uploadedImage = await uploadOnCloudinary(image);
        if (!uploadedImage) {
           return res.status(500).json({ message: "Image upload failed" });
        }

        const item=await Item.create({
            name,
            category,
            price,
            foodType,
            image:uploadedImage,
            shop:shop._id,
            description,
            isAvailable: isAvailable !== undefined ? isAvailable : true,
        });

        shop.items.push(item._id);
        await shop.save();
        await shop.populate("owner items", "-password");

        return res.status(201).json(shop);
         

    } catch (error) {
        return res.status(500).json(`Add item error: ${error}`);
    }
};



export const editItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, category, price, foodType, image, description, isAvailable  } = req.body;
    const ownerId = req.userId;

    // 1️⃣ Authorization check
    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 2️⃣ Find the owner's shop
    const shop = await Shop.findOne({ owner: ownerId });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // 3️⃣ Find the item and confirm ownership
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    if (item.shop.toString() !== shop._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this item" });
    }

    // 4️⃣ Handle image update
    let uploadedImage = null;
    if (image && image.startsWith("data:image")) {
      // Upload new image
      uploadedImage = await uploadOnCloudinary(image);
      if (!uploadedImage) {
        return res.status(500).json({ message: "Image upload failed" });
      }

      // Delete old image from Cloudinary
      if (item.image?.public_id) {
        await deleteFromCloudinary(item.image.public_id);
      }
    }

    // 5️⃣ Update fields
    item.name = name || item.name;
    item.category = category || item.category;
    item.price = price || item.price;
    item.foodType = foodType || item.foodType;
    item.description = description || item.description;
    if (typeof isAvailable === "boolean") {
  item.isAvailable = isAvailable;   // ✅
}
    if (uploadedImage) item.image = uploadedImage;

    // 6️⃣ Save and return updated item
    await item.save();

    return res.status(200).json({
      message: "Item updated successfully",
      item,
    });
  } catch (error) {
    console.error("Edit Item Error:", error);
    return res.status(500).json({ message: `Edit item error: ${error.message}` });
  }
};



export const getItemsByShop = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const items = await Item.find({ shop: shopId }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error("Error fetching items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch items",
      error: error.message,
    });
  }
};



export const getItemById = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    return res.status(200).json({ success: true, item });
  } catch (error) {
    console.error("Get Item Error:", error);
    return res.status(500).json({ message: "Failed to fetch item" });
  }
};


export const deleteItem=async(req,res)=>{
    try {
    const { itemId } = req.params;
    const ownerId = req.userId;

    // 1️⃣ Check user auth
    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 2️⃣ Find the owner's shop
    const shop = await Shop.findOne({ owner: ownerId });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // 3️⃣ Find the item
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 4️⃣ Verify that the item belongs to this shop
    if (item.shop.toString() !== shop._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this item" });
    }

    // 5️⃣ Delete image from Cloudinary (if exists)
    if (item.image?.public_id) {
      await deleteFromCloudinary(item.image.public_id);
    }

    // 6️⃣ Remove item from DB and shop list
    await Item.findByIdAndDelete(itemId);
    shop.items = shop.items.filter(id => id.toString() !== itemId);
    await shop.save();

    return res.status(200).json({
      message: "Item deleted successfully",
      itemId,
    });
  } catch (error) {
    console.error("Delete Item Error:", error);
    return res.status(500).json({ message: `Delete item error: ${error.message}` });
  }
}


export const getItemByCity=async (req,res)=>{
  try {
    const {city}=req.params;
    const shops = await Shop.find({
      city: { $regex: `^${city}$`, $options: "i" },
    }).populate("items");

    const shopIds=shops.map((shop) => shop._id);
    const items = await Item.find({
    shop: { $in: shopIds },
    isAvailable: true,            // ✅ only available items
  })
  .populate("shop")
  .sort({ createdAt: -1 });


    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json(`error while get item by city ${error}`);
  }
}