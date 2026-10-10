let posts=[],cart=[],filter="All";
const $=s=>document.querySelector(s);
const SIZES=["0.5 lb","1 lb","1.5 lb","2 lb","2.5 lb","3 lb","4 lb","5 lb","6 lb","7 lb","8 lb","9 lb","10 lb"];
async function load(){posts=await (await fetch("/api/posts")).json();render();}
function render(){
 let q=($("#search").value||"").toLowerCase();
 let arr=posts.filter(p=>(filter==="All"||p.category===filter||p.category.toLowerCase().includes(filter.toLowerCase()))&&((p.title+" "+p.description+" "+p.category).toLowerCase().includes(q)));
 if($("#sort").value==="name")arr.sort((a,b)=>a.title.localeCompare(b.title));
 $("#grid").innerHTML=arr.map(p=>`<article class="card" onclick="openPost(${p.id})"><div class="pic">${p.media?(p.media_type==="video"?`<video src="${p.media}" muted></video>`:`<img src="${p.media}" alt="${esc(p.title)}">`):`<span class="cakeShape"></span>`}<span class="tag">${esc(p.category)}</span></div><div class="details"><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><button class="orderNow" onclick="event.stopPropagation();add(${p.id})">Order Now</button></div></article>`).join("");
 $("#empty").hidden=arr.length>0;
}
function esc(x){return String(x||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function openPost(id){
 let p=posts.find(x=>x.id===id);if(!p)return;
 $("#modalBody").innerHTML=`<div class="modalContent"><div class="modalMedia">${p.media?(p.media_type==="video"?`<video controls src="${p.media}" style="max-width:100%;max-height:390px"></video>`:`<img src="${p.media}" style="max-width:100%;max-height:390px;object-fit:contain">`):`<span class="cakeShape" style="transform:scale(1.5)"></span>`}</div><div class="modalText"><label>${esc(p.category)}</label><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p><div class="post-actions"><button class="btn dark" onclick="add(${p.id})">Order This Cake →</button><button class="shareBtn" onclick="sharePost(${p.id})">↗ Share</button></div><div class="ratingBox"><b>Rate this cake</b><div class="stars" data-id="${p.id}">${[1,2,3,4,5].map(n=>`<button onclick="ratePost(${p.id},${n})">☆</button>`).join("")}</div><div id="ratingInfo">${p.rating_count?`★ ${Number(p.rating_avg).toFixed(1)} / 5 (${p.rating_count} ratings)`:"Be the first to rate"}</div></div><div class="comments"><h3>Comments</h3><div id="commentList"><p class="muted">Loading comments…</p></div><form onsubmit="commentPost(event,${p.id})"><input name="name" required placeholder="Your name"><textarea name="comment" required placeholder="Write a comment..."></textarea><button class="btn dark" type="submit">Post Comment</button></form></div></div></div>`;
 openModal("#modal");loadComments(p.id);loadRating(p.id);
}
async function loadComments(id){try{let r=await fetch(`/api/posts/${id}/comments`),a=await r.json();let el=$("#commentList");if(!el)return;el.innerHTML=a.length?a.map(c=>`<div class="comment"><b>${esc(c.name)}</b><small>${new Date(c.created_at).toLocaleDateString()}</small><p>${esc(c.comment)}</p></div>`).join(""):"<p class='muted'>No comments yet.</p>";}catch(e){}}
async function loadRating(id){try{let r=await fetch(`/api/posts/${id}/rating`),d=await r.json();let info=$("#ratingInfo");if(info)info.textContent=d.rating_count?`★ ${Number(d.rating_avg).toFixed(1)} / 5 (${d.rating_count} ratings)`:"Be the first to rate";}catch(e){}}
async function ratePost(id,rating){let r=await fetch(`/api/posts/${id}/rating`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rating})});let d=await r.json();if(!r.ok)return alert(d.error||"Could not rate");let info=$("#ratingInfo");if(info)info.textContent=`★ ${Number(d.rating_avg).toFixed(1)} / 5 (${d.rating_count} ratings)`;}
async function commentPost(e,id){e.preventDefault();let body=Object.fromEntries(new FormData(e.target));let r=await fetch(`/api/posts/${id}/comments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});let d=await r.json();if(!r.ok)return alert(d.error||"Could not comment");e.target.reset();loadComments(id);}
async function sharePost(id){let p=posts.find(x=>x.id===id);let url=location.origin+`/#post-${id}`;try{if(navigator.share)await navigator.share({title:p.title,text:p.description,url});else{await navigator.clipboard.writeText(url);alert("Post link copied.");}}catch(e){}}
function add(id){let p=posts.find(x=>x.id===id);if(!p)return;let x=cart.find(a=>a.id===id);if(x)x.qty++;else cart.push({id,qty:1,size:"1 lb"});renderCart();openDrawer();}
function renderCart(){$("#count").textContent=cart.reduce((a,x)=>a+x.qty,0);$("#cartItems").innerHTML=cart.length?cart.map(x=>{let p=posts.find(a=>a.id===x.id);return `<div class="cartrow"><div class="thumb">🍰</div><div><h4>${esc(p.title)}</h4><small>${esc(p.category)} • Qty ${x.qty}</small><select onchange="setSize(${p.id},this.value)">${SIZES.map(s=>`<option ${s===x.size?"selected":""}>${s}</option>`).join("")}</select></div><button onclick="removeItem(${p.id})">×</button></div>`}).join(""):`<div style="padding:50px;text-align:center;color:#877b75">Your order is empty.</div>`;}
function setSize(id,size){let x=cart.find(a=>a.id===id);if(x)x.size=size;}
function removeItem(id){cart=cart.filter(x=>x.id!==id);renderCart();}
function openDrawer(){closeModalOnly();$("#drawer").classList.add("open");$("#shade").classList.add("show")}
function openModal(s){$("#shade").classList.add("show");$(s).classList.add("open")}
function closeModalOnly(){document.querySelectorAll(".modal").forEach(x=>x.classList.remove("open"))}
function closeAll(){$("#drawer").classList.remove("open");closeModalOnly();$("#shade").classList.remove("show")}
function closeCheckout(){closeModalOnly();if(!$("#drawer").classList.contains("open"))$("#shade").classList.remove("show")}
function checkout(){if(!cart.length)return alert("Please select a cake first.");$("#drawer").classList.remove("open");renderCheckoutItems();openModal("#checkout")}
function renderCheckoutItems(){$("#selectedCakes").innerHTML=cart.map(x=>{let p=posts.find(a=>a.id===x.id);return `<div class="selectedCake"><div><b>${esc(p.title)}</b><small>${esc(p.category)}</small></div><label>Size<select onchange="setSize(${p.id},this.value)">${SIZES.map(s=>`<option ${s===x.size?"selected":""}>${s}</option>`).join("")}</select></label><label>Qty<input type="number" min="1" max="20" value="${x.qty}" onchange="setQty(${p.id},this.value)"></label></div>`}).join("");}
function setQty(id,v){let x=cart.find(a=>a.id===id);if(x)x.qty=Math.max(1,Math.min(20,Number(v)||1));renderCart();renderCheckoutItems();}
$("#search").addEventListener("input",render);$("#sort").addEventListener("change",render);
document.querySelectorAll(".filters button").forEach(b=>b.onclick=()=>{filter=b.dataset.cat;document.querySelectorAll(".filters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");render()});
document.querySelectorAll(".occasionGrid button").forEach(b=>b.onclick=()=>{filter=b.dataset.cat;document.querySelectorAll(".filters button").forEach(x=>x.classList.toggle("active",x.dataset.cat===filter));render();$("#cakes").scrollIntoView({behavior:"smooth"})});
$("#orderForm").onsubmit=async e=>{e.preventDefault();let f=new FormData(e.target),items=cart.map(x=>{let p=posts.find(a=>a.id===x.id);return {title:p.title,category:p.category,size:x.size,qty:x.qty}});let body=Object.fromEntries(f.entries());body.items=items;let r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});let d=await r.json();if(!r.ok)return alert(d.error||"Order failed");window.location.href=d.whatsapp;cart=[];renderCart();e.target.reset();closeAll();};
load();renderCart();
