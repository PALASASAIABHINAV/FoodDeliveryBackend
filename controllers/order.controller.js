import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";
import mongoose from "mongoose";
import Shop from "../models/shop.model.js";
import { sendOtpMail } from "../utils/mail.js"; 

export const placeOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { paymentMethod, deliveryAddress } = req.body;

    if (!deliveryAddress || !deliveryAddress.text) {
      return res.status(400).json({ message: "Delivery address is required" });
    }

    // Fetch user's cart with item + shop populated
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.item",
      populate: {
        path: "shop",
        select: "name city owner",
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

        // Group items by shop
    const shopMap = new Map();

    for (const cartItem of cart.items) {
      const item = cartItem.item;
      if (!item || !item.shop) continue;

      const shopId = item.shop._id.toString();

      if (!shopMap.has(shopId)) {
        shopMap.set(shopId, {
          shop: item.shop._id,
          owner: item.shop.owner || null,
          subTotal: 0,
          shopOrderItems: [],
        });
      }

      const shopGroup = shopMap.get(shopId);

      // ✅ Always use latest item.price from DB
      const latestPrice = item.price;
      const itemTotal = latestPrice * cartItem.quantity;

      shopGroup.subTotal += itemTotal;

      shopGroup.shopOrderItems.push({
        item: item._id,
        quantity: cartItem.quantity,
        price: latestPrice,  // ✅ store updated price in order
      });
    }


    // Convert grouped data into array
        // Convert grouped data into array
    const shopOrderArray = Array.from(shopMap.values());

    // 🔐 Generate a 4-digit delivery code for EACH shop order
    shopOrderArray.forEach((so) => {
      so.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
    });

    // Calculate fees and totals
    const subTotal = shopOrderArray.reduce((sum, s) => sum + s.subTotal, 0);

    const deliveryFee = subTotal > 500 ? 0 : 40;
    const platformFee = 2;
    const totalAmount = subTotal + deliveryFee + platformFee;

    // Create new order
    const newOrder = await Order.create({
      user: userId,
      paymentMethod,
      deliveryAddress,
      subTotal,
      deliveryFee,
      platformFee,
      totalAmount,
      shopOrder: shopOrderArray,
    });

    // Clear user's cart
    cart.items = [];
    await cart.save();

    // Respond
    res.status(201).json({
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("❌ Place order error:", error);
    res.status(500).json({ message: `Failed to place order: ${error.message}` });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.userId;

    let orders = await Order.find({ user: userId })
      .populate({
        path: "shopOrder.shop",
        select: "name address city image",
      })
      .populate({
        path: "shopOrder.shopOrderItems.item",
        select: "name image price",
      })
      .sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    // ✅ Auto-cancel logic
    const now = new Date();
    const expiryMs = 20 * 60 * 1000; // 20 minutes
    const statusesToCancel = ["PENDING", "CONFIRMED", "PREPARING"];

    const savePromises = [];

    orders.forEach((order) => {
      const age = now.getTime() - order.createdAt.getTime();
      if (age > expiryMs) {
        let changed = false;
        order.shopOrder.forEach((so) => {
          if (statusesToCancel.includes(so.status)) {
            so.status = "CANCELLED";
            changed = true;
          }
        });
        if (changed) {
          savePromises.push(order.save());
        }
      }
    });

    if (savePromises.length) {
      await Promise.all(savePromises);
      // reload with populated if needed, but here `order` docs already have populated shopOrder
    }

    res.status(200).json({
      success: true,
      message: "User orders fetched successfully",
      orders,
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch orders: ${error.message}`,
    });
  }
};


export const getOwnerOrders = async (req, res) => {
  try {
    const ownerId = req.userId;

    const ownerShops = await Shop.find({ owner: ownerId }).select("_id name");

    if (!ownerShops.length) {
      return res.status(404).json({ message: "No shops found for this owner" });
    }

    const ownerShopIds = ownerShops.map((s) => s._id.toString());

        const allOrders = await Order.find({
      "shopOrder.shop": { $in: ownerShopIds },
    })
      .populate({
        path: "user",
        select: "fullName email",
      })
      .populate({
        path: "shopOrder.shop",
        select: "name owner image",
      })
      .populate({
        path: "shopOrder.shopOrderItems.item",
        select: "name image price",
      })
      .sort({ createdAt: -1 });

    // ✅ Auto-cancel logic (same rule as user)
    const now = new Date();
    const expiryMs = 30 * 60 * 1000;
    const statusesToCancel = ["PENDING", "CONFIRMED", "PREPARING"];
    const savePromises = [];

    allOrders.forEach((order) => {
      const age = now.getTime() - order.createdAt.getTime();
      if (age > expiryMs) {
        let changed = false;
        order.shopOrder.forEach((so) => {
          if (statusesToCancel.includes(so.status)) {
            so.status = "CANCELLED";
            changed = true;
          }
        });
        if (changed) savePromises.push(order.save());
      }
    });

    if (savePromises.length) {
      await Promise.all(savePromises);
    }

    const filteredOrders = allOrders
      .map((order) => {
        const filteredShopOrder = order.shopOrder.filter((s) => {
          const shopId =
            typeof s.shop === "object" ? s.shop._id?.toString() : s.shop?.toString();
          return ownerShopIds.includes(shopId);
        });
        

        if (!filteredShopOrder.length) return null;

        return {
          ...order.toObject(),
          shopOrder: filteredShopOrder,
        };
      })
      .filter(Boolean);

    if (!filteredOrders.length) {
      return res.status(404).json({ message: "No orders found for this owner" });
    }

    res.status(200).json({
      success: true,
      message: "Owner orders fetched successfully",
      orders: filteredOrders,
    });
  } catch (error) {
    console.error("❌ Error fetching owner orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch owner orders",
      error: error.message,
    });
  }
};
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, shopId, status } = req.body;
    const ownerId = req.userId;

    if (!orderId || !shopId || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate status
    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    // Load order
    const order = await Order.findById(orderId)
      .populate({
        path: "shopOrder.shop",
        select: "name owner image",
      })
      .populate({
        path: "shopOrder.shopOrderItems.item",
        select: "name image price",
      })
      .populate({
        path: "user",
        select: "fullName email",
      });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // --------------------------------------------------
    // ✅ ADD THE NEW LOGIC HERE (Correct place)
    // --------------------------------------------------

    const shopOrder = order.shopOrder.find(
      so => so.shop._id.toString() === shopId
    );

    if (shopOrder && ["OUT_FOR_DELIVERY", "DELIVERED"].includes(shopOrder.status)) {
      return res.status(403).json({
        message: "Cannot update status. Delivery is in progress or completed."
      });
    }

    // --------------------------------------------------

    // Now continue with your existing update logic
    let updated = false;
    order.shopOrder.forEach((shopOrder) => {
      const currentShopId = shopOrder.shop._id.toString();
      const currentOwnerId = shopOrder.owner.toString();

      if (currentShopId === shopId && currentOwnerId === ownerId) {
        shopOrder.status = status;
        updated = true;
      }
    });

    if (!updated) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this order" });
    }

    await order.save();

    res.status(200).json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

export const updateOrderStatusByDeliveryBoy = async (req, res) => {
  try {
    const { orderId, shopOrderId, status } = req.body;
    const deliveryBoyId = req.userId;

    console.log("Update request:", { orderId, shopOrderId, status, deliveryBoyId });

    if (!orderId || !shopOrderId || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 👉 Only allow OUT_FOR_DELIVERY here. DELIVERED will go through OTP API.
    const validStatuses = ["OUT_FOR_DELIVERY"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Fetch shop order inside order
    const shopOrder = order.shopOrder.id(shopOrderId);
    if (!shopOrder) {
      return res.status(404).json({ message: "Shop order not found" });
    }

    // Check if this delivery boy is assigned
    const DeliveryAssignment = (await import("./models/deliveryAssignment.model.js")).default;
    const assignment = await DeliveryAssignment.findById(shopOrder.assignment);

    if (!assignment || assignment.assignedTo?.toString() !== deliveryBoyId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Normal status update (NO OTP here)
    shopOrder.status = status;
    await order.save();

    res.status(200).json({
      message: "Status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: error.message });
  }
};



// =====================================================================
// ✅ Verify OTP and Complete Delivery
// =====================================================================
export const verifyDeliveryOtp = async (req, res) => {
  try {
    const { orderId, shopOrderId, otp } = req.body;
    const deliveryBoyId = req.userId;

    console.log("Verify OTP request:", { orderId, shopOrderId, otp });

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Fetch shop order inside order
    const shopOrder = order.shopOrder.id(shopOrderId);
    if (!shopOrder) {
      return res.status(404).json({ message: "Shop order not found" });
    }

    console.log("Stored OTP:", shopOrder.deliveryOtp, "Received OTP:", otp);

    // OTP check
    if (shopOrder.deliveryOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Set as delivered
    shopOrder.status = "DELIVERED";
    shopOrder.deliveryOtp = null;
    await order.save();

    // Complete assignment
    const DeliveryAssignment = (await import("../models/deliveryAssignment.model.js")).default;
    const assignment = await DeliveryAssignment.findById(shopOrder.assignment);

    if (assignment) {
      assignment.status = "Completed";
      await assignment.save();
    }

    res.status(200).json({
      message: "Delivery completed successfully",
      order
    });

  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: error.message });
  }
};