import express from "express";
import { createOrUpdateShop, getMyShop, getShopByCity } from "../controllers/shop.controller.js";
import { isAuth } from "../middleware/isAuth.js";
const shopRoute=express.Router();

shopRoute.post("/create-edit",isAuth,createOrUpdateShop);
shopRoute.get("/my-shop",isAuth,getMyShop);
shopRoute.get("/get-shop-by-city/:city",isAuth,getShopByCity);

export default shopRoute;