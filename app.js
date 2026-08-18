const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
const CATS=[
["Požár","#d92d20","🔥",["požár"]],
["Záchrana osob a zvířat","#d92d20","❤️",["záchrana osob","záchrana zvířat","záchrana"]],
["Dopravní nehoda","#667085","🚗",["dopravní nehoda","nehoda"]],
["Technická pomoc","#f79009","🛠️",["technická pomoc"]],
["Únik nebezpečných látek","#f79009","☢️",["únik nebezpečných látek","únik nl","nebezpečných látek"]],
["Voda / čerpání","#1570ef","💧",["voda","čerpání"]],
["Ostatní","#12b76a","🚨",["ostatní"]]
];
let places=[], incidents=[], types=[], pending=null, edit=null, adding=false, markers=new Map();
const map=L.map("map").setView([49.8175,15.473],7);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap contributors"}).addTo(map);

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const cat=type=>{const t=(type||"").toLowerCase();return CATS.find(c=>c[3].some(k=>t.includes(k)))||CATS[6]};
const today=()=>new Date().toISOString().slice(0,10);

function resetSide(){ $("side").className="empty"; $("side").innerHTML='<b>📍</b><h2>Vyber zásah</h2><p>Pro přidání klikni na „Přidat zásah“ a potom na místo v mapě.</p>'; }
function markerIcon(p){
  const list=incidents.filter(i=>i.place_id===p.id).sort((a,b)=>b.incident_date.localeCompare(a.incident_date));
  const c=cat(list[0]?.type);
  return L.divIcon({className:"",html:`<div class="marker" style="background:${c[1]}">${c[2]}<span class="count">${list.length}</span></div>`,iconSize:[34,34],iconAnchor:[17,17]});
}
function renderMarkers(){
  markers.forEach(m=>m.remove()); markers.clear();
  places.forEach(p=>{
    const m=L.marker([p.latitude,p.longitude],{icon:markerIcon(p)}).addTo(map);
    m.on("click",()=>showPlace(p.id)); markers.set(p.id,m);
  });
}
function showPlace(pid){
  const p=places.find(x=>x.id===pid); if(!p)return;
  const arr=incidents.filter(i=>i.place_id===pid).sort((a,b)=>b.incident_date.localeCompare(a.incident_date));
  const c=cat(arr[0]?.type); $("side").className="panel";
  $("side").innerHTML=`<div class="head"><div class="ico" style="background:${c[1]}">${c[2]}</div><div><h2>${esc(arr[0]?.type)}</h2><div>${arr.length} zásah${arr.length===1?"":"ů"} na tomto místě</div></div></div>
  <div class="meta"><b>Souřadnice</b><span>${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}</span></div><h3>Zásahy</h3>
  ${arr.map(i=>`<div class="record"><div class="recordtop"><strong>${esc(i.incident_date)}</strong><span>${esc(i.alarm_level)}</span></div><div><b>${esc(i.type)}</b></div><div>${esc(i.description||"Bez popisu")}</div><div style="font-size:13px;color:#667085;margin-top:7px">${i.jsdh?"☑":"☐"} JSDH &nbsp; ${i.hzs?"☑":"☐"} HZS</div><div class="actions"><button class="edit" onclick="editIncident('${i.id}')">✏️ Upravit</button><button class="danger" onclick="deleteIncident('${i.id}')">🗑️ Smazat</button></div></div>`).join("")}
  <div class="actions"><button class="primary" onclick="addTo('${pid}')">＋ Přidat zásah sem</button><button onclick="deletePlace('${pid}')">Smazat místo</button></div>`;
}
async function loadData(){
  const {data:{user}}=await sb.auth.getUser(); if(!user)return;
  const p=await sb.from("places").select("*").order("created_at",{ascending:true});
  if(p.error){alert(p.error.message);return}
  places=p.data||[];
  const i=await sb.from("incidents").select("*").order("incident_date",{ascending:false});
  if(i.error){alert(i.error.message);return}
  incidents=i.data||[];
  const t=await sb.from("incident_types").select("name").order("name");
  types=(t.data||[]).map(x=>x.name);
  $("types").innerHTML=types.map(x=>`<option value="${esc(x)}">`).join("");
  renderMarkers();
}
async function startApp(session){
  $("login").hidden=true; $("app").hidden=false; $("appTools").hidden=false; $("userEmail").textContent=session.user.email||"";
  resetSide(); await loadData();
}
async function init(){
  const {data:{session}}=await sb.auth.getSession();
  if(session) await startApp(session);
}
$("loginForm").onsubmit=async e=>{
  e.preventDefault(); $("loginMsg").textContent="Přihlašuji…";
  const {error}=await sb.auth.signInWithPassword({email:$("email").value,password:$("password").value});
  $("loginMsg").textContent=error?error.message:"";
};
$("signupBtn").onclick=async()=>{
  const email=$("email").value,password=$("password").value;
  if(!email||!password)return $("loginMsg").textContent="Vyplň e-mail a heslo.";
  $("loginMsg").textContent="Vytvářím účet…";
  const {data,error}=await sb.auth.signUp({email,password});
  $("loginMsg").textContent=error?error.message:(data.session?"Účet vytvořen.":"Účet vytvořen. Pokud je zapnuté potvrzení e-mailu, zkontroluj schránku.");
};
$("logoutBtn").onclick=async()=>{await sb.auth.signOut();location.reload()};
sb.auth.onAuthStateChange(async(event,session)=>{if(event==="SIGNED_IN"&&session)await startApp(session)});
$("addBtn").onclick=()=>{adding=true};
map.on("click",e=>{if(adding){adding=false;pending={lat:e.latlng.lat,lng:e.latlng.lng};openForm()}});
function openForm(inc=null,pid=null){
  edit=inc?inc:null; $("ftitle").textContent=inc?"Upravit zásah":"Nový zásah";
  $("type").value=inc?.type||"";$("date").value=inc?.incident_date||today();$("desc").value=inc?.description||"";
  $("jsdh").checked=inc?.jsdh??true;$("hzs").checked=inc?.hzs??false;$("alarm").value=inc?.alarm_level||"I.";
  $("placeHint").textContent=inc?"Místo zásahu zůstává stejné.":`Místo: ${pending.lat.toFixed(5)}, ${pending.lng.toFixed(5)}`;
  $("dlg").showModal();
}
$("cancel").onclick=()=>{$("dlg").close();pending=null;edit=null};
$("form").onsubmit=async e=>{
  e.preventDefault(); const {data:{user}}=await sb.auth.getUser(); if(!user)return;
  const payload={type:$("type").value.trim(),incident_date:$("date").value,description:$("desc").value.trim(),jsdh:$("jsdh").checked,hzs:$("hzs").checked,alarm_level:$("alarm").value};
  if(!payload.type)return alert("Vyplň typ zásahu.");
  let pid=edit?.place_id;
  if(edit){
    const {error}=await sb.from("incidents").update(payload).eq("id",edit.id); if(error)return alert(error.message);
  }else{
    const {data:p,error:pe}=await sb.from("places").insert({user_id:user.id,latitude:pending.lat,longitude:pending.lng}).select().single();
    if(pe)return alert(pe.message); pid=p.id;
    const {error}=await sb.from("incidents").insert({...payload,place_id:pid,user_id:user.id}); if(error)return alert(error.message);
  }
  if(!types.includes(payload.type)){await sb.from("incident_types").insert({user_id:user.id,name:payload.type});}
  $("dlg").close(); pending=null; edit=null; await loadData(); showPlace(pid);
};
window.addTo=pid=>{const p=places.find(x=>x.id===pid);pending={lat:p.latitude,lng:p.longitude};openForm(null,pid)};
window.editIncident=id=>{const i=incidents.find(x=>x.id===id);openForm(i)};
window.deleteIncident=async id=>{if(!confirm("Smazat tento zásah?"))return;const i=incidents.find(x=>x.id===id);const {error}=await sb.from("incidents").delete().eq("id",id);if(error)return alert(error.message);await loadData();if(incidents.some(x=>x.place_id===i.place_id))showPlace(i.place_id);else resetSide()};
window.deletePlace=async pid=>{if(!confirm("Smazat celé místo a všechny jeho zásahy?"))return;const {error}=await sb.from("places").delete().eq("id",pid);if(error)return alert(error.message);await loadData();resetSide()};
$("backupBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify({format:"evidence-zasahu-online",version:1,exported:new Date().toISOString(),places,incidents,types},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`zasahy_zaloha_${today()}.json`;a.click();URL.revokeObjectURL(a.href);
};
$("restore").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;try{
    const x=JSON.parse(await f.text());if(!Array.isArray(x.places)||!Array.isArray(x.incidents))throw Error("Neplatná záloha.");
    if(!confirm("Import nahradí/nahraje data do online databáze. Pokračovat?"))return;
    const {data:{user}}=await sb.auth.getUser();if(!user)return;
    for(const p of x.places){
      const {data:np,error}=await sb.from("places").insert({user_id:user.id,latitude:p.latitude??p.lat,longitude:p.longitude??p.lng}).select().single();
      if(error)throw error;
      const old=x.incidents.filter(i=>(i.place_id===p.id)||(i.placeId===p.id));
      if(old.length)await sb.from("incidents").insert(old.map(i=>({user_id:user.id,place_id:np.id,type:i.type,description:i.description??i.desc??"",incident_date:i.incident_date??i.date,alarm_level:i.alarm_level??i.alarm??"I.",jsdh:!!i.jsdh,hzs:!!i.hzs})));
    }
    for(const n of (x.types||[]))await sb.from("incident_types").upsert({user_id:user.id,name:typeof n==="string"?n:n.name},{onConflict:"user_id,name"});
    await loadData();alert("Import dokončen.");
  }catch(err){alert("Import se nepodařil: "+(err.message||err))}
  e.target.value="";
};
$("statsBtn").onclick=()=>{
  const y=String(new Date().getFullYear()),a=incidents.filter(i=>i.incident_date.startsWith(y)),by={};
  a.forEach(i=>by[i.type]=(by[i.type]||0)+1);
  $("statsBody").innerHTML=`<h2>📊 Roční přehled ${y}</h2><div class="stats"><div class="stat">Celkem<strong>${a.length}</strong></div><div class="stat">JSDH<strong>${a.filter(i=>i.jsdh).length}</strong></div><div class="stat">HZS<strong>${a.filter(i=>i.hzs).length}</strong></div><div class="stat">Místa<strong>${new Set(a.map(i=>i.place_id)).size}</strong></div></div><h3>Typy zásahů</h3>${Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee"><span>${esc(k)}</span><b>${v}</b></div>`).join("")||"<p>Žádné zásahy v tomto roce.</p>"}`;
  $("statsDlg").showModal();
};
$("closeStats").onclick=()=>$("statsDlg").close();
init();
