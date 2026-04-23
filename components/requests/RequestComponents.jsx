'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';
import { api } from '@/components/ui/primitives';
import { Spin, Ic } from '@/components/ui/primitives';
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
  <input className="inp" type="text" inputMode="decimal" placeholder="e.g. 80000" value={f.budget} onChange={e=>sf("budget",e.target.value)}/>
</FF>
      <FF label="County" hint="Optional">
        <select className="inp" value={f.county} onChange={e=>sf("county",e.target.value)}>
          <option value="">Any county</option>
          {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </FF>
    </div>
    {/* Photo upload */}
    <div style={{marginTop:4}}>
      <div className="lbl">Photos <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"#AAAAAA"}}>Optional — up to 4 images</span></div>
      <input ref={photoInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={addPhotos}/>
      {photos.length<4&&<div onClick={()=>photoInputRef.current?.click()} className="img-upload" style={{cursor:"pointer",textAlign:"center",padding:"18px 12px"}}>
        <div style={{marginBottom:6,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1428A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
        <div style={{fontSize:13,color:"#1428A0",fontWeight:600}}>Add Photos</div>
        <div style={{fontSize:11,color:"#AAAAAA",marginTop:2}}>Help sellers see exactly what you want</div>
      </div>}
      {photos.length>0&&<div className="img-grid" style={{marginTop:8}}>
        {photos.map((p,i)=><div key={i} className="img-thumb">
          <img src={p.preview} alt=""/>
          <button className="img-del" onClick={()=>removePhoto(i)}>×</button>
        </div>)}
      </div>}
    </div>
  </Modal>;
}


function RequestDetailModal({r,user,token,notify,onClose,onIHaveThis}){
  const [lightboxIdx,setLightboxIdx]=useState(null);
  const photos=Array.isArray(r.photos)?r.photos.filter(Boolean):[];
  const [mainPhoto,setMainPhoto]=useState(photos[0]||null);
  const catPhoto=CAT_PHOTOS[r.category];

  const handleIHaveThis=()=>{onClose();onIHaveThis&&onIHaveThis(r);};

  return <Modal title={r.title} onClose={onClose} large footer={
    <div style={{width:"100%",display:"flex",gap:8,flexWrap:"wrap"}}>
      {user&&user.id!==r.user_id&&<button className="btn bp" style={{flex:1}} onClick={handleIHaveThis}>I Have This — Pitch to Buyer</button>}
      {!user&&<button className="btn bp" style={{flex:1}} onClick={onClose}>Sign In to Respond</button>}
    </div>
  }>
    {/* Photo / placeholder area */}
    <div style={{background:"#F5F5F5",borderRadius:8,aspectRatio:"16/9",overflow:"hidden",marginBottom:10,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
      {mainPhoto
        ?<img src={mainPhoto} alt={r.title} style={{width:"100%",height:"100%",objectFit:"cover",cursor:"zoom-in"}} onClick={()=>setLightboxIdx(photos.indexOf(mainPhoto))}/>
        :catPhoto
          ?<><img src={catPhoto} alt={r.category} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.18,filter:"grayscale(30%)",position:"absolute",inset:0}}/><span style={{position:"relative",fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#888888",background:"rgba(255,255,255,.85)",padding:"6px 16px",borderRadius:20}}>No photos attached</span></>
          :<span style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA"}}>No photos attached</span>}
    </div>
    {photos.length>1&&<div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto"}}>
      {photos.map((p,i)=><img key={i} src={p} alt="" onClick={()=>setMainPhoto(p)} style={{width:70,height:55,objectFit:"cover",borderRadius:6,cursor:"pointer",opacity:mainPhoto===p?1:.5,border:mainPhoto===p?"2px solid #1428A0":"2px solid transparent",flexShrink:0}}/>)}
    </div>}
    {lightboxIdx!==null&&<Lightbox photos={photos} startIdx={lightboxIdx} onClose={()=>setLightboxIdx(null)}/>}

    {/* Category badges */}
    <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
      {r.category&&<span className="badge bg-g">{r.category}</span>}
      {r.subcat&&<span className="badge bg-m">{r.subcat}</span>}
      {r.county&&<span className="badge bg-m"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginRight:3}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{r.county}</span>}
    </div>

    {/* Budget */}
    {(r.min_price||r.budget)&&<div style={{background:"#F8F8F8",border:"1px solid #E8E8E8",borderRadius:10,padding:"14px 16px",marginBottom:16,display:"flex",gap:16,flexWrap:"wrap"}}>
      {r.min_price&&<div><div className="lbl">Min Budget</div><div style={{fontSize:20,fontWeight:800,color:"#1428A0"}}>{fmtKES(r.min_price)}</div></div>}
      {r.budget&&<div><div className="lbl">{r.min_price?"Max Budget":"Budget"}</div><div style={{fontSize:20,fontWeight:800,color:"#1428A0"}}>{fmtKES(r.budget)}</div></div>}
    </div>}

    {/* Description */}
    <div style={{marginBottom:16}}>
      <div className="lbl">What They're Looking For</div>
      <p style={{color:"#1D1D1D",fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{r.description}</p>
    </div>

    {/* Meta */}
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",fontSize:12,color:"#888888",borderTop:"1px solid #F0F0F0",paddingTop:12}}>
      <span>{r.requester_anon||"Anonymous Buyer"}</span>
      <span>·</span>
      <span>{ago(r.created_at)}</span>
      {parseInt(r.matching_listings)>0&&<><span>·</span><span style={{color:"#1428A0",fontWeight:700}}>{r.matching_listings} matching listing{r.matching_listings!==1?"s":""}</span></>}
    </div>
  </Modal>;
}

// ── SHARED BUYER REQUEST CARD ──────────────────────────────────────────────
function RequestCard({r,user,token,notify,onIHaveThis,onDelete,onView}){
  const [detail,setDetail]=useState(false);
  const photos=Array.isArray(r.photos)?r.photos.filter(Boolean):[];
  const thumb=photos[0]||null;
  const catPhoto=CAT_PHOTOS[r.category];
  const deleteRequest=async e=>{
    e.stopPropagation();
    if(!window.confirm("Delete this request?"))return;
    try{await api(`/api/requests/${r.id}`,{method:"DELETE"},token);onDelete&&onDelete(r.id);}
    catch(err){notify(err.message,"error");}
  };
  const openDetail=()=>{if(onView){onView(r);}else{setDetail(true);}};
  return <>
    <div onClick={openDetail} style={{background:"#fff",border:"1px solid #E5E5E5",borderRadius:12,overflow:"hidden",cursor:"pointer",transition:"border-color .2s,box-shadow .2s",boxShadow:"none"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="#1428A0";e.currentTarget.style.boxShadow="0 4px 16px rgba(20,40,160,.08)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E5E5";e.currentTarget.style.boxShadow="none";}}>
      {/* Thumbnail row */}
      <div style={{width:"100%",height:thumb||catPhoto?120:0,background:"#F5F5F5",position:"relative",overflow:"hidden",display:thumb||catPhoto?"block":"none"}}>
        {thumb
          ?<img src={thumb} alt={r.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          :catPhoto
            ?<img src={catPhoto} alt={r.category} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.22,filter:"grayscale(30%)"}}/>
            :null}
        {photos.length>1&&<div style={{position:"absolute",bottom:6,right:8,background:"rgba(0,0,0,.55)",color:"#fff",fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:10}}>+{photos.length-1}</div>}
        <div style={{position:"absolute",top:8,left:8}}><span style={{background:"#1428A0",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,letterSpacing:".04em"}}>WANTED</span></div>
      </div>
      <div style={{padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6,gap:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:15,lineHeight:1.3,letterSpacing:"-.01em",color:"#1A1A1A",marginBottom:4}}>{r.title}</div>
            {(r.category||r.subcat)&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {r.category&&<span style={{background:"#EEF2FF",color:"#1428A0",padding:"2px 8px",fontSize:11,fontWeight:600,borderRadius:4}}>{r.category}</span>}
              {r.subcat&&<span style={{background:"#F0F0F0",color:"#555",padding:"2px 8px",fontSize:11,fontWeight:600,borderRadius:4}}>{r.subcat}</span>}
            </div>}
          </div>
          {user?.id===r.user_id&&<button onClick={deleteRequest} style={{background:"none",border:"none",cursor:"pointer",color:"#AEAEB2",fontSize:12,padding:"0 2px",flexShrink:0,fontFamily:"var(--fn)"}}>Remove</button>}
        </div>
        <div style={{fontSize:13,color:"#555",lineHeight:1.65,marginBottom:10}}>
          {r.description.length<=120?r.description:<>{r.description.slice(0,120)}... <span style={{color:"#1428A0",fontWeight:600,fontSize:12}}>Read more</span></>}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          {r.min_price&&<span style={{background:"rgba(0,0,0,.05)",color:"#111",padding:"3px 10px",fontSize:11,fontWeight:700,borderRadius:4}}>From {fmtKES(r.min_price)}</span>}
          {r.budget&&<span style={{background:"rgba(0,0,0,.05)",color:"#111",padding:"3px 10px",fontSize:11,fontWeight:700,borderRadius:4}}>{r.min_price?"Up to ":"Budget: "}{fmtKES(r.budget)}</span>}
          {r.county&&<span style={{background:"#F0F0F0",color:"#1428A0",padding:"3px 10px",fontSize:11,fontWeight:600,borderRadius:4}}><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> {r.county}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,color:"#AEAEB2",borderTop:"1px solid #F0F0F0",paddingTop:10}}>
          <span>{r.requester_anon||"Anonymous"} · {ago(r.created_at)}</span>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {parseInt(r.matching_listings)>0&&<span style={{color:"#1428A0",fontWeight:700}}>{r.matching_listings} match</span>}
            <button className="btn bp sm" style={{fontSize:11,padding:"4px 10px"}} onClick={e=>{e.stopPropagation();onIHaveThis&&onIHaveThis(r);}}>I Have This</button>
          </div>
        </div>
      </div>
    </div>
    {detail&&<RequestDetailModal r={r} user={user} token={token} notify={notify} onClose={()=>setDetail(false)} onIHaveThis={r=>{setDetail(false);onIHaveThis&&onIHaveThis(r);}}/>}
  </>;
}

// ── WHAT BUYERS WANT SECTION ───────────────────────────────────────────────
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

  if(compact) return <div style={{padding:"4px 0"}}>
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
        <button style={{flex:1,padding:"9px",background:"#1428A0",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)"}}
          onClick={()=>{if(!user){onSignIn();return;}setShowModal(true);}}>+ Post Request</button>
      </div>
    </div>
  </div>;

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
