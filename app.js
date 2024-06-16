require("dotenv").config();
let express = require("express");
let app = express();
let PORT = process.env.PORT;
let db = require("./src/db/db")
let bodyParser = require('body-parser');
let multer = require("multer");
let path = require("path");
let hbs = require("hbs");
let verification = require("./src/middleware/verification");
let cors = require("cors")
let bcrypt = require("bcryptjs");
let cloudinary = require("cloudinary");
let fs = require("fs");
//Database
let HotelData = require("./src/models/HotelData");
let RoomData = require("./src/models/RoomData");
let UserData = require("./src/models/UserData");
let ReservationDetails = require("./src/models/ReservationDetails");

//Cors
let corsOptions = {
    origin: "https://paradise-hotel-admin.web.app",
    methods: "GET, POST, PUT, DELETE, PATCH, HEAD",
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin', ],
    credentials: true,
    optionsSuccessStatus: 204
}
app.use(cors(corsOptions))

//Cloudinary Setup
cloudinary.config({
    cloud_name : process.env.CLOUD_NAME,
    api_key : process.env.API_KEY,
    api_secret: process.env.API_SECRET
})

// Middlewares 
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({extended: false}));
app.use(bodyParser.urlencoded({ extended: false })); 
app.use(express.static(path.join(__dirname, 'public')));


//hbs
let tempPath = path.join(__dirname, "./src/template/")
app.set("view engine", "hbs")
app.set("views", tempPath)

// Multer storage Single hotel logo 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/hotellogos');
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`)
    }
  });
    
const upload = multer({ storage: storage })

// Multer storage Multiple (Room images)
const storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images')
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`)
    }
  })
  
const upload2 = multer({ storage: storage2 })

//Routing

app.get("/", (req, res)=>{
    console.log("Response Sent");
    res.status(200).json("Hello world");
});

app.post("/dashboarddata", (req, res)=>{
    let {token} = req.body;
    async function getData(){
        try{
            let verify = await verification({token: token});
            console.log(verify)
            let hotelData= await HotelData.find({_id: verify._id}).select({hotel_name : 1,total_hotel_rooms : 1,hotel_total_revenue : 1,hotel_city: 1,});
            console.log(hotelData);
            let total_Pending_reservations = await ReservationDetails.find({$and: [{hotel_id: verify._id},  {reservation_status : "pending"}]}).count();
            let total_Confirmed_reservations = await ReservationDetails.find({$and: [{hotel_id: verify._id},  {reservation_status : "confirmed"}]}).count();
            let total_Closed_reservations = await ReservationDetails.find({$and: [{hotel_id: verify._id},  {reservation_status : "closed"}]}).count();
            let total_Cancelled_reservations = await ReservationDetails.find({$and: [{hotel_id: verify._id},  {reservation_status : "cancelled"}]}).count();
            // console.log(hotelData);
            // console.log(, total_Pending_reservations, total_Confirmed_reservations, hotelData.length);
            // let revenue = 0;
            
            let data = {
                hotelData :  hotelData,
                total_pending : total_Pending_reservations,
                total_confirmed : total_Confirmed_reservations,
                total_closed: total_Closed_reservations,
                total_cancelled : total_Cancelled_reservations
            }
            console.log(data);
            res.status(200).json({msg: "Fetched Data Successfully" ,data});    
        }
        catch(e){
            console.log("Errors while fatching dashboard data", e);
            res.status(400).json({msg : "Errors while fatching dashboard data"})
        }
    };
    getData();
})


app.post("/admin_verify", (req, res)=>{
    async function v(){
        let {token} = req.body;
        // console.log(token);
        // console.log(req.body);
        try{
            let verify = await verification({token: token});
            console.log(verify);
            let data = await HotelData.findOne({_id: verify._id}).select({hotel_status: 1, admin_access: 1});
            console.log(data);
            if(verify.verified === true  || verify.verified){
                res.status(200).json({msg: "LoggedIn Successfully", id: verify._id , verified: true, hotel_status: data.hotel_status, admin_access: data.admin_access })
            }
            else{
                res.status(200).json({msg: "You are not Logged in , Please Login First", id: "" ,verified: false, hotel_status: "", admin_access:""})
            }
        }
        catch(e){
            console.log("Verification Error", e);
        }
    };
    v();
});

app.post("/hotel_details", (req, res)=>{
    async function getLogo(){
        try{
            let {token} = req.body;
            let verify = await verification({token: token});
            console.log(verify);
            let data = await HotelData.findOne({_id: verify._id}).select({hotel_logo: 1, hotel_name: 1});
            if(data !== null){
                res.status(200).json({msg: "Data found", status: true, data: data});
            }
            else{
                res.status(200).json({msg: "Data found", status: false, data: []});
            }

        }
        catch(e){
            console.log("Error while fetching hotel logo", e)
        }
    };
    getLogo();
})

app.post("/admin_login", (req, res)=>{
    let {email, password} = req.body;
    console.log(req.body);

    async function userlogin(){
        try{
            let data = await HotelData.findOne({hotel_email: email});
            console.log(data)
            if(data !== null){
                console.log(data);
                let verify = await bcrypt.compare(password, data.hotel_password);
                if(verify === true || verify){
                        let token = await data.generateAuthToken();
                        console.log("Login Token", token);
                         res.status(200).json({verified : true, msg: "Login Successfully", token: token});
                        // res.send("User Loggedin Successfully")
                }
                else{
                    console.log("Wrong Email or password");
                    res.status(200).json({verified : false, msg: "Wrong Email or password", token: ""});
                    // res.send("Wrong Email or password");
                }

            }
            else{
                console.log("Account not found");
                res.status(200).json({verified : false, msg: "Sorry! Your Account is not found, kindly use another account", token: ""});
                // res.send("Account not found");
            }            
        }
        catch(e){
            console.log("User Login Error", e);
            return("User Login Error", e);
        }
    };
    userlogin();
});

app.post("/logout", (req, res)=>{
    let {token} = req.body;
    // console.log("Backend logout");
    // console.log(req.body);
    async function logout(){
        try{
            let verify = await verification({token: token});
            console.log(verify);
            let delete_data = await HotelData.findOne({_id: verify._id});
            console.log(delete_data);
            let d = delete_data.tokens.filter((val)=>{
                if(val.token !== token){
                    return(val);
                }
            });
            console.log(d);
            let loggingout = await HotelData.findByIdAndUpdate({_id: verify._id}, {
                $set: {
                    tokens: d
                }
            });
            console.log(loggingout);
                res.status(200).json({msg: "Logged Out Successfully", logout: true}) //Checking if the data has been updated

        }
        catch(e){
            // res.status(200).json({msg: "Logging Out Error", logout: false})
            console.log("Logging out error", e);
        }
    };
    logout();

});



app.post("/createhotel",(req, res)=>{
    console.log(req.body);

    async function saveHotelData(){
        let hotel_name = req.body.hotel_name;
        let hotel_email = req.body.hotel_email;
        let hotel_password = req.body.hotel_password;
        try{
            console.log(req.body);
            let data = await HotelData.create({
                hotel_name: hotel_name,
                hotel_email: hotel_email,
                hotel_password : hotel_password,
            });
            let token = await data.generateAuthToken();
            // console.log("Token in Backend", token); // Checking if token is retrieveing in backend 
            // console.log("Data Saved", data);  // Checking if data is saved in database
            res.status(201).json({msg: "Hotel Account Created Successfully", token : token, status: true, id: data._id});
            // console.log(data);
            // res.send("Hotel Data Saved Successfully");
        }
        catch(e){
            console.log("Hotel Data saving error", e);
            if(e.code === 11000){
                res.status(201).json({msg: "This email already exists, kindly use different Email for Creating Hotel Account.", token : "", status: false, id: ""});
            }
            else{
                res.status(201).json({msg: "Error while Creating Hotel Account", token : "", status: false, id: ""});
            }
        }
    };
    saveHotelData();
});



app.post("/updateHotel", upload.single("hotel_logo") ,(req, res)=>{
    // console.log(req);
    console.log(req.body);
    console.log(req.file);

    async function saveHotelData(){
        try{
            
            let r = await cloudinary.uploader.upload(__dirname+"/public/hotellogos/"+req.file.filename);
            let hotel_logo = r.secure_url;
            let hotel_contact_no = req.body.hotel_contact_no;
            let hotel_city = req.body.hotel_city;
            let hotel_add = req.body.hotel_add;
            let hotel_des = req.body.hotel_des;
            let hotel_id = req.body.hotel_id;
            // console.log( "Hotel logo" ,hotel_logo);
            // console.log("hotel name", hotel_name);


            let data = await HotelData.findByIdAndUpdate({_id: hotel_id},{
                $set:{
                hotel_logo: hotel_logo,
                hotel_contact_no :hotel_contact_no,
                hotel_city :hotel_city,
                hotel_add : hotel_add,
                hotel_des : hotel_des,
                hotel_status : "completed"
                }
            });
            let token = await data.generateAuthToken();
            fs.unlink(__dirname+"/public/hotellogos/"+req.file.filename, ()=>{console.log("Hotel Logo deleted")});
            // console.log("Token in Backend", token); // Checking if token is retrieveing in backend 
            // console.log("Data Saved", data);  // Checking if data is saved in database
            res.status(201).json({msg: "Account Created Successfully", status: true,});
            // console.log(data);
            // res.send("Hotel Data Saved Successfully");
        }
        catch(e){
            console.log("Hotel Data saving error", e);
            res.status(201).json({msg: "Error while Creating Hotel Account", status: false});
        }
    };
    saveHotelData();
});


// app.get("/createroom", (req, res)=>{
//     res.render("upload")
// })

app.post("/createroom" ,(req, res)=>{
    console.log(req.body);
    let room_title = req.body.room_title;
    let room_price = req.body.room_price;
    let room_dis_price = req.body.room_dis_price;
    let room_bed =  req.body.room_bed; 
    let room_type =req.body.room_type;
    let policy =req.body.room_policy.split("|");
    let room_policy = policy;
    let room_add = req.body.room_add;
    let room_des = req.body.room_des;
    let token = req.body.token;
    async function saveRoomData(){
        try{
            // finding hotel data 
            
            let verify = await verification({token: token});

            let hotelData= await HotelData.findOne({_id: verify._id});
            console.log(hotelData);

            //Saving hotel important datas into variable
            let hotel_id = hotelData._id;
            let hotel_name = hotelData.hotel_name;
            let hotel_logo = hotelData.hotel_logo;
            let hotel_contact_no = hotelData.hotel_contact_no;
            let hotel_data = {
                hotel_id,
                hotel_name,
                hotel_logo,
                hotel_contact_no
            };
            
            //now creating a room collection and adding all required room data (getting from frontend) and hotel data
            let data = await RoomData.create({
                room_title: room_title,
                room_add : room_add,
                room_city : hotelData.hotel_city,
                room_price: room_price,
                room_dis_price: room_dis_price,
                room_policy: room_policy,
                room_bed: room_bed,
                room_type: room_type,
                room_des : room_des,
                hotel_id: hotelData._id,
                hotel_data : hotel_data
            });
            hotelData.total_hotel_rooms = hotelData.total_hotel_rooms + 1;

            let room = {
                room_id: data._id,
                room_title: data.room_title,
                room_dis_price: data.room_dis_price,
                room_price: data.room_price,
                room_city: data.room_city,
                room_add: data.room_add,
                room_bed: data.room_bed,
                room_type : data.room_type,
                admin_access : data.admin_access,
                room_status : data.room_status
            }
            hotelData.hotel_rooms =  hotelData.hotel_rooms.concat(room);
           await hotelData.save();
            console.log("Room data", data);
            res.status(201).json({msg: "Room Created Successfully",room_id: data._id,  status: true,});
        }
        catch(e){
            console.log("Room Data saving error", e);
            res.status(201).json({msg: "Error while Creating Hotel Account",room_id: "", status: false});
        }
    };
    saveRoomData();
});

app.post("/updateroom" ,(req, res)=>{
    console.log(req.body);
    let room_title = req.body.room_title;
    let room_price = req.body.room_price;
    let room_dis_price = req.body.room_dis_price;
    let room_bed =  req.body.room_bed; 
    let room_type =req.body.room_type;
    let policy =req.body.room_policy.split("|");
    let room_policy = policy;
    let room_add = req.body.room_add;
    let room_des = req.body.room_des;
    let token = req.body.token;
    let room_id = req.body.room_id;
    console.log(req.body);
    async function saveRoomData(){
        try{
            // finding hotel data 
            
            let verify = await verification({token: token});

            let hotelData= await HotelData.findOne({_id: verify._id});
            console.log(hotelData);

            //Saving hotel important datas into variable
            
            //now creating a room collection and adding all required room data (getting from frontend) and hotel data
            let data = await RoomData.findByIdAndUpdate({_id: room_id},
                
            {
                $set: {
                      room_title: room_title,
                    room_add : room_add,
                    room_city : hotelData.hotel_city,
                    room_price: room_price,
                    room_dis_price: room_dis_price,
                    room_policy: room_policy,
                    room_bed: room_bed,
                    room_type: room_type,
                    room_des : room_des,
                    }
            }

            );


            let room = {
                room_id: room_id,
                room_title: room_title,
                room_dis_price: room_dis_price,
                room_price: room_price,
                room_city: data.room_city,
                room_add: room_add,
                room_bed: room_bed,
                room_type : room_type,
                admin_access : data.admin_access,
                room_status : data.room_status
            }
            // console.log("Room id", room_id)
           let a = hotelData.hotel_rooms.map((val, i)=>{
                if(val.room_id === room_id){
                    return(room)
                }
                else{
                    return(val)
                }
            });
            console.log(a)
            hotelData.hotel_rooms =  a;
           await hotelData.save();
            console.log("Room data", data);
            res.status(201).json({msg: "Room Data Updated Successfully",room_id: data._id,  status: true,});
        }
        catch(e){
            console.log("Room Data saving error", e);
            res.status(201).json({msg: "Error while Creating Hotel Account",room_id: "", status: false});
        }
    };
    saveRoomData();
});



// upload2.fields([{name: "img1" }, {name: "img2" } , {name: "img3" }, {name: "img4" }, {name: "img5" }, {name: "img6" }])

app.post("/uploadroomimage" , (req, res)=>{
    console.log( "images" , req.files);
    console.log( "Image", req.files.img1[0])
    async function uploadImg(){
        try{   
            const room_id = req.body.room_id;
            console.log("PArams", room_id);
            let files = req.files;
            // console.log(files);
            console.log("Start uploading image on cloudinary");
            let i1 = await cloudinary.uploader.upload(__dirname+"\\"+req.files.img1[0].path);
            let i2 = await cloudinary.uploader.upload(__dirname+"\\"+req.files.img2[0].path);
            let i3 = await cloudinary.uploader.upload(__dirname+"\\"+req.files.img3[0].path);
            let i4 = await cloudinary.uploader.upload(__dirname+"\\"+req.files.img4[0].path);
            let i5 = await cloudinary.uploader.upload(__dirname+"\\"+req.files.img5[0].path);
            let i6 = await cloudinary.uploader.upload(__dirname+"\\"+req.files.img6[0].path);
            console.log("Saved uploading image on cloudinary");
            let img_arr = [
                i1.secure_url,
                i2.secure_url,
                i3.secure_url,
                i4.secure_url,
                i5.secure_url,
                i6.secure_url,
            ]
            console.log("Image url on cloudinary", img_arr)
            // console.log(img_arr);
            let main_img =  i1.secure_url;
            let data = await RoomData.findByIdAndUpdate({_id: room_id}, {
                $set:{
                    room_main_img : main_img,
                    room_images : img_arr,
                }
            });
            console.log( "Room Data" ,data);
            let hotel_data = await HotelData.findOne({_id: data.hotel_data[0].hotel_id});
            console.log( "Hotel Data" ,hotel_data);
            let rooms= hotel_data.hotel_rooms;
            // console.log(room_id, " ", req.body.room_id);
            let d = rooms.map((val)=>{
                if(val.room_id === room_id){
                    val.room_pic = main_img;
                    return(val);
                }
                else{
                    return(val)
                }
            });
            hotel_data.hotel_rooms  = d;
            console.log("Saved room pic on hotel data");
            await hotel_data.save();
            // fs.unlink(__dirname+"\\"+req.files.img1[0].path, ()=>{console.log("Image 1 deleted")});
            // fs.unlink(__dirname+"\\"+req.files.img2[0].path, ()=>{console.log("Image 2 deleted")});
            // fs.unlink(__dirname+"\\"+req.files.img3[0].path, ()=>{console.log("Image 3 deleted")});
            // fs.unlink(__dirname+"\\"+req.files.img4[0].path, ()=>{console.log("Image 4 deleted")});
            // fs.unlink(__dirname+"\\"+req.files.img5[0].path, ()=>{console.log("Image 5 deleted")});
            // fs.unlink(__dirname+"\\"+req.files.img6[0].path, ()=>{console.log("Image 6 deleted")});
            res.status(201).json({msg: "Room Images Saved", status: true,});

        }
        catch(e){
            console.log("Image uploading error", e);
            res.status(201).json({msg: "Saving Room Images Unsuccessfull", status: false,});
        }
    };
    uploadImg()
});


// app.post("/uploadroomimage", 
//     upload2.fields([{ name: "img1" }, { name: "img2" }, { name: "img3" }, { name: "img4" }, { name: "img5" }, { name: "img6" }]),
//     (req, res) => {
//       async function uploadImg() {
//         try {   
//           const room_id = req.body.room_id;
//           let files = req.files;
//           let img_arr = [];
//           for (let key in files) {
//             if (files.hasOwnProperty(key)) {
//               let result = await cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
//                 if (error) {
//                   throw new Error(error);
//                 }
//                 return result;
//               }).end(files[key][0].buffer);
//               img_arr.push(result.secure_url);
//             }
//           }
          
//           let main_img = img_arr[0];
//           let data = await RoomData.findByIdAndUpdate({ _id: room_id }, {
//             $set: {
//               room_main_img: main_img,
//               room_images: img_arr,
//             }
//           });
  
//           let hotel_data = await HotelData.findOne({ _id: data.hotel_data[0].hotel_id });
//           let rooms = hotel_data.hotel_rooms;
//           let d = rooms.map((val) => {
//             if (val.room_id === room_id) {
//               val.room_pic = main_img;
//               return val;
//             } else {
//               return val;
//             }
//           });
//           hotel_data.hotel_rooms = d;
//           await hotel_data.save();
  
//           res.status(201).json({ msg: "Room Images Saved", status: true });
  
//         } catch (e) {
//           console.log("Image uploading error", e);
//           res.status(201).json({ msg: "Saving Room Images Unsuccessful", status: false });
//         }
//       }
//       uploadImg();
//     }
//   );

app.post("/find/rooms", (req, res)=>{
    async function findRooms(){
        try{
            let verify = await verification({token: req.body.token});
            console.log(verify);
            let data = await RoomData.find({hotel_id: verify._id}).select({room_policy: 0, room_des: 0, room_images: 0, reservationDetails: 0 }).sort({ creationData: -1 });;
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            }
        }
        catch(e){
            console.log("Rooms Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findRooms();
});

app.post("/room/change/", (req, res)=>{
    async function changeStatus(){
        let {admin_access, room_id} = req.body;
        console.log(req.body)
        try{
            if(admin_access === "restricted"){
                let updateData = await RoomData.findByIdAndUpdate({_id: room_id}, {
                    $set: {room_status : "active"}
                })
                console.log(updateData);
                res.status(200).json({status:true, current_access: "active" });
            }
            else{
                let updateData = await RoomData.findByIdAndUpdate({_id: room_id}, {
                    $set: {room_status : "restricted"}
                })
                console.log(updateData);
                res.status(200).json({status:true, current_access: "restricted" });
            }
        }
        catch(e){
            console.log("Room Status Chengin Error", e);
            res.status(400).json({status:false, current_access: "" });
        }
    };
    changeStatus();
});


app.get("/f/room/:id", (req, res)=>{
    let id = req.params.id;
    async function findRooms(){
        try{
            let data = await RoomData.findOne({_id : id});
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Hotel Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findRooms();
});

app.get("/u/room/:id", (req, res)=>{
    let id = req.params.id;
    async function findRooms(){
        try{
            let data = await RoomData.findOne({_id : id}).select({});
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Hotel Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findRooms();
});

app.post("/pendingreservation", (req, res)=>{
    async function findPendingReservation(){
        let {token} = req.body;
        console.log(req.body);
        try{
            
            let verify = await verification({token: token});
            let data = await ReservationDetails.find({$and: [{hotel_id: verify._id},{reservation_status : "pending"}]}).sort({ creationData: 1 });
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Pending Reservation Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findPendingReservation();
});
app.post("/confirmedreservation", (req, res)=>{
    async function findConfirmReservation(){
        try{
            let {token} = req.body;
            let verify = await verification({token: token});
            let data = await ReservationDetails.find({$and: [{hotel_id: verify._id},{reservation_status : "confirmed"}]}).sort({ creationData: 1 });;
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Confirmed Reservation Data Found Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findConfirmReservation();
});
app.post("/closereservation", (req, res)=>{
    async function findCloseReservation(){
        try{
            let {token} = req.body;
            let verify = await verification({token: token});
            let data = await ReservationDetails.find({$and: [{hotel_id: verify._id},{reservation_status : "closed"}]}).sort({ creationData: 1 });;
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Hotel Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findCloseReservation();
});
app.post("/cancelreservation", (req, res)=>{
    async function findCancelReservation(){
        try{
            let {token} = req.body;
            // console.log(token);
            let verify = await verification({token: token});
            let data = await ReservationDetails.find({$and: [{hotel_id: verify._id},{reservation_status : "cancelled"}]}).sort({ creationData: 1 });;
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Hotel Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findCancelReservation();
});

app.post("/confirmreservation", (req, res)=>{
    async function confirmReservation(){
        let {room_id ,reservation_id, } = req.body;
        console.log(req.body);
        try{
            let reservation = await ReservationDetails.findByIdAndUpdate({_id: reservation_id}, {
                $set: {
                    reservation_status : "confirmed"
                }
            });
            console.log(reservation);
            let room = await RoomData.findOne({_id: room_id});
            room.reservationDetails.filter((val, i)=>{
                if(val._id === reservation_id){
                    val.reservation_status = "confirmed";
                    return(val);
                }
                else{
                    return(val)
                }
            });
            room.room_total_revenue+=reservation.total_price;
            let hotelData = await HotelData.findOne({_id: room.hotel_data[0].hotel_id});
            hotelData.hotel_total_revenue +=  reservation.total_price;
            await room.save();
            await hotelData.save();
            res.status(200).json({msg: "Room has been Confirmed" , status: true});
        }
        catch(e){
            console.log("Error, while confirming reservation.", e);
            res.status(200).json({msg: "Some Error Occured while confirming the reservation" , status: false});
        }
    };
    confirmReservation();
});

app.post("/cancelreservation2", (req, res)=>{
    async function cancelReservation(){
        let {room_id ,reservation_id , current_status} = req.body;
        console.log(req.body);
        try{
            if(current_status === "confirmed"){
                let reservation = await ReservationDetails.findByIdAndUpdate({_id: reservation_id}, {
                    $set: {
                        reservation_status : "cancelled"
                    }
                });
                console.log(reservation);
                let room = await RoomData.findOne({_id: room_id});
                console.log(room);
                let r = room.reservationDetails.filter((val, i)=>{
                    if(val._id !== reservation_id){
                        console.log("Yes");
                        return(val);
                    }
                    else{
                        return(0)
                    }
                });
                console.log(r);
                let total_revenue = room.room_total_revenue;
                total_revenue -= reservation.total_price;
                let reservationcancelled = await RoomData.findByIdAndUpdate({_id: room_id}, {
                    $set: {
                        reservationDetails: r,
                        room_total_revenue: total_revenue
                    }
                });
                console.log(reservationcancelled);
                let hotelData = await HotelData.findOne({_id: room.hotel_data[0].hotel_id});
                hotelData.hotel_total_revenue -=  reservation.total_price;
                await hotelData.save();
                res.status(200).json({msg: "Room has been Confirmed" , status: true});
            }
            else{
                let reservation = await ReservationDetails.findByIdAndUpdate({_id: reservation_id}, {
                    $set: {
                        reservation_status : "cancelled"
                    }
                });
                console.log(reservation);
                let room = await RoomData.findOne({_id: room_id});
                console.log(room);
                let r = room.reservationDetails.filter((val, i)=>{
                    if(val._id !== reservation_id){
                        return(val);
                    }
                    else{
                        return(0)
                    }
                });
                console.log(r);
                let reservationcancelled = await RoomData.findByIdAndUpdate({_id: room_id}, {
                    $set: {
                        reservationDetails: r
                    }
                });
                console.log(reservationcancelled);
                res.status(200).json({msg: "Room has been Confirmed" , status: true});

            }
            
        }
        catch(e){
            console.log("Error, while Cancelling reservation.", e);
            res.status(200).json({msg: "Some Error Occured while confirming the reservation" , status: false});

        }
    };
    cancelReservation();
});

app.post("/closereservation", (req, res)=>{
    async function closeReservation(){
        let {room_id ,reservation_id } = req.body;
        try{
            let reservation = await ReservationDetails.findByIdAndUpdate({_id: reservation_id}, {
                $set: {
                    reservation_status : "closed"
                }
            });
            console.log(reservation);
            let room = await RoomData.findOne({_id: room_id});
            let r = room.reservationDetails.filter((val, i)=>{
                if(val._id !== reservation_id){
                    return(val);
                }
                else{
                    return(0)
                }
            });
            // await room.save();
            console.log(r.length);
            let reservationcancelled = await RoomData.findByIdAndUpdate({_id: room_id}, {
                $set: {
                    reservationDetails: r
                }
            });
            console.log(reservationcancelled);
            res.status(200).json({msg: "Room has been Closed" , status: true});
        }
        catch(e){
            console.log("Error, while Closing the reservation.", e);
            res.status(200).json({msg: "Some Error Occured while Closing the reservation" , status: false});

        }
    };
    closeReservation();
});

app.post('/search', (req, res)=>{
    let {token, type, query, query_type} = req.body;
    console.log(req.body);
    async function search(){
        try{
            let verify = await verification({token: token});
            if(type === "rooms"){
                if(query_type === "id"){
                    let data = await   RoomData.find({$and: [{hotel_id: verify._id}, {_id : query}]}).select({room_policy: 0, room_des: 0, room_images: 0, reservationDetails: 0 });
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else{
                    let q = query.toLowerCase();
                    let data = await   RoomData.find({$and: [{hotel_id: verify._id}, {room_title : {$regex : q}}]}).select({room_policy: 0, room_des: 0, room_images: 0, reservationDetails: 0 });
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }

            }
            
            else{
                console.log("Error, please search again!")
            }
        }
        catch(e){
            console.log("Error while searching data", e);
        }
    };
    search();
});


app.post('/search/reservations', (req, res)=>{
    let {token,type, query, query_type} = req.body;
    console.log(req.body);
    async function searchReservations(){
        try{
            let verify = await verification({token: token});
            if(type === "pending"){
                if(query_type === "reservation_id"){
                    let data = await ReservationDetails.find({$and: [ {hotel_id: verify._id} ,{reservation_status : "pending"}, {_id: query}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else if(query_type === "user_id"){
                    let data = await ReservationDetails.find( {$and: [{hotel_id: verify._id} ,{reservation_status : "pending"},{user_id : query}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else if(query_type === "user_name"){
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{hotel_id: verify._id} ,{reservation_status : "pending"},{user_name : {$regex: q}}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else{
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{hotel_id: verify._id} ,{reservation_status : "pending"},{user_cnic : q}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
            }

            //Confirm Reservation Search
            else if(type === "confirm"){
                if(query_type === "reservation_id"){
                    let data = await ReservationDetails.find({$and: [{hotel_id: verify._id} ,{reservation_status : "confirmed"}, {_id: query}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else if(query_type === "user_id"){
                    let data = await ReservationDetails.find( {$and: [{hotel_id: verify._id} ,{reservation_status : "confirmed"},{user_id : query}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else if(query_type === "user_name"){
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{hotel_id: verify._id} ,{reservation_status : "confirmed"},{user_name : {$regex: q}}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else{
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{hotel_id: verify._id} ,{reservation_status : "confirmed"},{user_cnic : q}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
            }

            //Close Reservation Search
            else if(type === "close"){
                if(query_type === "reservation_id"){
                    let data = await ReservationDetails.find({$and: [{hotel_id: verify._id} ,{reservation_status : "closed"}, {_id: query}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else if(query_type === "user_id"){
                    let data = await ReservationDetails.find( {$and: [{hotel_id: verify._id} ,{reservation_status : "closed"},{user_id : query}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else if(query_type === "user_name"){
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{hotel_id: verify._id} ,{reservation_status : "closed"},{user_name : {$regex: q}}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else{
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{hotel_id: verify._id} ,{reservation_status : "closed"},{user_cnic : q}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
            }

            //Cancel Reservation Search
            else if(type === "cancel"){
                if(query_type === "reservation_id"){
                    let data = await ReservationDetails.find({$and: [{hotel_id: verify._id} ,{reservation_status : "cancelled"}, {_id: query}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else if(query_type === "user_id"){
                    let data = await ReservationDetails.find( {$and: [{hotel_id: verify._id} ,{reservation_status : "cancelled"},{user_id : query}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else if(query_type === "user_name"){
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{hotel_id: verify._id} ,{reservation_status : "cancelled"},{user_name : {$regex: q}}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else{
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{hotel_id: verify._id} ,{reservation_status : "cancelled"},{user_cnic : q}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
            }
            //Cancel Reservation Closed


            else{
                console.log("Error, please search for Reservation again!")
            }
        }
        catch(e){
            console.log("Error while searching data", e);
        }
    };
    searchReservations();
});


app.post("/getHotelData", (req, res)=>{
    let {token} = req.body;
    async function getData(){
        try{
            let verify = await verification({token: token});
            let data = await HotelData.findOne({$and: [{admin_access: "active"}, {_id: verify._id}]}).select({_id: 1, hotel_name : 1, hotel_contact_no: 1, hotel_add: 1, hotel_des: 1});
            if(data!== null){
                res.status(200).json({msg: "Found Data", status: true, data:data});
            }
            else{
                res.status(200).json({msg: "Data Not Found", status: false, data:[]});
            }
        }
        catch(e){
            console.log("Error while fetching hotel data", e)
        }
    };
    getData();

});

app.post("/updateHotelData", upload.single("hotel_logo") ,(req, res)=>{
    // console.log(req);
    console.log(req.body);

    async function saveHotelData(){
        try{
            
            let hotel_contact_no = req.body.hotel_contact_no;
            let hotel_add = req.body.hotel_add;
            let hotel_des = req.body.hotel_des;
            let hotel_id = req.body.hotel_id;
                let hotel_name = req.body.hotel_name;


            let data = await HotelData.findByIdAndUpdate({_id: hotel_id},{
                $set:{
                    hotel_name: hotel_name,
                hotel_contact_no :hotel_contact_no,
                hotel_add : hotel_add,
                hotel_des : hotel_des,
                }
            });
            console.log("Data Saved", data);  // Checking if data is saved in database
            res.status(201).json({msg: "Data Updated Successfully", status: true,});
        }
        catch(e){
            console.log("Hotel Data saving error", e);
            res.status(201).json({msg: "Error while Creating Hotel Account", status: false});
        }
    };
    saveHotelData();
});

app.listen(PORT, ()=>{
    console.log(`Server is active on port ${PORT}`);
})