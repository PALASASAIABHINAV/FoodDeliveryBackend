import mongoose  from "mongoose";
const deliveryAssignmentSchema = new mongoose.Schema({
    order:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required:true,
    },
    shop:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Shop",
        required:true,
    },
    shopOrderId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,  
    },
    boardCastedTo:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
        }
    ],
    assignedTo:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        default:null,
    },
    status:{
        type:String,
        enum:["boardCasted","Assigned", "Completed"],
        default:"boardCasted",
    },
    accpectedAt:{
        type:Date,
        default:null,
    },

        status:{
        type:String,
        enum:["boardCasted","Assigned", "Completed", "Expired"], // ⬅️ just ADD "Expired"
        default:"boardCasted",
    },

    // 👉 how many times this order was broadcast (for future use if needed)
    attempt:{
        type:Number,
        default:1,
    },

    // 👉 distance & fee for THIS delivery
    distanceKm:{
        type:Number,
        default:0,
    },
    deliveryFee:{
        type:Number,
        default:0,
    },

    // 👉 true once we already applied -10 penalty
    penaltyApplied:{
        type:Boolean,
        default:false,
    },

    // 👉 true once we already credited earnings to wallet
    earningSettled:{
        type:Boolean,
        default:false,
    },

},{timestamps:true});

const DeliveryAssignment = mongoose.model("DeliveryAssignment",deliveryAssignmentSchema);
export default DeliveryAssignment;