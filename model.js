const mongoose=require("mongoose");

const userschema=new mongoose.Schema({
    email:{
        type : String,
        required: true,
        unique:true
    },
    username:{
        type : String,
        required: true
    },
    password:{
        type : String,
        required: true
    },
    resetPasswordToken:{type:String},
    resetPasswordExpires:{type:Date},
    tasks:[{
        type : String,
    }]
});


module.exports=new mongoose.model('user', userschema);