let mongoose= require("mongoose");

let RoomDataSchema = new mongoose.Schema({
room_title: {
    type: String,
    lowercase: true
},
room_add: {
    type: String,
    lowercase: true
},
room_city: {
    type: String,
    lowercase: true
},
room_price: {
    type: Number,
},
room_main_img:{ 
    type: String,
    default: ""
},
room_dis_price: {
    type: Number,
},
room_dis: {
    type: Boolean,
    default : false
},
room_visibility: {
    type: Boolean,
    default : true
},
room_policy: [{
    type: String,
    lowercase: true
}],
room_total_revenue:{
    type: Number,
    default : 0
},
room_des: {
    type: String,
    lowercase: true
},
room_images: [{
    type: String
}],
room_bed:{
    type: String 
},
room_type:{
    type: String
},
room_status:{
    type :String,
    default : "active"   //Two more values are restricted and active 
},
admin_access:{
    type :String,
    default : "active"   //Two more values are restricted and active 
},  
creationData: {
    type : Date,
    default: Date.now()
},
hotel_id: {
    type: String
},
hotel_data:[{
    hotel_id: {
        type: String
    },
    hotel_logo:{
        type: String
    },
    hotel_name: {
        type: String
    },
}],
reservationDetails: [{
    _id: {
        type : String
    },
    user_id: {
        type: String
    },
    user_name: {
        type: String
    },
    user_email: {
        type: String
    },
    user_phone: {
        type: String
    },
    user_cnic: {
        type: String
    },
    reservation_status: {
        type: String
    },
    starting: {
        type: String
    },
    ending: {
        type : String
    },
    total_days:{
        type: Number
    },
    total_price:{
        type : Number
    }

}],
total_comments: {
    type: Number,
    default: 0
},
comments: [{
    room_id: {
        type : String
    },
    user_id: {
        type: String
    },
    user_name: {
        type: String,
        lowercase: true
    },
    user_message:{
        type: String,
        lowercase: true
    },
    creationData:{
        type : Date,
        default: Date.now()
    },
}]
});

let roomData = new mongoose.model("RoomData", RoomDataSchema);

module.exports = roomData;