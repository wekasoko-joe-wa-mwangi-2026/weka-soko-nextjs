'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Ic, Spin, api, checkContactInfo } from '@/components/ui/primitives';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';


import { Lightbox } from '@/components/auth/AuthModal';
import { Modal, FF } from '@/components/ui/core';

function RoleSwitcher({user,token,notify,onSwitch}){
const [loading,setLoading]=useState(false);
const target=user.role==="seller"?"buyer":"seller";
const switch_=async()=>{
if(!window.confirm(`Switch to ${target} account? You can switch back anytime.`))return;
setLoading(true);
try{
const data=await api("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:target})},token);
notify(`Switched to ${target} account`,"success");
onSwitch(data.user);
}catch(err){notify(err.message,"error");}
finally{setLoading(false);}
};
return <button className="btn bs" style={{justifyContent:"flex-start",gap:10}} onClick={switch_} disabled={loading}>
{loading?<Spin/>:<>Switch to {target==="seller"?"Seller":"Buyer"} Account</>}
</button>;
}

// ── SOLD ITEMS SECTION ───────────────────────────────────────────────────────
// ── POST REQUEST MODAL ─────────────────────────────────────────────────────
function PostRequestModal({onClose,token,notify,onSuccess}){
const [f,setF]=useState({title:"",description:"",budget:"",min_price:"",county:"",category:"",subcat:""});
const [loading,setLoading]=useState(false);
const [fieldErrors,setFieldErrors]=useState({});
const [photos,setPhotos]=useState([]); // array of {file, preview}
const photoInputRef=useRef(null);
const sf=(k,v)=>setF(p=>({...p,[k]:v}));
const cat=CATS.find(c=>c.name===f.category);

const addPhotos=e=>{
const files=Array.from(e.target.files||[]);
const valid=files.filter(f=>f.type.startsWith("image/")).slice(0,4-photos.length);
setPhotos(p=>[...p,...valid.map(file=>({file,preview:URL.createObjectURL(file)}))].slice(0,4));
e.target.value="";
};
const removePhoto=i=>setPhotos(p=>p.filter((_,pi)=>pi!==i));

const submit=async()=>{
if(!f.title.trim()||!f.description.trim()){notify("Title and description are required","warning");return;}
const errs={};
[["title",f.title],["description",f.description]].forEach(([k,v])=>{
if(v&&checkContactInfo(v))errs[k]="Cannot contain phone numbers, emails, or social handles";
});
if(Object.keys(errs).length){setFieldErrors(errs);notify("Remove contact info from flagged fields","warning");return;}
setFieldErrors({});
setLoading(true);
try{
const body={title:f.title.trim(),description:f.description.trim()};
if(f.budget)body.budget=f.budget;
if(f.min_price)body.min_price=f.min_price;
if(f.county)body.county=f.county;
if(f.category)body.category=f.category;
if(f.subcat)body.subcat=f.subcat;
const result=await api("/api/requests",{method:"POST",body:JSON.stringify(body)},token);
// Upload photos if any (non-blocking)
if(photos.length>0){
const fd=new FormData();
photos.forEach(p=>fd.append("photos",p.file));
await api(`/api/requests/${result.id}/photos`,{method:"POST",body:fd},token).catch(()=>{});
}
notify("Request posted! Sellers will be notified.","success");
onSuccess(result);onClose();
}catch(err){notify(err.message,"error");}
finally{setLoading(false);}
};

return <Modal title="Post a Buyer Request" onClose={onClose} footer={
<><button className="btn bs" onClick={onClose}>Cancel</button><button className="btn bp" onClick={submit} disabled={loading}>{loading?<Spin/>:"Post Request"}</button></>
}>
<div className="alert ag" style={{marginBottom:16,fontSize:13}}>Tell sellers what you're looking for. They'll be notified when a matching item is listed. <strong>Do not include contact info</strong> — use the platform chat instead.</div>
<FF label="What are you looking for?" required>
<input className={`inp${fieldErrors.title?" err":""}`} placeholder="e.g. iPhone 13 Pro, good condition" value={f.title} onChange={e=>{sf("title",e.target.value);if(fieldErrors.title)setFieldErrors(p=>({...p,title:""}));}} maxLength={120}/>
<div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
{fieldErrors.title?<span style={{fontSize:11,color:"#dc2626"}}>{fieldErrors.title}</span>:<span/>}
<span style={{fontSize:11,color:"#888888"}}>{f.title.length}/120</span>
</div>
</FF>
<FF label="Description" required hint="Be specific — condition, colour, specs, anything important">
<textarea className={`inp${fieldErrors.description?" err":""}`} placeholder="e.g. Looking for iPhone 13 Pro 256GB in any colour, screen must be crack-free, battery health above 80%..." value={f.description} onChange={e=>{sf("description",e.target.value);if(fieldErrors.description)setFieldErrors(p=>({...p,description:""}));}} rows={4}/>
{fieldErrors.description&&<div style={{fontSize:11,color:"#dc2626",marginTop:3}}>{fieldErrors.description}</div>}
</FF>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<FF label="Category" hint="Optional">
<select className="inp" value={f.category} onChange={e=>{sf("category",e.target.value);sf("subcat","");}}>
<option value="">Any category</option>
{CATS.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
</select>
</FF>
<FF label="Subcategory" hint="Optional">
<select className="inp" value={f.subcat} onChange={e=>sf("subcat",e.target.value)} disabled={!cat}>
<option value="">Any</option>
{cat?.sub?.map(s=><option key={s} value={s}>{s}</option>)}
</select>
</FF>
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
<FF label="Min Budget (KSh)" hint="Optional">
<input className="inp" type="text" inputMode="decimal" placeholder="e.g. 5000" value={f.min_price} onChange={e=>sf("min_price",e.target.value)}/>
</FF>
<FF label="Max Budget (KSh)" hint="Optional">
<input className="inp" type="text" inputMode="decimal" placeholder="e.g. 15000" value={f.budget} onChange={e=>sf("budget",e.target.value)}/>
</FF>
<FF label="County" hint="Optional">
<select className="inp" value={f.county} onChange={e=>sf("county",e.target.value)}>
<option value="">Any</option>
{KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
</select>
</FF>
</div>
<FF label="Reference Photos (optional)" hint="Max 4 — helps sellers understand what you want">
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{photos.map((p,i)=><div key={i} style={{position:"relative",width:70,height:70,borderRadius:8,overflow:"hidden"}}>
<img src={p.preview} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
<button onClick={()=>removePhoto(i)} style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,.7)",color:"#fff",border:"none",borderRadius:"50%",width:20,height:20,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
</div>)}
{photos.length<4&&<button onClick={()=>photoInputRef.current?.click()} style={{width:70,height:70,border:"2px dashed #CCCCCC",borderRadius:8,background:"#F5F5F5",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#888"}}>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
</button>}
</div>
<input ref={photoInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={addPhotos}/>
</FF>
</Modal>;
}

// ── REQUEST DETAIL MODAL ─────────────────────────────────────────────────────
function RequestDetailModal({request,onClose,user,token,notify}){
const [loading,setLoading]=useState(false);
const handleIHaveThis=async()=>{
if(!user){notify("Sign in to respond","warning");return;}
if(user.role!=="seller"){notify("Switch to Seller account to respond","warning");return;}
setLoading(true);
try{
await api(`/api/requests/${request.id}/respond`,{method:"POST"},token);
notify("Response sent! The buyer has been notified.","success");
onClose();
}catch(err){notify(err.message,"error");}
finally{setLoading(false);}
};

return <Modal title="Buyer Request" onClose={onClose}>
<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
{request.category&&<span style={{background:"#EEF2FF",color:"#1428A0",padding:"4px 12px",fontSize:12,fontWeight:600,borderRadius:6}}>{request.category}</span>}
{request.subcat&&<span style={{background:"#F5F5F5",color:"#555",padding:"4px 12px",fontSize:12,fontWeight:500,borderRadius:6}}>{request.subcat}</span>}
</div>
<div style={{fontSize:18,fontWeight:700,color:"#1A1A1A",marginBottom:8}}>{request.title}</div>
<div style={{fontSize:14,color:"#555",lineHeight:1.7,marginBottom:16,whiteSpace:"pre-wrap"}}>{request.description}</div>
{request.budget&&<div style={{background:"#F0FDF4",border:"1.5px solid #86EFAC",borderRadius:8,padding:"12px 16px",marginBottom:16}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#166534",marginBottom:4}}>Budget</div>
<div style={{fontSize:18,fontWeight:800,color:"#166534"}}>KSh {Number(request.budget).toLocaleString()}</div>
</div>}
{request.county&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#666",marginBottom:16}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
{request.county}
</div>}
{request.photo_urls?.length>0&&<div style={{marginBottom:16}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:8}}>Reference Photos</div>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{request.photo_urls.map((url,i)=><img key={i} src={url} alt="" style={{width:80,height:80,objectFit:"cover",borderRadius:8}}/>)}
</div>
</div>}
{user?.role==="seller"&&user?.id!==request.user_id&&<button className="btn bp" style={{width:"100%"}} onClick={handleIHaveThis} disabled={loading}>{loading?<Spin/>:"I Have This — Post an Ad"}</button>}
{user?.id===request.user_id&&<div style={{background:"#F5F5F5",borderRadius:8,padding:"12px 16px",fontSize:13,color:"#888"}}>This is your request. Sellers will be notified when you post.</div>}
</Modal>;
}

// ── REQUEST CARD ───────────────────────────────────────────────────────────────
function RequestCard({request,user,token,notify,onClick,onIHaveThis}){
const handleClick=()=>{
if(onClick)onClick(request);
};
const handleRespond=async(e)=>{
e.stopPropagation();
if(!user){notify("Sign in to respond","warning");return;}
if(user.role!=="seller"){notify("Switch to Seller account to respond","warning");return;}
if(onIHaveThis)onIHaveThis(request);
};

return <div onClick={handleClick} style={{background:"#fff",borderRadius:12,padding:16,cursor:"pointer",border:"1.5px solid #F0F0F0",transition:"all .15s",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
{request.category&&<span style={{background:"#EEF2FF",color:"#1428A0",padding:"3px 10px",fontSize:11,fontWeight:600,borderRadius:4}}>{request.category}</span>}
</div>
<div style={{fontWeight:700,fontSize:15,marginBottom:6,color:"#1A1A1A"}}>{request.title}</div>
<div style={{fontSize:13,color:"#666",lineHeight:1.6,marginBottom:12}}>{request.description?.slice(0,100)}{request.description?.length>100?"...":""}</div>
<div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between"}}>
{request.budget&&<span style={{fontSize:13,fontWeight:700,color:"#1428A0"}}>KSh {Number(request.budget).toLocaleString()}</span>}
<span style={{fontSize:12,color:"#999"}}>{ago(request.created_at)}</span>
</div>
{user?.role==="seller"&&user?.id!==request.user_id&&<button className="btn bp sm" style={{marginTop:12,width:"100%"}} onClick={handleRespond}>I Have This</button>}
</div>;
}

// ── WHAT BUYERS WANT SECTION (COMPACT) ───────────────────────────────────────
function WhatBuyersWant({user,token,notify,onSignIn,compact=false,onIHaveThis,onViewAll}){
const handleIHaveThis=(request)=>{
if(!user){onSignIn();return;}
if(user.role!=="seller"){
if(window.confirm("To respond to this buyer request you need a Seller account.\n\nSwitch to Seller now?")){
onIHaveThis&&onIHaveThis(request,"switch_to_seller");
}
return;
}
if(user.id===request.user_id){notify("This is your own request","warning");return;}
onIHaveThis&&onIHaveThis(request,"post_ad");
};
const [requests,setRequests]=useState([]);
const [total,setTotal]=useState(0);
const [loading,setLoading]=useState(true);
const [showModal,setShowModal]=useState(false);
const [searchInput,setSearchInput]=useState("");
const [search,setSearch]=useState("");
const [county,setCounty]=useState("");
const [category,setCategory]=useState("");
const [subcat,setSubcat]=useState("");
const [minPrice,setMinPrice]=useState("");
const [maxPrice,setMaxPrice]=useState("");
const [sort,setSort]=useState("newest");
const filterCat=CATS.find(c=>c.name===category);

const load=useCallback(()=>{
setLoading(true);
const p=new URLSearchParams({limit:12,sort});
if(search)p.set("search",search);
if(county)p.set("county",county);
if(category)p.set("category",category);
if(subcat)p.set("subcat",subcat);
if(minPrice)p.set("min_price",minPrice);
if(maxPrice)p.set("max_price",maxPrice);
api(`/api/requests?${p}`).then(d=>{
setRequests(d.requests||[]);setTotal(d.total||0);
}).catch(()=>{}).finally(()=>setLoading(false));
},[search,county,category,subcat,minPrice,maxPrice,sort]);

useEffect(()=>{load();},[load]);

const clearFilters=()=>{setSearchInput("");setSearch("");setCounty("");setCategory("");setSubcat("");setMinPrice("");setMaxPrice("");setSort("newest");};
const hasFilters=search||county||category||subcat||minPrice||maxPrice||sort!=="newest";

if(compact) return <>
<div style={{padding:"4px 0"}}>
<div style={{display:"flex",flexDirection:"column",gap:0}}>
{loading?<div style={{textAlign:"center",padding:20}}><Spin/></div>
:requests.length===0?<div style={{textAlign:"center",padding:"20px 0",color:"#AAAAAA",fontSize:13}}>
<div style={{marginBottom:8,opacity:.3,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
No requests yet
</div>
:requests.slice(0,4).map(r=>(
<div key={r.id} style={{padding:"12px 0",borderBottom:"1px solid #F0F0F0"}}>
<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:3}}>
{r.category&&<span style={{background:"#EEF2FF",color:"#1428A0",padding:"1px 6px",fontSize:10,fontWeight:600,borderRadius:3}}>{r.category}</span>}
</div>
<div style={{fontWeight:700,fontSize:13,marginBottom:3,color:"#1A1A1A",lineHeight:1.3}}>{r.title}</div>
<div style={{fontSize:12,color:"#777",lineHeight:1.5,marginBottom:6}}>{r.description?.slice(0,60)}{r.description?.length>60?"...":""}</div>
<div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"space-between"}}>
{r.budget&&<span style={{fontSize:11,fontWeight:600,color:"#1428A0"}}>KSh {Number(r.budget).toLocaleString()}</span>}
<button className="btn bp sm" style={{fontSize:11,padding:"4px 10px",borderRadius:6}} onClick={()=>handleIHaveThis(r)}>I Have This</button>
</div>
</div>
))
}
<div style={{display:"flex",gap:8,marginTop:12}}>
{total>4&&<button style={{flex:1,padding:"9px",background:"transparent",color:"#1428A0",border:"1.5px solid #1428A0",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)"}}
onClick={onViewAll}>View All ({total})</button>}
<button style={{flex:1,padding:"9px 12px",background:"#1428A0",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)",whiteSpace:"nowrap"}}
onClick={()=>{if(!user){onSignIn();return;}setShowModal(true);}}>+ Post Request</button>
</div>
</div>
</div>
{showModal && <PostRequestModal token={token} notify={notify} onClose={()=>setShowModal(false)} onSuccess={r=>{setRequests(p=>[r,...p]);setTotal(t=>t+1);setShowModal(false);}} />}
</>;

return <div style={{display:"flex",flexDirection:"column",gap:16}}>
{loading ? <Spin/> : requests.length===0 ? (
<div style={{textAlign:"center",padding:"20px 0",color:"#AAAAAA",fontSize:13}}>
<div style={{marginBottom:8,opacity:.3,display:"flex",alignItems:"center",justifyContent:"center"}}>
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
</div>
No requests yet
</div>
) : (
requests.map(r => (
<div key={r.id} style={{padding:"12px 0",borderBottom:"1px solid #F0F0F0"}}>
<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:3}}>
{r.category && <span style={{background:"#EEF2FF",color:"#1428A0",padding:"1px 6px",fontSize:10,fontWeight:600,borderRadius:3}}>{r.category}</span>}
</div>
<div style={{fontWeight:700,fontSize:13,marginBottom:3,color:"#1A1A1A",lineHeight:1.3}}>{r.title}</div>
<div style={{fontSize:12,color:"#777",lineHeight:1.5,marginBottom:6}}>{r.description?.slice(0,60)}{r.description?.length>60?"...":""}</div>
<div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"space-between"}}>
{r.budget && <span style={{fontSize:11,fontWeight:600,color:"#1428A0"}}>KSh {Number(r.budget).toLocaleString()}</span>}
<button className="btn bp sm" style={{fontSize:11,padding:"4px 10px",borderRadius:6}} onClick={()=>handleIHaveThis(r)}>I Have This</button>
</div>
</div>
))
)}
{total>12 && (
<div style={{textAlign:"center",marginTop:24}}>
<button style={{background:"transparent",border:"1.5px solid #1D1D1D",color:"#1D1D1D",padding:"10px 28px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8}} onClick={onViewAll}>
View all {total} requests &gt;
</button>
</div>
)}
{showModal && <PostRequestModal token={token} notify={notify} onClose={()=>setShowModal(false)} onSuccess={r=>{setRequests(p=>[r,...p]);setTotal(t=>t+1);}} />}
</div>;
}



export { RoleSwitcher, PostRequestModal, RequestDetailModal, RequestCard, WhatBuyersWant };
