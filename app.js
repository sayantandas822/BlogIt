var express = require("express");
var app = express();
var bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: true });
var mongoose = require("mongoose");
var methodOverride = require("method-override");
var expressSanitizer = require("express-sanitizer");
const user = require('./model.js');
var nodemailer = require('nodemailer');
var path=require("path");
//app.set("views", path.join(__dirname));

//mongoose.connect("mongodb://localhost/restful_blog_app",{useNewUrlParser: true,useUnifiedTopology: true});

//mongoose.set('useFindAndModify', false);


app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(expressSanitizer());
app.use(methodOverride("_method"));




const passport = require('passport');

const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const async = require('async');
const crypto = require('crypto');
const flash=require('connect-flash');


//const server = require('http').Server(app);
app.use(urlencodedParser);

app.use(cookieParser('secret'));
app.use(session({secret: 'secret', maxAge:3600000, saveUninitialized: true, resave: true}));

app.use(passport.initialize());
app.use(passport.session());
var localstrategy = require('passport-local').Strategy;

mongoose.connect('mongodb+srv://sayantan_das:DAS_SSSS_06200221@cluster0.ztzaz.mongodb.net/test?retryWrites=true&w=majority',{
    useNewUrlParser:true,useUnifiedTopology:true
}).then(()=>console.log("database connected")).catch(err => console.log("Can't connect to database "+err));



app.use(flash())
app.use(function(req,res,next){
    res.locals.success_message=req.flash('success_message');//they are always available otherwise empty
    res.locals.error_message=req.flash('error_message');
    res.locals.error=req.flash('error');
    next();
});

const checkauth=function(req,res,next){
    if(req.isAuthenticated()){
        console.log("authenticated")
        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0');
        next();
    }
    else{
        console.log("not authenticated")
        res.redirect("/home");
    }
}
const checkauthenticated=function(req,res,next){
    if(req.isAuthenticated()){
        console.log("authenticated")
        //res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0');
        next();
    }
    else{
        console.log("not authenticated")
        res.redirect("/signin");
    }
}

// const ifauth=function(req,res,next){
//     if(req.isAuthenticated()){
//         console.log("authenticated")
//         res.redirect("/");
//         next();
//     }
//     else{
//         console.log("not authenticated")
//         res.redirect("/signin");
//     }
// }

//---------------------------------------------------

app.get("/signin",(req,res)=>{
    if(req.user){
        res.redirect("/");
    }
    console.log("this is signin page")
    res.render("signin");
})

app.get("/signup",(req,res)=>{
    if(req.user){
        res.redirect("/");
    }
    res.render("signup", {err: undefined});
})

app.get("/home", function(req, res){
    blog.find({}, function(err, blogs){
        if(err){
            console.log("Error");
        }
        else{
            res.render("index", {blogs: blogs, user: ""});
        }
    });
});


app.get('/logout', function(req, res){
    var name = req.user.username;
    console.log("LOGGIN OUT " + req.user.username)
    req.logout();
    // req.session.destroy(function (err) {
    //     res.redirect('/');
    // });
    res.redirect('/');
    req.session.notice = "You have successfully been logged out " + name + "!";
});


app.get("/users/:username",checkauth,(req,res)=>{
    console.log("this is user page")
    // res.redirect("/temp_details");
    blog.find({}, function(err, blogs){
        if(err){
            console.log("Error");
        }
        else{
            res.render("index", {blogs: blogs, user: req.user.username});
        }
    });
})

app.get("/",checkauth,(req,res)=>{
    // res.redirect("/temp_details");
    console.log("this is no page")
    console.log("hiii")
    // redirecttouser(req.user.username)
    res.redirect(`/users/${req.user.username}`);
})



app.post('/signup', urlencodedParser, function (req, res) {
    var {username,email,password,confirmpassword}=req.body;
    var err;
    if(!username||!email||!password){
        err="Please fill all the details !";
        res.render("signup",{err:err});
    }
    if(password!=confirmpassword){
        err="Password and Confirm password do not match !";
        res.render("signup",{err:err});
    }
    if( typeof err=="undefined"){
        user.findOne({email:email},function(err,data){
            if (err){
                console.log("error in finding user");
                console.log(err);
            }
            if(data){
                err="User already exists !";
                res.render("signup",{err:err});
            }else{
                bcrypt.genSalt(10,(err,salt)=>{
                    if(err){
                        console.log("error in salting");
                        console.log(err);
                    }
                    bcrypt.hash(password,salt,(err,hash)=>{
                        if(err){
                            console.log("error in hashing");
                            console.log(err);
                        }
                        password=hash;
                        user({email,username,password}).save((err,data)=>{
                            if(err) throw err;
                            req.flash("success_message","Registered successfully");
                            res.redirect("/signin");
                        });
                    })
                })
            }
        });
    }
    // const msg=req.body.mesg;
    // console.log(msg);
})  


passport.use(new localstrategy({usernameField:'email'},(email,password,done)=>{
    // console.log("hi");
    user.findOne({email:email},(err,data)=>{
        if(err){
            console.log("an error occurred");
            console.log(err)
        }
        if(!data){
            // console.log("user not found");
            return done(null,false,{ message: "User Doesn't Exist !" });
        }
        bcrypt.compare(password,data.password,(err,match)=>{
            if(err){
                // console.log("error");
                console.log(err);
                return done(null,false);
            }
            if(!match){
                // console.log("wrong password");
                return done(null,false,{ message: "Password doesn't match !" });
            }
            if(match){
                // console.log("user found");
                return done(null,data);
            }
        })
    });
}));

passport.serializeUser(function(user,done){
    done(null,user.id);
});

passport.deserializeUser(function(id,done){
    user.findById(id,function(err,user){
        done(err,user);
    });
});

app.post('/signin',function (req, res, next) {
    // var {email,password}=req.body;
    console.log(req.body.email);
    passport.authenticate('local',{
        failureRedirect:"/signin",
        successRedirect:"/",
        failureFlash: true,
    })(req,res,next);
    // const msg=req.body.mesg;
    // console.log(msg);
 })  

//-----------------------------------------------------

//----------------------------------

app.get('/forgot', function(req, res) {
    res.render('forgot-password', {
      User: req.user
    });
});

app.post('/forgot', function(req, res, next) {
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function(token, done) {
            user.findOne({ email: req.body.email }, function(err, data) {
                if (!data) {
                    req.flash('error_message', 'No account with that email address exists.');
                    return res.redirect('/forgot');
                }
  
                data.resetPasswordToken = token;
                data.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
                data.save(function(err) {
                    done(err, token, data);
                });
            });
        },
        function(token, user, done) {
            var smtpTransport = nodemailer.createTransport("smtps://founditoutbychance%40gmail.com:"+encodeURIComponent('sdas21062002') + "@smtp.gmail.com:465");
            var mailOptions = {
                to: user.email,
                from: 'founditoutbychance@gmail.com',
                subject: 'Reset your Password',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        'http://' + "localhost:3000" + '/reset/' + token + '\n\n' +
                        'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                req.flash('success_message', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
                done(err, 'done');
            });
        }
    ], function(err) {
            if (err) return next(err);
            res.redirect('/forgot');
        });
});

app.get('/reset/:token', function(req, res) {
    user.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, data) {
        if (!data) {
            req.flash('error_message', 'Password reset token is invalid or has expired 1');
            return res.redirect('/forgot');
        }
        res.render('reset-password', {
            token: req.params.token,
            user: req.user
        });
    });
});

app.post('/reset/:token', function(req, res) {
    async.waterfall([
        function(done) {
            console.log(req.params.token);
            user.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, data) {
                console.log(err);
                if (!data) {
                    req.flash('error_message', 'Password reset token is invalid or has expired');
                    return res.redirect('/forgot');
                }
                var pass=req.body.password;
                var conpass=req.body.confirmpassword;
                if (!pass || !conpass || (pass != conpass)) {
                    req.flash('error_message', 'Passwords dont match !');
                    data.resetPasswordToken = undefined;
                    data.resetPasswordExpires = undefined;
                    data.save(function(err) {
                        return res.redirect('/forgot');
                    });
                }
                bcrypt.genSalt(10,(err,salt)=>{
                    if(err){
                        console.log("error in salting");
                        console.log(err);
                    }
                    bcrypt.hash(pass,salt,(err,hash)=>{
                        if(err){
                            console.log("error in hashing");
                            console.log(err);
                        }
                        data.password = hash;
                        data.resetPasswordToken = undefined;
                        data.resetPasswordExpires = undefined;
                        data.save(function(err) {
                            // req.logIn(data, function(err) {
                            done(err, data);
                            // });
                        });
                    })
                })
  
                // data.password = req.body.password;
                // data.resetPasswordToken = undefined;
                // data.resetPasswordExpires = undefined;
  
            });
        },
        function(user, done) {
            // var smtpTransport = nodemailer.createTransport('SMTP', {
            //     service: 'gmail',
            //     auth: {
            //         user: 'ghoshsanchita656@gmail.com',
            //         pass: 'Sanchita@123'
            //     }
            // });
            var smtpTransport = nodemailer.createTransport("smtps://founditoutbychance%40gmail.com:"+encodeURIComponent('sdas21062002') + "@smtp.gmail.com:465");
            var mailOptions = {
                to: user.email,
                from: 'founditoutbychance@gmail.com',
                subject: 'Your password has been changed',
                text: 'Hello,\n\n' +
                    'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                req.flash('success_message', 'Success! Your password has been changed.Login');
                done(err);
            });
      }
    ], function(err) {
      res.redirect('/signin');
    });
});

//-----------------------------------


var blogSchema = new mongoose.Schema({
    title: String,
    image: String,
    body: String,
    created: {type: Date, default: Date.now}
});
// MONGOOSE/MODEL CONFIG
var blog = mongoose.model("blog", blogSchema);
// Routes
/* app.get("/", function(req, res){
    res.redirect("/blogs");
});
 */
// INDEX ROUTE

app.get("/blogs", function(req, res){
    blog.find({}, function(err, blogs){
        if(err){
            console.log("Error");
        }
        else{
            res.render("index", {blogs: blogs, user: req.user.username});
        }
    });
});

app.get("/blogs/new", function(req, res){
    res.render("new", {user: req.user.username});
});

// CREATE ROUTE
app.post("/blogs", function(req, res){
    req.body.blog.body = req.sanitize(req.body.blog.body);
    blog.create(req.body.blog, function(err, newBlog){
        if(err){
            res.render("new");
        }
        else{
            res.redirect("/blogs");
        }
    });
});

//SHOW ROUTE
app.get("/blogs/:id", function(req, res){
    blog.findById(req.params.id, function(err, foundBlog){
        console.log(foundBlog);
        if(err){
            res.redirect("/blogs");
        }
        else{
            res.render("show", {blog: foundBlog, user: undefined});
        }
    });
});

app.get("/blogs/:id/edit", function(req, res){
    blog.findById(req.params.id, function(err, foundBlog){
        if(err){
            res.redirect("/blogs");
        }
        else{
            res.render("edit", {blog: foundBlog, user: req.user.username});
        }
    });
})

//Update Route
app.put("/blogs/:id", function(req, res){
    req.body.blog.body = req.sanitize(req.body.blog.body);
    blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updatedBlog){
        if(err){
            res.redirect("/blogs");
        }
        else{
            res.redirect("/blogs/"+req.params.id);
        }
    });
});

app.delete("/blogs/:id", function(req, res){
    blog.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/blogs");
        }
        else{
            blog.find({}, function(err, blogs){
                if(err){
                    console.log("Error");
                }
                else{
                    res.render("index", {blogs: blogs, user: req.user.username});
                }
            });
        }
    });
});

app.listen(3000, function(){
    console.log("server is running");
});