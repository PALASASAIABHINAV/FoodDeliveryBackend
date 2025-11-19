import express from "express";
import { isAuth } from './../middleware/isAuth.js';
import { addToCart, clearCart, getCart, removeFromCart, updateCartItem } from "../controllers/cart.controller.js";


const cartRoute = express.Router();

cartRoute.get("/", isAuth, getCart);
cartRoute.post("/add", isAuth, addToCart);
cartRoute.put("/update", isAuth, updateCartItem);
cartRoute.delete("/remove/:itemId", isAuth, removeFromCart);
cartRoute.delete("/clear", isAuth, clearCart);

export default cartRoute;