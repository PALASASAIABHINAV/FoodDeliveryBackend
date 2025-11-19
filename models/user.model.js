import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: false
  },
  mobile: {
    type: String,
    required: true
  },
  resetOtp: {
    type: String,
  },
  isOtpVerified: {
    type: Boolean,
    default: false
  },
  otpExpires: {
    type: Date
  },
  // ✅ Add location fields for delivery boys
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  lastLocationUpdate: {
    type: Date,
    default: null
  },
    // 💰 Delivery boy wallet & earnings
  walletBalance: {
    type: Number,
    default: 0,
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  todayEarnings: {
    type: Number,
    default: 0,
  },
  earningsLastReset: {
    type: Date,
  },
  isOnline: {
  type: Boolean,
  default: true,
},
role: {
  type: String,
  enum: ["user", "owner", "deliveryBoy", "admin"],
  required: true
},

// ✔ owner verification flags
isVerifiedOwner: {
  type: Boolean,
  default: false,
},
ownerVerificationStatus: {
  type: String,
  enum: ["none", "pending", "approved", "rejected"],
  default: "none",
},




}, { timestamps: true });

// ✅ Add geospatial index for location queries
userSchema.index({ location: '2dsphere' });

const User = mongoose.model("User", userSchema);
export default User;