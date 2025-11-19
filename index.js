import express from "express";
import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import cors from "cors";
import shopRoute from "./routes/shop.route.js";
import itemRoutes from "./routes/item.route.js";
import cartRoute from './routes/cart.route.js';
import orderRoute from "./routes/order.route.js";
import deliveryRoute from "./routes/delivery.route.js";
import ownerVerificationRoute from "./routes/ownerVerification.routes.js";

const app = express();

const port = process.env.PORT || 7272;

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174","https://zentroeat.vercel.app"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(cookieParser());
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/shop", shopRoute);
app.use("/api/item", itemRoutes);
app.use("/api/cart", cartRoute);
app.use("/api/order", orderRoute);
app.use("/api/delivery", deliveryRoute);
app.use("/api/owner-verification", ownerVerificationRoute);

app.get("/", (req, res) => {
  res.send("API is working");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  connectDB();
});