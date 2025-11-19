import DeliveryAssignment from "../models/deliveryAssignment.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Shop from "../models/shop.model.js";
import mongoose from "mongoose";


// ✅ ADD: Helper function to calculate distance
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2); // Return distance in km with 2 decimals
};

// ✅ Get nearby delivery boys when owner selects OUT_FOR_DELIVERY
export const getNearbyDeliveryBoys = async (req, res) => {
  try {
    const { orderId, shopId } = req.query;
    const ownerId = req.userId;

    if (!orderId || !shopId) {
      return res.status(400).json({ message: "Order ID and Shop ID required" });
    }

    // Get order with delivery address
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Get shop details
    const shop = await Shop.findById(shopId);
    if (!shop || shop.owner.toString() !== ownerId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const deliveryLat = order.deliveryAddress?.latitude;
    const deliveryLon = order.deliveryAddress?.longitude;

    if (!deliveryLat || !deliveryLon) {
      return res.status(400).json({ message: "Delivery address coordinates not found" });
    }

    // CHANGE THIS PART:

// Add check for busy delivery boys
const busyDeliveryBoys = await DeliveryAssignment.find({
  assignedTo: { $ne: null },
  status: { $in: ["Assigned"] } // Only consider "Assigned" as busy, not "Completed"
}).distinct("assignedTo");

// Find delivery boys within 10km radius who are NOT busy
const deliveryBoys = await User.find({
  role: "deliveryBoy",
  _id: { $nin: busyDeliveryBoys }, // ✅ Exclude busy delivery boys
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [deliveryLon, deliveryLat]
      },
      $maxDistance: 10000 // 10km
    }
  },
  lastLocationUpdate: {
    $gte: new Date(Date.now() - 30 * 60 * 1000)
  }
}).select("fullName email mobile location lastLocationUpdate");

// ✅ ADD: Calculate distance for each delivery boy
const deliveryBoysWithDistance = deliveryBoys.map(boy => {
  const distance = calculateDistance(
    deliveryLat,
    deliveryLon,
    boy.location.coordinates[1],
    boy.location.coordinates[0]
  );
  
  return {
    ...boy.toObject(),
    distance: distance // in kilometers
  };
});

// ✅ ADD: Sort by distance (nearest first)
deliveryBoysWithDistance.sort((a, b) => a.distance - b.distance);

res.status(200).json({
  success: true,
  deliveryBoys: deliveryBoysWithDistance,
  count: deliveryBoysWithDistance.length
});
  } catch (error) {
    console.error("Get nearby delivery boys error:", error);
    res.status(500).json({ message: `Failed to get delivery boys: ${error.message}` });
  }
};

/// ✅ Broadcast delivery assignment to available delivery boys automatically
export const broadcastDeliveryAssignment = async (req, res) => {
  try {
    const { orderId, shopId } = req.body;
    const ownerId = req.userId;

    // BASIC VALIDATION ----------------------------------
    if (!orderId || !shopId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // VERIFY ORDER ---------------------------------------
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // VERIFY SHOP + OWNER --------------------------------
    const shop = await Shop.findById(shopId);
    if (!shop || shop.owner.toString() !== ownerId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // FIND SHOP-ORDER -------------------------------------
    const shopOrder = order.shopOrder.find(
      so => so.shop.toString() === shopId
    );

    if (!shopOrder) {
      return res.status(404).json({ message: "Shop-order not found" });
    }

    // GET DELIVERY LOCATION -------------------------------
    const deliveryLat = order.deliveryAddress?.latitude;
    const deliveryLon = order.deliveryAddress?.longitude;

    if (!deliveryLat || !deliveryLon) {
      return res.status(400).json({ message: "Delivery coords missing" });
    }

    // GET BUSY DELIVERY BOYS ------------------------------
    const busyDeliveryBoys = await DeliveryAssignment.find({
      assignedTo: { $ne: null },
      status: "Assigned",
    }).distinct("assignedTo");

    // QUERY AVAILABLE DELIVERY BOYS ------------------------
    const availableDeliveryBoys = await User.find({
      role: "deliveryBoy",
      _id: { $nin: busyDeliveryBoys },
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [deliveryLon, deliveryLat],
          },
          $maxDistance: 10000, // 10km radius
        },
      },
      lastLocationUpdate: {
        $gte: new Date(Date.now() - 30 * 60 * 1000), // active in last 30 mins
      },
    });

    const deliveryBoyIds = availableDeliveryBoys.map(boy => boy._id);

        let assignment;

    if (deliveryBoyIds.length === 0) {
      // 😕 No riders right now, but still create assignment
      assignment = await DeliveryAssignment.create({
        order: orderId,
        shop: shopId,
        shopOrderId: shopOrder._id,
        boardCastedTo: [],        // nobody yet
        status: "boardCasted",    // still waiting
        attempt: (shopOrder.attempt || 1),
      });

      shopOrder.assignment = assignment._id;
      await order.save();

      return res.status(201).json({
        success: true,
        message: "No delivery boys nearby. Waiting for delivery partner...",
        assignment,
      });
    }

    // ✅ NORMAL CASE (riders found) - keep your existing CREATE here:
    assignment = await DeliveryAssignment.create({
      order: orderId,
      shop: shopId,
      shopOrderId: shopOrder._id,
      boardCastedTo: deliveryBoyIds,
      status: "boardCasted",
      attempt: (shopOrder.attempt || 1),
    });

    // LINK TO SHOP ORDER -----------------------------------
    shopOrder.assignment = assignment._id;
    await order.save();

    res.status(201).json({
      success: true,
      message: "Delivery assignment broadcasted automatically",
      assignment,
    });


  } catch (error) {
    console.error("Broadcast assignment error:", error);
    res.status(500).json({
      message: `Failed to broadcast: ${error.message}`,
    });
  }
};

// ✅ Get assignments for a delivery boy
export const getDeliveryBoyAssignments = async (req, res) => {
  try {
    const deliveryBoyId = req.userId;

    const now = new Date();
const expireMs = 3*60 * 1000; // 3 minutes

// 1️⃣ Find all expired boardCasted assignments that we have NOT penalized yet
    const expiredAssignments = await DeliveryAssignment.find({
      status: "boardCasted",
      createdAt: { $lt: new Date(now.getTime() - expireMs) },
      penaltyApplied: false,
    });

    for (const assign of expiredAssignments) {
      if (assign.boardCastedTo && assign.boardCastedTo.length > 0) {
        // 2️⃣ Penalize each boy in boardCastedTo by -10
        const boys = await User.find({ _id: { $in: assign.boardCastedTo } });
        for (const boy of boys) {
          // don’t go below 0
          boy.walletBalance = Math.max(0, (boy.walletBalance || 0) - 10);
          await boy.save();
        }
      }

      // 3️⃣ Mark assignment as expired & penalty done
      assign.status = "Expired";
      assign.penaltyApplied = true;
      await assign.save();
    }

const assignments = await DeliveryAssignment.find({
  $or: [
    // ✅ only show boardCasted less than 3 mins old
    {
      boardCastedTo: deliveryBoyId,
      status: "boardCasted",
      createdAt: { $gte: new Date(now.getTime() - expireMs) },
    },
    // ✅ always show his own active/completed assignments
    { assignedTo: deliveryBoyId },
  ],
}).populate({
        path: "order",
        // 👇 include shopOrder so items can be used in DeliveryNavigation
        select: "deliveryAddress user totalAmount paymentMethod shopOrder",
        populate: [
          {
            path: "user",
            select: "fullName mobile",
          },
          {
            path: "shopOrder.shop",
            select: "name address city",
          },
          {
            path: "shopOrder.shopOrderItems.item",
            select: "name price image",
          },
        ],
      })

      .populate({
        path: "shop",
        select: "name address city state"
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      assignments
    });
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({ message: `Failed to get assignments: ${error.message}` });
  }
};

// ✅ Accept delivery assignment
export const acceptAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const deliveryBoyId = req.userId;

    const assignment = await DeliveryAssignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Check if delivery boy was broadcasted to
    if (!assignment.boardCastedTo.includes(deliveryBoyId)) {
      return res.status(403).json({ message: "Not authorized to accept this assignment" });
    }

    // Check if already assigned
    if (assignment.status === "Assigned") {
      return res.status(400).json({ message: "Assignment already taken" });
    }

       // ✅ Get order + delivery boy for distance calculation
    const order = await Order.findById(assignment.order);
    const deliveryBoy = await User.findById(deliveryBoyId);

    // Assign to delivery boy
    assignment.assignedTo = deliveryBoyId;
    assignment.status = "Assigned";
    assignment.accpectedAt = new Date();

    // ✅ Calculate distance & fee (deliveryBoy → customer)
    const deliveryLat = order.deliveryAddress?.latitude;
    const deliveryLon = order.deliveryAddress?.longitude;

    if (
      deliveryLat != null &&
      deliveryLon != null &&
      deliveryBoy?.location?.coordinates?.length === 2
    ) {
      const boyLon = deliveryBoy.location.coordinates[0];
      const boyLat = deliveryBoy.location.coordinates[1];

      const dist = calculateDistance(
  boyLat, boyLon,
  deliveryLat, deliveryLon
);


      assignment.distanceKm = Number(dist);
      assignment.deliveryFee = Number(dist) * 8; // ₹8 per km
    }

    await assignment.save();

    // Update order status
    const shopOrder = order.shopOrder.id(assignment.shopOrderId);
    if (shopOrder) {
      shopOrder.status = "OUT_FOR_DELIVERY";
      await order.save();
    }


    res.status(200).json({
      success: true,
      message: "Assignment accepted successfully",
      assignment
    });
  } catch (error) {
    console.error("Accept assignment error:", error);
    res.status(500).json({ message: `Failed to accept: ${error.message}` });
  }
};

// ✅ Complete delivery assignment
export const completeAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const deliveryBoyId = req.userId;

    const assignment = await DeliveryAssignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (assignment.assignedTo?.toString() !== deliveryBoyId) {
      return res.status(403).json({ message: "Not your assignment" });
    }

    // Mark as completed
        // Mark as completed
    assignment.status = "Completed";
    await assignment.save();

    // ✅ CREDIT EARNINGS (only once)
    if (!assignment.earningSettled && assignment.deliveryFee > 0) {
      const boy = await User.findById(deliveryBoyId);
      if (boy) {
        const fee = assignment.deliveryFee;

        // Reset today's earnings if day changed
        const now = new Date();
        const last = boy.earningsLastReset;
        const isSameDay =
          last &&
          now.getFullYear() === last.getFullYear() &&
          now.getMonth() === last.getMonth() &&
          now.getDate() === last.getDate();

        if (!isSameDay) {
          boy.todayEarnings = 0;
          boy.earningsLastReset = now;
        }

        boy.walletBalance = (boy.walletBalance || 0) + fee;
        boy.totalEarnings = (boy.totalEarnings || 0) + fee;
        boy.todayEarnings = (boy.todayEarnings || 0) + fee;

        await boy.save();
      }

      assignment.earningSettled = true;
      await assignment.save();
    }

    // Update order status
    const order = await Order.findById(assignment.order);
    const shopOrder = order.shopOrder.id(assignment.shopOrderId);
    if (shopOrder) {
      shopOrder.status = "DELIVERED";
      await order.save();
    }

    res.status(200).json({
      success: true,
      message: "Delivery completed successfully",
      assignment
    });

  } catch (error) {
    console.error("Complete assignment error:", error);
    res.status(500).json({ message: `Failed to complete: ${error.message}` });
  }
};

// ✅ ADD: Get delivery boy's current location for live tracking
export const getDeliveryBoyLiveLocation = async (req, res) => {
  try {
    const { assignmentId } = req.query;

    const assignment = await DeliveryAssignment.findById(assignmentId)
      .populate("assignedTo", "fullName mobile location lastLocationUpdate");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (!assignment.assignedTo) {
      return res.status(400).json({ message: "No delivery boy assigned yet" });
    }

    const deliveryBoy = assignment.assignedTo;

    res.status(200).json({
      success: true,
      deliveryBoy: {
        name: deliveryBoy.fullName,
        mobile: deliveryBoy.mobile,
        latitude: deliveryBoy.location.coordinates[1],
        longitude: deliveryBoy.location.coordinates[0],
        lastUpdate: deliveryBoy.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error("Get live location error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ NEW: Get delivery stats for logged-in delivery boy
export const getDeliveryStats = async (req, res) => {
  try {
    const deliveryBoyId = req.userId;

    const stats = await DeliveryAssignment.aggregate([
      {
        $match: {
          assignedTo: new mongoose.Types.ObjectId(deliveryBoyId),
          status: "Completed",
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$updatedAt" },
            month: { $month: "$updatedAt" },
            day: { $dayOfMonth: "$updatedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
    ]);

    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error("Get delivery stats error:", error);
    res.status(500).json({ message: `Failed to get stats: ${error.message}` });
  }
};

// 💰 Get delivery boy earnings summary
export const getDeliveryBoyEarnings = async (req, res) => {
  try {
    const deliveryBoyId = req.userId;

    const boy = await User.findById(deliveryBoyId).select(
      "walletBalance totalEarnings todayEarnings earningsLastReset"
    );

    if (!boy) {
      return res.status(404).json({ message: "User not found" });
    }

    // Count today's completed deliveries
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);

    const todayDeliveries = await DeliveryAssignment.find({
      assignedTo: deliveryBoyId,
      status: "Completed",
      updatedAt: { $gte: startOfDay },
    }).select("deliveryFee distanceKm");

   // ⭐ CALCULATE today earnings from today's completed deliveries
const todayEarnings = todayDeliveries.reduce(
  (sum, d) => sum + (d.deliveryFee || 0),
  0
);

// ⭐ GET ALL COMPLETED DELIVERIES (for total earnings)
const allAssignments = await DeliveryAssignment.find({
  assignedTo: deliveryBoyId,
  status: "Completed",
}).select("deliveryFee");

// ⭐ CALCULATE total earnings
const totalEarnings = allAssignments.reduce(
  (sum, d) => sum + (d.deliveryFee || 0),
  0
);

// ⭐ Wallet = total
const walletBalance = totalEarnings;

return res.status(200).json({
  success: true,
  walletBalance,
  todayEarnings,
  totalEarnings,
  todayDeliveries,
});

  } catch (error) {
    console.error("Get earnings error:", error);
    res.status(500).json({ message: `Failed to get earnings: ${error.message}` });
  }
};

// 💸 Request withdraw (for now just deducts from wallet)
export const requestWithdraw = async (req, res) => {
  try {
    const deliveryBoyId = req.userId;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const boy = await User.findById(deliveryBoyId);
    if (!boy) {
      return res.status(404).json({ message: "User not found" });
    }

    if (boy.walletBalance < amount) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    boy.walletBalance -= amount;
    await boy.save();

    // Later you can store withdraw requests in a separate collection
    res.status(200).json({
      success: true,
      message: "Withdrawal request recorded (dummy for now)",
      walletBalance: boy.walletBalance,
    });
  } catch (error) {
    console.error("Withdraw error:", error);
    res.status(500).json({ message: `Failed to withdraw: ${error.message}` });
  }
};

