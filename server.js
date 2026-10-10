const express=require("express");
const path=require("path");
const fs=require("fs");
const crypto=require("crypto");
const Database=require("better-sqlite3");
const multer=require("multer");
const cookieParser=require("cookie-parser");
const nodemailer=require("nodemailer");

const PORT=process.env.PORT||10000;
const DATA_DIR=process.env.DATA_DIR||path.join(__dirname,"data");
const DB_FILE=process.env.DB_FILE||path.join(DATA_DIR,"bakebite.sqlite");
const UPLOAD_DIR=process.env.UPLOAD_DIR||path.join(DATA_DIR,"uploads");
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"ChangeMe-2026!";
const SESSION_SECRET=process.env.SESSION_SECRET||crypto.randomBytes(32).toString("hex");
fs.mkdirSync(DATA_DIR,{recursive:true}); fs.mkdirSync(UPLOAD_DIR,{recursive:true});

const db=new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS posts(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL, description TEXT DEFAULT '', category TEXT DEFAULT 'Cakes',
 media TEXT DEFAULT '', media_type TEXT DEFAULT 'image', featured INTEGER DEFAULT 0,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders(
 id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT, phone TEXT, email TEXT,
 address TEXT, note TEXT, items TEXT, payment_method TEXT, transaction_id TEXT,
 status TEXT DEFAULT 'new', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ratings(
 id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, rating INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS comments(
 id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, name TEXT NOT NULL, comment TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);
const defaults={
 brand:"Bake & Bite by Marjan",
 phone:"+8801880610740",
 whatsapp:"+8801880610740",
 email:"marjanchybc@gmail.com",
 location:"Chattogram, Bangladesh",
 facebook:"https://www.facebook.com/share/1BchmfWfnV/",
 bkash:"",
 nagad:"",
 rocket:"",
 payment_note:"Payment details will be confirmed after order review.",
 currency:"BDT"
};
for(const [k,v] of Object.entries(defaults)){
 if(!db.prepare("SELECT 1 FROM settings WHERE key=?").get(k)) db.prepare("INSERT INTO settings(key,value) VALUES(?,?)").run(k,v);
}
const seed=[
["Fudge Cake For Birthday","Chocolate fudge birthday cake","Chocolate"],
["Dream Choco Photo Cake","Personalised photo cake with chocolate finish","Photo Cakes"],
["Delightful Birthday Chocolate Fudge Cake","Rich chocolate birthday favourite","Birthday"],
["Chocolaty Red Velvet Cake","Soft red velvet with cream finish","Red Velvet"],
["Tiramisu Temptation Birthday Cake","Creamy tiramisu-inspired celebration cake","Tiramisu"],
["Red Velvet Cake For Birthday","Classic red velvet birthday cake","Red Velvet"],
["Dubai Chocolate Cake","Premium chocolate celebration cake","Chocolate"],
["Vanilla Berry Cake For Birthday","Vanilla cake with berry-inspired finish","Vanilla"],
["Congratulations Yummy Rocher Cake","Hazelnut-chocolate celebration cake","Premium"],
["Delicious Chocolate Berry Cake","Chocolate and berry celebration cake","Chocolate"],
["Lotus Biscoff Cake For Birthday","Biscoff-inspired birthday cake","Premium"],
["Rainbow Cloud Chocolate Fudge Cake","Colourful designer chocolate cake","Designer"],
["Teddy Birthday Chocolate Cake","Cute teddy-themed birthday cake","Kids"],
["Mango Mirror Glaze Cake","Mango cake with glossy finish","Mango"],
["Chocolate Feast Cake","Chocolate lover's celebration cake","Chocolate"],
["Half Kg Tiramisu Cake For Birthday","Tiramisu-style celebration cake","Tiramisu"],
["Dinosaur Theme Chocolate Fudge Cake","Kids dinosaur themed cake","Kids"],
["Colorful Heart Shaped Birthday Cake","Heart-shaped celebration cake","Birthday"],
["Jellycat Croissant Theme Chocolate Cake","Cute themed designer cake","Designer"],
["Minecraft World Cake","Gaming themed celebration cake","Kids"],
["Happy Birthday Tin Cake","Compact birthday cake","Birthday"],
["Red Velvet Dreams Cake","Premium red velvet cake","Red Velvet"],
["Truffle Brownie Fudge Delight Cake","Brownie-inspired chocolate cake","Chocolate"],
["Special Mango Cheesecake","Creamy mango cheesecake","Cheesecake"],
["Mango Bliss Bubble Cake","Mango designer celebration cake","Mango"],
["Comical Treat Birthday Cake","Fun cartoon-style birthday cake","Kids"],
["Vanilla Fruit Cake","Fresh-style vanilla fruit cake","Vanilla"],
["Blueberry Cheesecake","Creamy blueberry cheesecake","Cheesecake"],
["Heart Shaped Chocolate Cartoon Cake","Chocolate cartoon themed cake","Kids"],
["Black Forest Celebration Cake","Classic black forest style cake","Chocolate"]
];
if(db.prepare("SELECT COUNT(*) c FROM posts").get().c===0){
 const ins=db.prepare("INSERT INTO posts(title,description,category,featured) VALUES(?,?,?,?)");
 const tx=db.transaction(()=>seed.forEach((x,i)=>ins.run(x[0],x[1],x[2],i<8?1:0))); tx();
}

function settings(){return Object.fromEntries(db.prepare("SELECT key,value FROM settings").all().map(x=>[x.key,x.value]));}
function auth(req,res,next){ if(req.cookies.bb_admin===crypto.createHmac("sha256",SESSION_SECRET).update("admin").digest("hex")) return next(); res.status(401).json({error:"Unauthorized"}); }
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const storage=multer.diskStorage({destination:(req,file,cb)=>cb(null,UPLOAD_DIR),filename:(req,file,cb)=>{
 const ext=path.extname(file.originalname).toLowerCase(); cb(null,Date.now()+"-"+crypto.randomBytes(5).toString("hex")+ext);
}});
const upload=multer({storage,limits:{fileSize:150*1024*1024},fileFilter:(req,file,cb)=>{
 const ok=/^image\/(jpeg|png|webp|gif)|^video\/(mp4|webm|quicktime)$/.test(file.mimetype);
 cb(ok?null:new Error("Only image/video files are allowed"),ok);
}});

const app=express();
app.use(express.json({limit:"2mb"})); app.use(express.urlencoded({extended:true})); app.use(cookieParser());
app.use("/uploads",express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname,"public")));

app.get("/api/settings",(req,res)=>res.json(settings()));
app.get("/api/posts",(req,res)=>{
 const q=String(req.query.q||"").trim(), cat=String(req.query.category||"").trim();
 let sql="SELECT * FROM posts WHERE 1=1", args=[];
 if(q){sql+=" AND (title LIKE ? OR description LIKE ? OR category LIKE ?)"; const x="%"+q+"%";args.push(x,x,x);}
 if(cat&&cat!=="All") {sql+=" AND category=?";args.push(cat);}
 sql+=" ORDER BY featured DESC, id DESC";
 const rows=db.prepare(sql).all(...args);
 const stats=db.prepare("SELECT post_id, AVG(rating) rating_avg, COUNT(*) rating_count FROM ratings GROUP BY post_id").all();
 const map=Object.fromEntries(stats.map(x=>[x.post_id,x]));
 res.json(rows.map(p=>({...p,rating_avg:map[p.id]?.rating_avg||0,rating_count:map[p.id]?.rating_count||0})));
});
app.get("/api/posts/:id/rating",(req,res)=>{const r=db.prepare("SELECT AVG(rating) rating_avg, COUNT(*) rating_count FROM ratings WHERE post_id=?").get(req.params.id);res.json({rating_avg:r.rating_avg||0,rating_count:r.rating_count||0});});
app.post("/api/posts/:id/rating",(req,res)=>{const rating=Number(req.body?.rating);if(!Number.isInteger(rating)||rating<1||rating>5)return res.status(400).json({error:"Rating must be 1-5."});db.prepare("INSERT INTO ratings(post_id,rating) VALUES(?,?)").run(req.params.id,rating);const r=db.prepare("SELECT AVG(rating) rating_avg, COUNT(*) rating_count FROM ratings WHERE post_id=?").get(req.params.id);res.json({rating_avg:r.rating_avg||0,rating_count:r.rating_count||0});});
app.get("/api/posts/:id/comments",(req,res)=>res.json(db.prepare("SELECT id,name,comment,created_at FROM comments WHERE post_id=? ORDER BY id DESC").all(req.params.id)));
app.post("/api/posts/:id/comments",(req,res)=>{const name=String(req.body?.name||"").trim(),comment=String(req.body?.comment||"").trim();if(!name||!comment)return res.status(400).json({error:"Name and comment are required."});if(name.length>80||comment.length>1000)return res.status(400).json({error:"Comment is too long."});const r=db.prepare("INSERT INTO comments(post_id,name,comment) VALUES(?,?,?)").run(req.params.id,name,comment);res.json({ok:true,id:r.lastInsertRowid});});
app.post("/api/orders",async(req,res)=>{
 const {customer_name,phone,email,address,note,items,payment_method,transaction_id}=req.body||{};
 if(!customer_name||!phone||!items) return res.status(400).json({error:"Name, phone and order items are required."});
 const result=db.prepare(`INSERT INTO orders(customer_name,phone,email,address,note,items,payment_method,transaction_id) VALUES(?,?,?,?,?,?,?,?)`)
 .run(customer_name,phone,email||"",address||"",note||"",JSON.stringify(items),payment_method||"",transaction_id||"");
 const s=settings();
 let emailSent=false;
 if(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS){
  try{
   const transporter=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:String(process.env.SMTP_SECURE||"false")==="true",auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
   await transporter.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:s.email,subject:`New Bake & Bite Order #${result.lastInsertRowid}`,text:`New order #${result.lastInsertRowid}\nName: ${customer_name}\nPhone: ${phone}\nEmail: ${email||""}\nAddress: ${address||""}\nPayment: ${payment_method||""}\nTransaction ID: ${transaction_id||""}\nItems: ${JSON.stringify(items,null,2)}\nNote: ${note||""}`});
   emailSent=true;
  }catch(e){console.error("SMTP error",e.message);}
 }
 const normalizedItems=typeof items==="string"?items:JSON.stringify(items);
 const msg=encodeURIComponent(`Hi Bake & Bite by Marjan! I want to place an order.\nOrder #${result.lastInsertRowid}\nCustomer name: ${customer_name}\nPhone/WhatsApp: ${phone}\nEmail: ${email||""}\nDelivery address: ${address||""}\nCake order: ${normalizedItems}\nSpecial request: ${note||""}`);
 res.json({ok:true,order_id:result.lastInsertRowid,emailSent,whatsapp:`https://wa.me/${s.whatsapp.replace(/\D/g,"")}?text=${msg}`});
});

app.get("/admin",(req,res)=>res.sendFile(path.join(__dirname,"public","admin.html")));
app.post("/api/admin/login",(req,res)=>{
 if(req.body.password!==ADMIN_PASSWORD) return res.status(401).json({error:"Wrong password"});
 const token=crypto.createHmac("sha256",SESSION_SECRET).update("admin").digest("hex");
 res.cookie("bb_admin",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:1000*60*60*24*7});
 res.json({ok:true});
});
app.post("/api/admin/logout",(req,res)=>{res.clearCookie("bb_admin");res.json({ok:true});});
app.get("/api/admin/posts",auth,(req,res)=>res.json(db.prepare("SELECT * FROM posts ORDER BY id DESC").all()));
app.get("/api/admin/orders",auth,(req,res)=>res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC").all()));
app.get("/api/admin/settings",auth,(req,res)=>res.json(settings()));
app.put("/api/admin/settings",auth,(req,res)=>{
 const body=req.body||{}, up=db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
 const tx=db.transaction(()=>Object.entries(body).forEach(([k,v])=>up.run(k,String(v??"")))); tx(); res.json(settings());
});
app.post("/api/admin/posts",auth,upload.single("media"),(req,res)=>{
 const {title,description,category,featured}=req.body;
 if(!title)return res.status(400).json({error:"Title required"});
 let media="",type="";
 if(req.file){media="/uploads/"+req.file.filename;type=req.file.mimetype.startsWith("video/")?"video":"image";}
 const r=db.prepare("INSERT INTO posts(title,description,category,media,media_type,featured) VALUES(?,?,?,?,?,?)").run(title,description||"",category||"Cakes",media,type,featured?1:0);
 res.json({ok:true,id:r.lastInsertRowid});
});
app.delete("/api/admin/posts/:id",auth,(req,res)=>{
 const p=db.prepare("SELECT media FROM posts WHERE id=?").get(req.params.id);
 if(p?.media){const f=path.join(UPLOAD_DIR,path.basename(p.media));if(fs.existsSync(f))fs.unlinkSync(f);}
 db.prepare("DELETE FROM posts WHERE id=?").run(req.params.id);res.json({ok:true});
});
app.patch("/api/admin/orders/:id",auth,(req,res)=>{db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status||"new",req.params.id);res.json({ok:true});});
app.use((err,req,res,next)=>{console.error(err);res.status(400).json({error:err.message||"Request failed"});});
app.listen(PORT,()=>console.log(`Bake & Bite running on port ${PORT}`));
