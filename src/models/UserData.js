require("dotenv").config();
let mongoose = require("mongoose");
let jwt = require("jsonwebtoken");
let bcrypt = require("bcryptjs");

let UserDataSchema = new mongoose.Schema({
    name: {
        type: String,
        lowercase: true
    },
    email: {
        type: String,
        unique: [true, "Email already exists"]
    },
    phone: {
        type: Number
    },
    cnic: {
        type: Number
    }, 
    city: {
        type : String,
        lowercase: true
    }, 
    password: {
        type: String
    }, 
    type:{
        type :String,
        default : "user"  //Two values are admin or user
    },
    admin_access: {
        type: String,
        default: "active"  //Two more values are restricted and active 
    },
    reservationHistory: [{
        reservation_id: {
            type: String
        }
    }],
    tokens :[{
        token: {
            type: String
        }
    }]
});

UserDataSchema.methods.generateAuthToken = async function(){
    try{
        let token = jwt.sign({_id: this._id}, process.env.SECRET_KEY);
        this.tokens = this.tokens.concat({token : token});
        await this.save();
        return(token);
    }
    catch(e){
        console.log("Auth generating Error", e);
        return("Auth generating Error", e);
    }
};

UserDataSchema.pre("save", async function(next){
    try{
        if(this.isModified("password")){
            this.password = await bcrypt.hash(this.password, 10);
        };
        next();
    }
    catch(e){
        console.log("Hashing Error", e);
        return("Hashing Error", e);
    }

})

let userData = new mongoose.model("UserData", UserDataSchema);
module.exports = userData;