import mongoose from "mongoose";

const ownerVerificationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: String,
    email: String,
    phone: String,

    shopName: { type: String, required: true },
    shopAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },

    licenseNumber: { type: String },
    description: { type: String },

    licenseDoc: {
      url: String,
      public_id: String,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const OwnerVerification = mongoose.model(
  "OwnerVerification",
  ownerVerificationSchema
);

export default OwnerVerification;
