let posts=[],cart=[],filter="All";
const $=s=>document.querySelector(s);
async function load(){posts=await (await fetch("/api/posts")).json();render();}
function render(){
 let q=($("#search").value||"").toLowerCase();
 let arr=posts.filter(p=>(filter==="All"||p.category===filter||p.category.toLowerCase().includes(filter.toLowerCase()))&&((p.title+" "+p.description+" "+p.category).toLowerCase().includes(q)));
 if($("#sort").value==="name")arr.sort((a,b)=>a.title.localeCompare(b.title));
 $("#grid").innerHTML=arr.map(p=>`<article class="card" onclick="openPost(${p.id})"><div class="pic">${p.media?(p.media_type==="video"?`<video src="${p.media}" muted></video>`:`<img src="${p.media}" alt="${esc(p.title)}">`):`<span class="cakeShape"></span>`}<span class="tag">${esc(p.category)}</span></div><div class="details"><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><button class="orderNow" onclick="event.stopPropagation();add(${p.id})">Order Now</button></div></article>`).join("");
 $("#empty").hidden=arr.length>0;
}
function esc(x){return String(x||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function openPost(id){let p=posts.find(x=>x.id===id);$("#modalBody").innerHTML=`<div class="modalContent"><div class="modalMedia">${p.media?(p.media_type==="video"?`<video controls src="${p.media}" style="max-width:100%;max-height:390px"></video>`:`<img src="${p.media}" style="max-width:100%;max-height:390px;object-fit:contain">`):`<span class="cakeShape" style="transform:scale(1.5)"></span>`}</div><div class="modalText"><label>${esc(p.category)}</label><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p><button class="btn dark" onclick="add(${p.id})">Order This Cake →</button></div></div>`;openModal("#modal");}
function add(id){let p=posts.find(x=>x.id===id);let x=cart.find(a=>a.id===id);if(x)x.qty++;else cart.push({id,qty:1});renderCart();openDrawer();}
function renderCart(){$("#count").textContent=cart.reduce((a,x)=>a+x.qty,0);$("#cartItems").innerHTML=cart.length?cart.map(x=>{let p=posts.find(a=>a.id===x.id);return `<div class="cartrow"><div class="thumb">🍰</div><div><h4>${esc(p.title)}</h4><small>${esc(p.category)} • Qty ${x.qty}</small></div><button onclick="removeItem(${p.id})">×</button></div>`}).join(""):`<div style="padding:50px;text-align:center;color:#877b75">Your order is empty.</div>`;}
function removeItem(id){cart=cart.filter(x=>x.id!==id);renderCart();}
function openDrawer(){closeModalOnly();$("#drawer").classList.add("open");$("#shade").classList.add("show")}
function openModal(s){$("#shade").classList.add("show");$(s).classList.add("open")}
function closeModalOnly(){document.querySelectorAll(".modal").forEach(x=>x.classList.remove("open"))}
function closeAll(){$("#drawer").classList.remove("open");closeModalOnly();$("#shade").classList.remove("show")}
function closeCheckout(){closeModalOnly();if(!$("#drawer").classList.contains("open"))$("#shade").classList.remove("show")}
function checkout(){if(!cart.length)return alert("Please select a cake first.");$("#drawer").classList.remove("open");openModal("#checkout")}
$("#search").addEventListener("input",render);$("#sort").addEventListener("change",render);
document.querySelectorAll(".filters button").forEach(b=>b.onclick=()=>{filter=b.dataset.cat;document.querySelectorAll(".filters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");render()});
document.querySelectorAll(".occasionGrid button").forEach(b=>b.onclick=()=>{filter=b.dataset.cat;document.querySelectorAll(".filters button").forEach(x=>x.classList.toggle("active",x.dataset.cat===filter));render();$("#cakes").scrollIntoView({behavior:"smooth"})});
$("#orderForm").onsubmit=async e=>{e.preventDefault();let f=new FormData(e.target),items=cart.map(x=>{let p=posts.find(a=>a.id===x.id);return {title:p.title,category:p.category,qty:x.qty}});let body=Object.fromEntries(f.entries());body.items=items;let r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});let d=await r.json();if(!r.ok)return alert(d.error||"Order failed");alert("Order received! WhatsApp will open now.");window.open(d.whatsapp,"_blank");cart=[];renderCart();e.target.reset();closeAll();};
load();renderCart();
