import express from "express";
import { isAuth } from "../middleware/isAuth.js";
import { addItem, addItemReview, deleteItem, editItem, getItemByCity, getItemById, getItemsByShop } from "../controllers/item.controller.js";

const itemRoutes = express.Router();

itemRoutes.post('/create-item',isAuth,addItem);
itemRoutes.put('/edit-item/:itemId',isAuth,editItem);
itemRoutes.get("/shop/:shopId", isAuth, getItemsByShop);
itemRoutes.get("/:itemId", isAuth, getItemById);
itemRoutes.delete("/:itemId", isAuth, deleteItem);
itemRoutes.get("/get-items-by-city/:city", isAuth, getItemByCity);
// ⭐ User adds/updates a review for an item
itemRoutes.post("/:itemId/reviews", isAuth, addItemReview);



export default itemRoutes;