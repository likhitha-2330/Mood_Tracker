const express = require("express")
const bodyParser = require("body-parser")
const path = require("path")
const mongoose = require("mongoose")
const { User } = require("./models/UserModel")
const session = require("express-session")
const bcrypt=require("bcrypt")
const PDFDocument = require("pdfkit");

const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT
const app = express()

mongoose.connect(process.env.MONGO_URI)

app.use(express.json());
app.set("view engine","ejs")
app.use(bodyParser.urlencoded({extended:true}))
app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } 
}));
app.set("views",path.join(__dirname,"views"))
app.use(express.static(path.join(__dirname, "public")));

app.get("/",(req,res)=>{
    res.render("Login")
})

app.post("/",async(req,res)=>{
    const {Username,Password}=req.body
    console.log(req.body)
    const user= await User.findOne({Username})
    if(!user){
        return res.render("Login",{msg:"No user found"})
    }
    const isValid = await bcrypt.compare(Password,user.Password)
    if(!isValid){ 
        return res.render("Login",{msg:"Password Incorrect"})
    }
    req.session.user={id:user._id,Username:user.Username,entries:user.entries}
    res.redirect("/home")
    
})

app.post("/pass",async (req,res)=>{
    if(!req.session.user){
        res.redirect("/")
    }
    const {Current,New}=req.body
    const user = await User.findOne({Username:req.session.user.Username})
    const isValid = await bcrypt.compare(Current,user.Password)
    if(!isValid){
        return res.render("Profile",{Name:req.session.user.Username,msg: "Current Password Incorrect"})
    }
    user.Password=await bcrypt.hash(New,10)
    await user.save()
    res.render("Profile",{Name:req.session.user.Username})
})

app.get("/export",async (req,res)=>{
    if(!req.session.user){
        res.redirect("/")
    }
    const doc = new PDFDocument();
    const user = await User.findOne({Username:req.session.user.Username})

    res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${user.Username}_CJ_data.pdf`);

  doc.pipe(res);

  
    doc.text(`Name: ${user.Username}\nEmail: ${user.Email}\nAge: ${user.Age}\n\n`);
  

  doc.text("Entries: \n\n")
  user.entries.forEach((item,index)=>{
    doc.text(`${index+1}. Mood: ${item.mood}\n Note: ${item.note}\n Created At: ${item.createdAt}\n\n`)
  })

  doc.end();
})

app.get("/signUp",async(req,res)=>{
    res.render("SignUp")
})

app.post("/edit1",async (req,res)=>{
    if(!req.session.user){
        return res.redirect("/")
    }
    console.log(req.body)
    let {UserName, Age, Email, Password}=req.body
    let user=await User.findOne({Username: req.session.user.Username})
        if(!UserName){
        UserName = user.Username 
    }
    if(!Age){
        Age=user.Age
    }
    if(!Email){
        Email=user.Email
    }
    const isValid = await bcrypt.compare(Password,user.Password)
    if(isValid){
         await User.findOneAndUpdate(
  { Username: req.session.user.Username },     
  { $set: { Username: UserName, Age: Age, Email: Email} }, 
  { new: true });
  req.session.user.Username=UserName
res.redirect("/profile")
    }
    else{
        return res.render("Profile",{Name:req.session.user.Username,msg: "Current Password Incorrect"})
    }    
  


})


app.get("/delete",async(req,res)=>{
    if(!req.session.user){
        return res.redirect("/")
    }
    const user=await User.findOneAndDelete({Username: req.session.user.Username})
    req.session.destroy(); 
    res.redirect("/")
})

app.post("/signUp",async(req,res)=>{
    
    const {Username,Password, Age, Email}=req.body
    const user1= await User.findOne({Username})
    if(user1){
        return res.render("SignUp",{msg:"User already exists"})
    }

    const EMAIL1= await User.findOne({Email})
    if(EMAIL1){
        return res.render("SignUp",{msg:"Email already exists"})
    }

    const hashedPass=await bcrypt.hash(Password,10)
    const user=new User({Username,Password:hashedPass, Age, Email})
    await user.save()
    res.redirect("/")
})

app.get("/home",(req,res)=>{
    if(!req.session.user){
        res.redirect("/")
    }
    const user=req.session.user
    res.render("Home",{user:user,Name:user.Username})
    
})


app.post("/home",async (req,res)=>{
    if(!req.session.user){
        res.redirect("/")
    }
    const {mood,note}=req.body
    const user = await User.findOne({ Username: req.session.user.Username })
    user.entries.push({mood,note})
    user.save()

    res.redirect("/profile")
})

const moodOrder = ['Sad', 'Angry', 'Played', 'Loved', 'Playful', 'Happy'];

app.get("/Reports", async (req, res) => {
    const user1 = req.session.user;
    if (!user1) {
        return res.redirect("/");
    }
    const user = await User.findOne({ Username: user1.Username });
    const streak = calculateStreak(user.entries);

    const moodCounts = {};
    user.entries.forEach(e => {
        if (!moodCounts[e.mood]) moodCounts[e.mood] = 0;
        moodCounts[e.mood]++;
    });

    const trendLabels = [];
    const moodScores = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        trendLabels.push(key);

        const count = user.entries.filter(e => new Date(e.createdAt).toISOString().slice(0,10) === key).length;
        moodScores.push(count);
    }

    const sortedEntries = user.entries.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.render("Reports", {
        Name: user.Username,
        Entries: sortedEntries,
        Days: streak,
        moodCounts: JSON.stringify(moodCounts),
        moodScores: JSON.stringify(moodScores),
        trendLabels: JSON.stringify(trendLabels),
    });
});

app.post("/Reports", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/");
    }
    const { noteId } = req.body;
    const user = await User.findOne({ Username: req.session.user.Username });
    if (!user) {
        return res.redirect("/");
    }
    user.entries = user.entries.filter(entry => entry._id.toString() !== noteId);
    await user.save();
    req.session.user = user;
    res.redirect("/Reports");
});

app.get("/profile", async (req, res) => {
  if (!req.session.user) return res.redirect("/");
  const user = await User.findOne({ Username: req.session.user.Username });
  const streak = calculateStreak(user.entries);
  res.render("Profile", {
    Name: user.Username,
    Age: user.Age,
    Email: user.Email,
    Days: streak,
    msg: req.session.msg
  });
});

app.post("/logout", (req, res) => {
    if(!req.session.user){
        res.redirect("/")
    }
  req.session.destroy(() => {
    res.redirect("/");
  });
});

function calculateStreak(entries) {
    if (!entries || entries.length === 0) return 0;
    const sorted = entries
        .filter(e => e.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    let streak = 0;
    let current = new Date();
    current.setHours(0,0,0,0); 

    for (let i = 0; i < sorted.length; ) {
        const entryDate = new Date(sorted[i].createdAt);
        entryDate.setHours(0,0,0,0);
        if (entryDate.getTime() === current.getTime()) {
            streak++;
            while (i < sorted.length && new Date(sorted[i].createdAt).setHours(0,0,0,0) === current.getTime()) {
                i++;
            }
            current.setDate(current.getDate() - 1);
        } else if (entryDate.getTime() < current.getTime()) {
            break;
        } else {
            i++;
        }
    }
    return streak;
}

app.listen(PORT,()=>{
    console.log(`http://localhost:${PORT}`)
})
