let mongoose= require("mongoose");

let ReservationDetails = new mongoose.Schema({
    room_id : {
        type : String
    },
    hotel_id:{
        type : String
    },
    room_title: {
        type: String,
    },
    room_main_img: {
        type: String,
        default: ""
    },
    room_price: {
        type: Number,
    },
    hotel_logo:{
        type: String
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
        type: String,
        lowecase: true
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
    },  
    creationData: {
        type : Date,
        default: Date.now()
    },
});

let reservationDetails = new mongoose.model("ReservationDetail", ReservationDetails);

module.exports = reservationDetails;