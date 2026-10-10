const express=require("express");
const path=require("path");
const fs=require("fs");
const crypto=require("crypto");
const { createClient } = require("@supabase/supabase-js");
const multer=require("multer");
const cookieParser=require("cookie-parser");
const nodemailer=require("nodemailer");

const PORT=process.env.PORT||10000;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"ChangeMe-2026!";
const SESSION_SECRET=process.env.SESSION_SECRET||crypto.randomBytes(32).toString("hex");
const SUPABASE_URL=process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
 console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.");
 process.exit(1);
}
const supabase=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const STORAGE_BUCKET=process.env.SUPABASE_STORAGE_BUCKET||"cake-media";

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
const seed=[
["Fudge Cake For Birthday","Chocolate fudge birthday cake","Chocolate"],["Dream Choco Photo Cake","Personalised photo cake with chocolate finish","Photo Cakes"],["Delightful Birthday Chocolate Fudge Cake","Rich chocolate birthday favourite","Birthday"],["Chocolaty Red Velvet Cake","Soft red velvet with cream finish","Red Velvet"],["Tiramisu Temptation Birthday Cake","Creamy tiramisu-inspired celebration cake","Tiramisu"],["Red Velvet Cake For Birthday","Classic red velvet birthday cake","Red Velvet"],["Dubai Chocolate Cake","Premium chocolate celebration cake","Chocolate"],["Vanilla Berry Cake For Birthday","Vanilla cake with berry-inspired finish","Vanilla"],["Congratulations Yummy Rocher Cake","Hazelnut-chocolate celebration cake","Premium"],["Delicious Chocolate Berry Cake","Chocolate and berry celebration cake","Chocolate"],["Lotus Biscoff Cake For Birthday","Biscoff-inspired birthday cake","Premium"],["Rainbow Cloud Chocolate Fudge Cake","Colourful designer chocolate cake","Designer"],["Teddy Birthday Chocolate Cake","Cute teddy-themed birthday cake","Kids"],["Mango Mirror Glaze Cake","Mango cake with glossy finish","Mango"],["Chocolate Feast Cake","Chocolate lover's celebration cake","Chocolate"],["Half Kg Tiramisu Cake For Birthday","Tiramisu-style celebration cake","Tiramisu"],["Dinosaur Theme Chocolate Fudge Cake","Kids dinosaur themed cake","Kids"],["Colorful Heart Shaped Birthday Cake","Heart-shaped celebration cake","Birthday"],["Jellycat Croissant Theme Chocolate Cake","Cute themed designer cake","Designer"],["Minecraft World Cake","Gaming themed celebration cake","Kids"],["Happy Birthday Tin Cake","Compact birthday cake","Birthday"],["Red Velvet Dreams Cake","Premium red velvet cake","Red Velvet"],["Truffle Brownie Fudge Delight Cake","Brownie-inspired chocolate cake","Chocolate"],["Special Mango Cheesecake","Creamy mango cheesecake","Cheesecake"],["Mango Bliss Bubble Cake","Mango designer celebration cake","Mango"],["Comical Treat Birthday Cake","Fun cartoon-style birthday cake","Kids"],["Vanilla Fruit Cake","Fresh-style vanilla fruit cake","Vanilla"],["Blueberry Cheesecake","Creamy blueberry cheesecake","Cheesecake"],["Heart Shaped Chocolate Cartoon Cake","Chocolate cartoon themed cake","Kids"],["Black Forest Celebration Cake","Classic black forest style cake","Chocolate"]
];
async function initData(){
 const {error:bucketError}=await supabase.storage.createBucket(STORAGE_BUCKET,{public:true,fileSizeLimit:150*1024*1024,allowedMimeTypes:["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"]});
 if(bucketError && !String(bucketError.message||"").toLowerCase().includes("already exists")) console.warn("Storage bucket setup:",bucketError.message);
 for(const [key,value] of Object.entries(defaults)){
  const {data,error}=await supabase.from("settings").select("key").eq("key",key).maybeSingle();
  if(error) throw error;
  if(!data){const r=await supabase.from("settings").insert({key,value});if(r.error)throw r.error;}
 }
 const {data:posts,error}=await supabase.from("posts").select("id").limit(1);
 if(error)throw error;
 if(!posts.length){
  const rows=seed.map((x,i)=>({title:x[0],description:x[1],category:x[2],featured:i<8?1:0,media:"",media_type:"image"}));
  const r=await supabase.from("posts").insert(rows);if(r.error)throw r.error;
 }
}

function settings(){return supabase.from("settings").select("key,value").then(({data,error})=>{if(error)throw error;return Object.fromEntries((data||[]).map(x=>[x.key,x.value]));});}
function auth(req,res,next){ if(req.cookies.bb_admin===crypto.createHmac("sha256",SESSION_SECRET).update("admin").digest("hex")) return next(); res.status(401).json({error:"Unauthorized"}); }
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:150*1024*1024},fileFilter:(req,file,cb)=>{
 const ok=/^image\/(jpeg|png|webp|gif)|^video\/(mp4|webm|quicktime)$/.test(file.mimetype);
 cb(ok?null:new Error("Only image/video files are allowed"),ok);
}});

const app=express();
app.use(express.json({limit:"2mb"})); app.use(express.urlencoded({extended:true})); app.use(cookieParser());
app.get("/manifest.webmanifest",(req,res)=>{res.type("application/manifest+json").sendFile(path.join(__dirname,"public","manifest.webmanifest"));});
app.use(express.static(path.join(__dirname,"public")));

app.get("/api/settings",async(req,res)=>{try{res.json(await settings());}catch(e){res.status(500).json({error:e.message});}});
app.get("/api/posts",async(req,res)=>{try{
 const q=String(req.query.q||"").trim(),cat=String(req.query.category||"").trim();
 let query=supabase.from("posts").select("*").order("featured",{ascending:false}).order("id",{ascending:false});
 if(q)query=query.or(`title.ilike.%${q.replace(/[%_,]/g," ")}%,description.ilike.%${q.replace(/[%_,]/g," ")}%,category.ilike.%${q.replace(/[%_,]/g," " )}%`);
 if(cat&&cat!=="All")query=query.eq("category",cat);
 const {data:rows,error}=await query;if(error)throw error;
 const {data:ratings,error:re}=await supabase.from("ratings").select("post_id,rating");if(re)throw re;
 const stats={};for(const r of ratings||[]){stats[r.post_id] ||= {sum:0,count:0};stats[r.post_id].sum+=Number(r.rating);stats[r.post_id].count++;}
 res.json((rows||[]).map(p=>({...p,rating_avg:stats[p.id]?.sum/stats[p.id]?.count||0,rating_count:stats[p.id]?.count||0})))
 }catch(e){console.error(e);res.status(500).json({error:"Could not load posts"});}});
app.get("/api/posts/:id/rating",async(req,res)=>{try{const {data,error}=await supabase.from("ratings").select("rating").eq("post_id",req.params.id);if(error)throw error;const a=data||[];res.json({rating_avg:a.length?a.reduce((s,x)=>s+Number(x.rating),0)/a.length:0,rating_count:a.length});}catch(e){res.status(500).json({error:e.message});}});
app.post("/api/posts/:id/rating",async(req,res)=>{try{const rating=Number(req.body?.rating);if(!Number.isInteger(rating)||rating<1||rating>5)return res.status(400).json({error:"Rating must be 1-5."});const {error}=await supabase.from("ratings").insert({post_id:Number(req.params.id),rating});if(error)throw error;const {data}=await supabase.from("ratings").select("rating").eq("post_id",req.params.id);const a=data||[];res.json({rating_avg:a.reduce((s,x)=>s+Number(x.rating),0)/a.length,rating_count:a.length});}catch(e){res.status(400).json({error:e.message});}});
app.get("/api/posts/:id/comments",async(req,res)=>{try{const {data,error}=await supabase.from("comments").select("id,name,comment,created_at").eq("post_id",req.params.id).order("id",{ascending:false});if(error)throw error;res.json(data||[]);}catch(e){res.status(500).json({error:e.message});}});
app.post("/api/posts/:id/comments",async(req,res)=>{try{const name=String(req.body?.name||"").trim(),comment=String(req.body?.comment||"").trim();if(!name||!comment)return res.status(400).json({error:"Name and comment are required."});if(name.length>80||comment.length>1000)return res.status(400).json({error:"Comment is too long."});const {data,error}=await supabase.from("comments").insert({post_id:Number(req.params.id),name,comment}).select("id").single();if(error)throw error;res.json({ok:true,id:data.id});}catch(e){res.status(400).json({error:e.message});}});
app.post("/api/orders",async(req,res)=>{try{
 const {customer_name,phone,email,address,note,items,payment_method,transaction_id}=req.body||{};
 if(!customer_name||!phone||!items)return res.status(400).json({error:"Name, phone and order items are required."});
 const {data:order,error}=await supabase.from("orders").insert({customer_name,phone,email:email||"",address:address||"",note:note||"",items:JSON.stringify(items),payment_method:payment_method||"",transaction_id:transaction_id||""}).select("id").single();if(error)throw error;
 const s=await settings();let emailSent=false;
 if(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS){try{const transporter=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:String(process.env.SMTP_SECURE||"false")==="true",auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});await transporter.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:s.email,subject:`New Bake & Bite Order #${order.id}`,text:`New order #${order.id}\nName: ${customer_name}\nPhone: ${phone}\nEmail: ${email||""}\nAddress: ${address||""}\nPayment: ${payment_method||""}\nTransaction ID: ${transaction_id||""}\nItems: ${JSON.stringify(items,null,2)}\nNote: ${note||""}`});emailSent=true;}catch(e){console.error("SMTP error",e.message);}}
 const orderItems=typeof items==="string"?JSON.parse(items||"[]"):items;const itemLines=(Array.isArray(orderItems)?orderItems:[]).map((it,i)=>`${i+1}. ${it.title||"Cake"}\n   Category: ${it.category||"Cakes"}\n   Size: ${it.size||"Not specified"}\n   Quantity: ${it.qty||1}${it.image?`\n   Cake photo: ${it.image}`:""}`).join("\n\n");
 const msg=encodeURIComponent(`Hello Bake & Bite by Marjan! I'd like to place this order.\n\nORDER #${order.id}\nCustomer: ${customer_name}\nPhone/WhatsApp: ${phone}\nEmail: ${email||"Not provided"}\nDelivery address: ${address||"Not provided"}\n\nCAKE DETAILS\n${itemLines||"Please confirm cake details."}\n\nSpecial request: ${note||"None"}\nPayment method: ${payment_method||"To be discussed"}`);
 res.json({ok:true,order_id:order.id,emailSent,whatsapp:`https://wa.me/${String(s.whatsapp||"+8801880610740").replace(/\D/g,"")}?text=${msg}`});
 }catch(e){console.error(e);res.status(500).json({error:"Could not save order"});}});

app.get("/admin",(req,res)=>res.sendFile(path.join(__dirname,"public","admin.html")));
app.post("/api/admin/login",(req,res)=>{
 if(req.body.password!==ADMIN_PASSWORD) return res.status(401).json({error:"Wrong password"});
 const token=crypto.createHmac("sha256",SESSION_SECRET).update("admin").digest("hex");
 res.cookie("bb_admin",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:1000*60*60*24*7});
 res.json({ok:true});
});
app.post("/api/admin/logout",(req,res)=>{res.clearCookie("bb_admin");res.json({ok:true});});
app.get("/api/admin/posts",auth,async(req,res)=>{const {data,error}=await supabase.from("posts").select("*").order("id",{ascending:false});if(error)return res.status(500).json({error:error.message});res.json(data||[]);});
app.get("/api/admin/orders",auth,async(req,res)=>{const {data,error}=await supabase.from("orders").select("*").order("id",{ascending:false});if(error)return res.status(500).json({error:error.message});res.json(data||[]);});
app.get("/api/admin/settings",auth,async(req,res)=>{try{res.json(await settings());}catch(e){res.status(500).json({error:e.message});}});
app.put("/api/admin/settings",auth,async(req,res)=>{try{const body=req.body||{};for(const [key,value] of Object.entries(body)){const {error}=await supabase.from("settings").upsert({key,value:String(value??"")},{onConflict:"key"});if(error)throw error;}res.json(await settings());}catch(e){res.status(400).json({error:e.message});}});
app.post("/api/admin/posts",auth,upload.single("media"),async(req,res)=>{try{
 const {title,description,category,featured}=req.body;if(!title)return res.status(400).json({error:"Title required"});let media="",type="image";
 if(req.file){const ext=path.extname(req.file.originalname).toLowerCase()|| (req.file.mimetype.startsWith("video/")?".mp4":".jpg");const name=`${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;const {error:upErr}=await supabase.storage.from(STORAGE_BUCKET).upload(name,req.file.buffer,{contentType:req.file.mimetype,upsert:false});if(upErr)throw upErr;const {data:urlData}=supabase.storage.from(STORAGE_BUCKET).getPublicUrl(name);media=urlData.publicUrl;type=req.file.mimetype.startsWith("video/")?"video":"image";}
 const {data,error}=await supabase.from("posts").insert({title,description:description||"",category:category||"Cakes",media,media_type:type,featured:featured?1:0}).select("id").single();if(error)throw error;res.json({ok:true,id:data.id});
 }catch(e){console.error(e);res.status(400).json({error:e.message||"Could not create post"});}});
app.delete("/api/admin/posts/:id",auth,async(req,res)=>{try{const {data:p,error:findErr}=await supabase.from("posts").select("media").eq("id",req.params.id).maybeSingle();if(findErr)throw findErr;if(p?.media&&p.media.includes("/storage/v1/object/public/"+STORAGE_BUCKET+"/")){const name=p.media.split("/storage/v1/object/public/"+STORAGE_BUCKET+"/")[1];if(name)await supabase.storage.from(STORAGE_BUCKET).remove([decodeURIComponent(name)]);}const {error}=await supabase.from("posts").delete().eq("id",req.params.id);if(error)throw error;res.json({ok:true});}catch(e){res.status(400).json({error:e.message});}});
app.patch("/api/admin/orders/:id",auth,async(req,res)=>{const {error}=await supabase.from("orders").update({status:req.body.status||"new"}).eq("id",req.params.id);if(error)return res.status(400).json({error:error.message});res.json({ok:true});});
app.use((err,req,res,next)=>{console.error(err);res.status(400).json({error:err.message||"Request failed"});});
initData().then(()=>app.listen(PORT,()=>console.log(`Bake & Bite running on port ${PORT}`))).catch(e=>{console.error("Supabase initialization failed:",e.message);process.exit(1);});
