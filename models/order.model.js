import mongoose  from "mongoose";

const shopOrderItemSchema = new mongoose.Schema({
    item:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Item",
        required:true,
    },
    quantity:{
        type:Number,
        required:true,
    },
    price:{
        type:Number,
        required:true,
    }
},{timestamps:true});

const shopOrderSchema = new mongoose.Schema({
    shop:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Shop",
        required:true,
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    subTotal:{
        type:Number,
        required:true,
    },
    shopOrderItems:[shopOrderItemSchema],
    status:{
        type:String,
        enum:["PENDING","CONFIRMED","PREPARING","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"],
        default:"PENDING",
    },
    assignment:{
       type:mongoose.Schema.Types.ObjectId,
       ref:"DeliveryAssignment",
       default:null,
    },
    deliveryOtp: {
    type: String,
    default: null
  }
});

const orderSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    paymentMethod:{
        type:String,
        enum:["COD","ONLINE"],
        required:true,
    },
    deliveryAddress:{
        text:String,
        latitude:Number,
        longitude:Number,
    },
    totalAmount:{
        type:Number,
        required:true,
    },
    shopOrder:[shopOrderSchema]
},{timestamps:true});

const Order = mongoose.model("Order",orderSchema);
export default Order;