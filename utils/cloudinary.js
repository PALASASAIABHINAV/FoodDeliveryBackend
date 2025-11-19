import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const uploadOnCloudinary = async (file) => {
  try {
    if (!file) throw new Error("No file provided for upload");

    const result = await cloudinary.uploader.upload(file, {
      resource_type: "auto",
      folder: "foodDeliveryApp",
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error("Cloudinary Upload Error:", error.message);
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) throw new Error("No public ID provided for deletion");

    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary Deletion Error:", error.message);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
