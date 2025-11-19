import mongoose from "mongoose";
const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },

    price: {
      type: Number,
      min: 0,
      required: true,
    },
    foodType: {
      type: String,
      enum: ["Veg", "Non-Veg"],
      required: true,
    },
    description: {
      type: String,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    category: {
      type: String,
      enum: [
        "Snacks",
        "Main Course",
        "Dessert",
        "Pizza",
        "Sandwich",
        "South Indian",
        "North Indian",
        "Chinese",
        "Fast Food",
        "Others",
      ],
      required: true,
    },
    rating:{
      average:{
        type:Number,
        default:0
      },
      count:{
        type:Number,
        default:0
      }
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
     reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
        comment: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);
export default Item;
