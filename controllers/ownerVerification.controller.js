import OwnerVerification from "../models/ownerVerification.model.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {
  sendOwnerRequestMailToAdmin,
  sendOwnerApprovalMail,
  sendOwnerRejectionMail,
} from "../utils/mail.js";

// OWNER: submit verification request
export const submitOwnerVerification = async (req, res) => {
  try {
    const ownerId = req.userId;
    const {
      shopName,
      shopAddress,
      city,
      state,
      licenseNumber,
      description,
      phone,
      licenseDocBase64,
    } = req.body;

    const owner = await User.findById(ownerId);
    if (!owner || owner.role !== "owner") {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!shopName || !shopAddress || !city || !state) {
      return res.status(400).json({ message: "All required fields missing" });
    }

    // if already pending/approved, do not create again
    if (owner.ownerVerificationStatus === "pending") {
      return res
        .status(400)
        .json({ message: "Request already submitted. Please wait for admin." });
    }

    let uploadedDoc = null;
    if (licenseDocBase64 && licenseDocBase64.startsWith("data:")) {
      uploadedDoc = await uploadOnCloudinary(licenseDocBase64);
    }

    const request = await OwnerVerification.create({
      owner: ownerId,
      fullName: owner.fullName,
      email: owner.email,
      phone: phone || owner.mobile,
      shopName,
      shopAddress,
      city,
      state,
      licenseNumber,
      description,
      licenseDoc: uploadedDoc,
    });

    owner.ownerVerificationStatus = "pending";
    await owner.save();

    await sendOwnerRequestMailToAdmin(owner, request);

    res.status(201).json({
      success: true,
      message: "Verification request submitted",
      request,
    });
  } catch (error) {
    console.error("submitOwnerVerification error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ADMIN: list owner requests
export const adminGetOwnerRequests = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const requests = await OwnerVerification.find(
      status === "all" ? {} : { status }
    )
      .populate("owner", "fullName email mobile role")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error("adminGetOwnerRequests error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ADMIN: approve
export const adminApproveOwner = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await OwnerVerification.findById(id).populate(
      "owner",
      "email fullName ownerVerificationStatus"
    );
    if (!request) return res.status(404).json({ message: "Request not found" });

    const owner = await User.findById(request.owner._id);
    if (!owner) return res.status(404).json({ message: "Owner not found" });

    request.status = "approved";
    await request.save();

    owner.isVerifiedOwner = true;
    owner.ownerVerificationStatus = "approved";
    await owner.save();

    await sendOwnerApprovalMail(owner.email, owner.fullName);

    res.status(200).json({ success: true, message: "Owner approved" });
  } catch (error) {
    console.error("adminApproveOwner error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ADMIN: reject (optionally delete user)
export const adminRejectOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, deleteUser = false } = req.body;

    const request = await OwnerVerification.findById(id).populate(
      "owner",
      "email fullName"
    );
    if (!request) return res.status(404).json({ message: "Request not found" });

    const owner = await User.findById(request.owner._id);
    if (!owner) return res.status(404).json({ message: "Owner not found" });

    request.status = "rejected";
    await request.save();

    const reques = await OwnerVerification.findById(id).populate("owner");

    if (!reques) {
      return res.status(404).json({ message: "Reques not found" });
    }

    // 🔥 DELETE LICENSE DOCUMENT FROM CLOUDINARY
    if (reques.licenseDoc?.publicId) {
      try {
        await cloudinary.uploader.destroy(reques.licenseDoc.publicId);
        console.log("🔥 Deleted Cloudinary file:", reques.licenseDoc.publicId);
      } catch (err) {
        console.error("Cloudinary deletion failed:", err);
      }
    }

    // 🔥 DELETE OWNER REQUEST FROM DB
    await OwnerVerification.findByIdAndDelete(id);


    if (deleteUser) {
      await User.findByIdAndDelete(owner._id);
    } else {
      owner.isVerifiedOwner = false;
      owner.ownerVerificationStatus = "rejected";
      await owner.save();
    }

    await sendOwnerRejectionMail(owner.email, owner.fullName, reason);

    res.status(200).json({ success: true, message: "Owner rejected" });
  } catch (error) {
    console.error("adminRejectOwner error:", error);
    res.status(500).json({ message: error.message });
  }
};

