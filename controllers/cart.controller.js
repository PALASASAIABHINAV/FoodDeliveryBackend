import Cart from "../models/cart.model.js";
import Item from "../models/item.model.js";

// ✅ Get user's cart
// ✅ Get user's cart
export const getCart = async (req, res) => {
  try {
    const userId = req.userId;

    let cart = await Cart.findOne({ user: userId }).populate({
      path: "items.item",
      populate: { path: "shop", select: "name city" },
    });

    if (!cart) {
      // Create empty cart if doesn't exist
      cart = await Cart.create({ user: userId, items: [] });
      return res.status(200).json(cart);
    }

    // ✅ SYNC prices with latest item.price
    let changed = false;
    cart.items.forEach((cartItem) => {
      if (cartItem.item && cartItem.item.price != null && cartItem.price !== cartItem.item.price) {
        cartItem.price = cartItem.item.price;
        changed = true;
      }
    });

    if (changed) {
      await cart.save(); // pre('save') will also recalc totals
      await cart.populate({
        path: "items.item",
        populate: { path: "shop", select: "name city" },
      });
    }

    return res.status(200).json(cart);
  } catch (error) {
    console.error("Get cart error:", error);
    return res.status(500).json({ message: `Get cart error: ${error.message}` });
  }
};


// ✅ Add item to cart
export const addToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId, quantity = 1 } = req.body;

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    // Check if item exists
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
        if (item.isAvailable === false) {
      return res
        .status(400)
        .json({ message: "This item is currently unavailable" });
    }


    // Find or create cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if item already in cart
    const existingItemIndex = cart.items.findIndex(
      (cartItem) => cartItem.item.toString() === itemId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        item: itemId,
        quantity,
        price: item.price,
      });
    }

    await cart.save();
    await cart.populate({
      path: "items.item",
      populate: { path: "shop", select: "name city" },
    });

    return res.status(200).json({
      message: "Item added to cart",
      cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    return res.status(500).json({ message: `Add to cart error: ${error.message}` });
  }
};

// ✅ Update item quantity in cart
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId, quantity } = req.body;

    if (!itemId || quantity === undefined) {
      return res.status(400).json({ message: "Item ID and quantity are required" });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (cartItem) => cartItem.item.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not in cart" });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    await cart.populate({
      path: "items.item",
      populate: { path: "shop", select: "name city" },
    });

    return res.status(200).json({
      message: "Cart updated",
      cart,
    });
  } catch (error) {
    console.error("Update cart error:", error);
    return res.status(500).json({ message: `Update cart error: ${error.message}` });
  }
};

// ✅ Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (cartItem) => cartItem.item.toString() !== itemId
    );

    await cart.save();
    await cart.populate({
      path: "items.item",
      populate: { path: "shop", select: "name city" },
    });

    return res.status(200).json({
      message: "Item removed from cart",
      cart,
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    return res.status(500).json({ message: `Remove from cart error: ${error.message}` });
  }
};

// ✅ Clear entire cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.userId;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = [];
    await cart.save();

    return res.status(200).json({
      message: "Cart cleared",
      cart,
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    return res.status(500).json({ message: `Clear cart error: ${error.message}` });
  }
};