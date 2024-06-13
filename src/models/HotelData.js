let mongoose= require("mongoose");
let jwt = require("jsonwebtoken");
let bcrypt = require("bcryptjs");
let validator = require("validator");

let HotelDataSchema = new mongoose.Schema({
    hotel_name: {
        type: String,
        lowercase: true
    },
    hotel_logo: {
        type: String,
    },
    hotel_city: {
        type: String,
        lowercase: true
    },
    total_hotel_rooms: {
        type: Number,
        default : 0
    },
    hotel_add: {
        type: String,
        lowercase: true
    },
    hotel_total_revenue:{
        type: Number,
        default : 0
    },
    creationData:{
        type : Date,
        default: Date.now()
    },
    hotel_status :{
        type: String,
        default: "incomplete"
    },
    admin_access:{
        type: String,
        default : "pending"  //Two more values are restricted and active other than pending
    },
    hotel_email:{
        type: String,
        unique: true
    },
    hotel_password:{
        type: String
    },
    hotel_contact_no: {
        type : String
    },
    tokens :[{
        token: {
            type: String
        }
    }],
    hotel_rooms:[{
        room_id: {
            type: String
        },
        room_title: {
            type: String,
            lowercase: true
        },
        room_pic:{
            type: String,
            defualt: ""
        },
        room_price: {
            type: Number
        },
        room_dis_price:{
            type: Number
        },
        room_city: {
            type: String,
            lowercase: true
        },
        room_add: {
            type: String,
            lowercase: true
        },
        room_bed: {
            type: String,
            lowercase: true
        },
        room_type: {
            type: String,
            lowercase: true
        },
        admin_access:{
            type: String,
        },
        room_status:{
            type: String,
        }
    }]
});

HotelDataSchema.methods.generateAuthToken = async function(){
    try{
        let token = jwt.sign({_id: this._id,}, process.env.SECRET_KEY);
        this.tokens = this.tokens.concat({token : token});
        await this.save();
        console.log("Schema Token", token);
        return(token);
    }
    catch(e){
        console.log("Auth generating Error", e);
        return("Auth generating Error", e);
    }
};

HotelDataSchema.pre("save", async function(next){
    try{
        if(this.isModified("hotel_password")){
            this.hotel_password = await bcrypt.hash(this.hotel_password, 10);
        };
        next();
    }
    catch(e){
        console.log("Hashing Error", e);
        return("Hashing Error", e);
    }

})

let hotelData = new mongoose.model("HotelData", HotelDataSchema);

module.exports = hotelData;