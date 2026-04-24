'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { HeartBtn, Ic, SkeletonCard, Spin, api, checkContactInfo, timeLeft, useRipple } from '@/components/ui/primitives';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';


import { WatermarkedImage, Lightbox } from '@/components/auth/AuthModal';
import { Modal, FF, ImageUploader, compressImage } from '@/components/ui/core';
import { ShareModal } from '@/components/listings/ShareModal';
import { PayModal } from '@/components/payments/PayModal';

function PostAdModal({onClose,onSuccess,token,notify,listing=null,linkedRequest=null}){
  // linkedRequest = { id, title, category, subcat } when coming from "I Have This"
  const [step,setStep]=useState(1);
  const [loading,setLoading]=useState(false);
  const [images,setImages]=useState([]);
  const [payChoice,setPayChoice]=useState(null); // 'now' | 'later' — shown on step 2
  const [createdListingId,setCreatedListingId]=useState(null);
  const [showPayModal,setShowPayModal]=useState(false);

  const [f,setF]=useState(()=>{
    if(listing) return {
      title:listing.title||"",category:listing.category||"",subcat:listing.subcat||"",
      price:String(listing.price||""),description:listing.description||"",
      reason:listing.reason_for_sale||"",location:listing.location||"",county:listing.county||"",
      precise_location:listing.precise_location||""
    };
    // Pre-fill from linked buyer request ("I Have This" flow)
    return {
      title:linkedRequest?.title||"",
      category:linkedRequest?.category||"",
      subcat:linkedRequest?.subcat||"",
      price:"",description:"",reason:"",location:"",county:"",precise_location:""
    };
  });

  const [existingPhotos,setExistingPhotos]=useState(()=>{
    if(!listing)return[];
    const ph=listing.photos||[];
    return ph.map((p,i)=>typeof p==="string"?{id:`ep-${i}`,url:p,existing:true}:{id:p.id||`ep-${i}`,url:p.url,public_id:p.public_id,existing:true});
  });

  const sf=(k,v)=>setF(p=>({...p,[k]:v}));
  const cat=CATS.find(c=>c.name===f.category);
  const [fieldErrors,setFieldErrors]=useState({});

  const submitListing=async(payNow)=>{
    if(!f.reason.trim()||!f.location.trim()){notify("Please fill in all required fields.","warning");return;}
    const errs={};
    [["title",f.title],["description",f.description],["reason",f.reason],["location",f.location]]
      .forEach(([k,v])=>{if(v&&checkContactInfo(v))errs[k]="Cannot contain phone numbers, emails, or social handles";});
    if(Object.keys(errs).length){setFieldErrors(errs);notify("Remove contact info from flagged fields","warning");return;}
    setFieldErrors({});
    setLoading(true);
    try{
      const isEdit=!!listing;
      const fd=new FormData();
      Object.entries({title:f.title,category:f.category,price:f.price,description:f.description,
        reason_for_sale:f.reason,location:f.location,county:f.county,precise_location:f.precise_location}).forEach(([k,v])=>v&&fd.append(k,v));
      if(f.subcat)fd.append("subcat",f.subcat);
      if(linkedRequest?.id)fd.append("linked_request_id",linkedRequest.id);
      fd.append("is_contact_public","false");
      // Always include photos in the same request (POST or PATCH) so they're
      // never silently lost if a background call fails.
      images.forEach(img=>img.file&&fd.append("photos",img.file));
      const url=isEdit?`/api/listings/${listing.id}`:"/api/listings";
      const method=isEdit?"PATCH":"POST";
      const result=await api(url,{method,body:fd},token);
      if(isEdit){onSuccess(result, true);onClose();notify("Ad updated!","success");return;}

      const lid=result.id||result.listing?.id;
      setCreatedListingId(lid);
      if(payNow){
        setShowPayModal(true);
      } else {
        onSuccess(result);onClose();
        notify("Ad submitted! It's under review — you'll be notified once it goes live.","info");
      }
    }catch(err){
      if(err.violations){
        notify(`Contact info detected — ${err.violations.map(v=>`${v.field}: ${v.reason}`).join(" | ")}`, "error");
      } else {
        notify(err.message||"Failed to save ad","error");
      }
    }
    finally{setLoading(false);}
  };

  const isLinked=!!linkedRequest;
  const modalTitle=listing?`Edit Ad — Step ${step}/2`:isLinked?`Respond to Request — Step ${step}/2`:`Post Ad — Step ${step}/2`;

  return <Modal title={modalTitle} onClose={onClose} footer={
    <div style={{display:"flex",gap:8,width:"100%"}}>
      {step===2&&<button className="btn bs" onClick={()=>setStep(1)} style={{display:"flex",alignItems:"center",gap:4}}>{Ic.chevronLeft(15)} Back</button>}
      <div style={{flex:1}}/>
      {step===1&&<button className="btn bp" onClick={()=>{
        const missing=[];
        if(!f.title.trim())missing.push("title");
        if(!f.category)missing.push("category");
        if(!f.price)missing.push("price");
        if(!f.description.trim())missing.push("description");
        if(missing.length){notify(`Please fill in: ${missing.join(", ")}`, "warning");return;}
        setStep(2);
      }} style={{display:"flex",alignItems:"center",gap:4}}>Continue {Ic.chevronRight(15)}</button>}
      {step===2&&!listing&&<button className="btn bp" onClick={()=>submitListing(false)} disabled={loading}>
        {loading?<Spin/>:"Submit Ad →"}
      </button>}
      {step===2&&listing&&<button className="btn bp" onClick={()=>submitListing(false)} disabled={loading}>
        {loading?<Spin/>:"Save Changes"}
      </button>}
    </div>
  }>
    {/* Linked request banner */}
    {isLinked&&<div style={{background:"#EEF2FF",border:"1px solid #C7D2FE",borderRadius:10,padding:"12px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"flex-start"}}>
      <span><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span>
      <div>
        <div style={{fontWeight:700,fontSize:13,color:"#1428A0",marginBottom:2}}>Responding to buyer request</div>
        <div style={{fontSize:13,color:"#3730A3"}}>{linkedRequest.title}{linkedRequest.category?` · ${linkedRequest.category}`:""}</div>
      </div>
    </div>}

    <div className="alert ag" style={{marginBottom:16,fontSize:12}}>Posting is free. Your ad goes to admin review first — you'll be notified when it's live. KSh 250 to reveal buyer contact.</div>

    {step===1&&<>
      <FF label="Item Title" required>
        <input className="inp" placeholder="e.g. iPhone 14 Pro 256GB" value={f.title}
          onChange={e=>{sf("title",e.target.value);setFieldErrors(p=>({...p,title:undefined}));}}/>
        {fieldErrors.title&&<div style={{color:"#dc2626",fontSize:11,marginTop:3}}>{fieldErrors.title}</div>}
      </FF>
      <FF label="Category" required>
        <select className="inp" value={f.category} onChange={e=>{sf("category",e.target.value);sf("subcat","");}}>
          <option value="">Select category...</option>
          {CATS.map(c=><option key={c.name}>{c.name}</option>)}
        </select>
      </FF>
      {cat&&<FF label="Subcategory">
        <select className="inp" value={f.subcat} onChange={e=>sf("subcat",e.target.value)}>
          <option value="">Select subcategory...</option>
          {cat.sub.map(s=><option key={s}>{s}</option>)}
        </select>
      </FF>}
<FF label="Price (KSh)" required>
  <input className="inp" type="text" inputMode="decimal" placeholder="5000" value={f.price} onChange={e=>sf("price",e.target.value)}/>
</FF>
      <FF label="Description" required hint="Condition, what's included, any defects...">
        <textarea className="inp" placeholder="Excellent condition, barely used..." value={f.description}
          onChange={e=>{sf("description",e.target.value);setFieldErrors(p=>({...p,description:undefined}));}}/>
        {fieldErrors.description&&<div style={{color:"#dc2626",fontSize:11,marginTop:3}}><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> {fieldErrors.description}</div>}
      </FF>
      <FF label={listing?"Photos — click × to remove, or add more below":"Photos (up to 8 — first is cover)"}>
        {existingPhotos.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
          {existingPhotos.map((p,i)=><div key={p.id||i} style={{position:"relative",width:70,height:55,borderRadius:6,overflow:"hidden",flexShrink:0}}>
            <img src={p.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <button onClick={()=>{
              if(listing&&p.id&&!p.id.startsWith("ep-"))
                api(`/api/listings/${listing.id}/photos/${p.id}`,{method:"DELETE"},token).catch(()=>{});
              setExistingPhotos(prev=>prev.filter((_,j)=>j!==i));
            }} style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,.7)",color:"#fff",border:"none",borderRadius:"50%",width:18,height:18,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>×</button>
          </div>)}
        </div>}
        <ImageUploader images={images} setImages={setImages}/>
      </FF>
    </>}

    {step===2&&<>
      <FF label="Reason for Selling" required>
        <input className="inp" placeholder="e.g. Upgrading to newer model" value={f.reason} onChange={e=>sf("reason",e.target.value)}/>
      </FF>
      <FF label="Collection Location" required hint="Town where item can be collected. Shown publicly.">
        <select className="inp" value={f.location} onChange={e=>sf("location",e.target.value)}>
          <option value="">Select town...</option>
          {KENYA_TOWNS.map(t=><option key={t} value={t}>{t}</option>)}
          <option value="Other">Other</option>
        </select>
      </FF>
      {f.location&&<FF label="Precise Location" hint="Exact street / landmark — only shown to buyer after they reveal contact info.">
        <input className="inp" placeholder="e.g. ABC Place, 3rd floor, Westlands" value={f.precise_location} onChange={e=>sf("precise_location",e.target.value)}/>
      </FF>}
      <FF label="County">
        <select className="inp" value={f.county} onChange={e=>sf("county",e.target.value)}>
          <option value="">Select county...</option>
          {["Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Thika","Kiambu","Machakos","Kajiado","Murang'a","Nyeri","Meru","Embu","Kirinyaga","Nyandarua","Laikipia","Baringo","Nandi","Uasin Gishu","Trans Nzoia","Elgeyo Marakwet","West Pokot","Turkana","Samburu","Isiolo","Marsabit","Mandera","Wajir","Garissa","Tana River","Lamu","Taita Taveta","Kilifi","Kwale","Vihiga","Bungoma","Busia","Kakamega","Siaya","Homabay","Migori","Kisii","Nyamira"].map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </FF>

      {/* How it works — simple, honest explanation */}
      {!listing&&<div style={{marginTop:8,padding:"16px",background:"#F0F4FF",border:"1px solid #C7D2FE",borderRadius:12}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            ["1","Your ad goes live after a quick review (usually under 1 hour)."],
            ["2","When a serious buyer locks in, you get a notification + email."],
            ["3","Pay KSh 250 via M-Pesa to reveal their contact. That's it."],
          ].map(([n,txt])=><div key={n} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:"#1428A0",color:"#fff",fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{n}</div>
            <div style={{fontSize:13,color:"#3730A3",lineHeight:1.5,paddingTop:2}}>{txt}</div>
          </div>)}
        </div>
      </div>}


    </>}

    {/* M-Pesa payment after listing is created */}
    {showPayModal&&createdListingId&&<PayModal
      type="unlock" listingId={createdListingId} amount={250}
      purpose={`Reveal contact info for: ${f.title}`}
      token={token} user={{}} allowVoucher={true}
      onSuccess={async()=>{
        setShowPayModal(false);
        onSuccess({id:createdListingId,...f});
        onClose();
        notify("Ad under review — you'll be notified when it's live. Buyer contact will be revealed on approval.","info");
      }}
      onClose={()=>{
        // Payment failed/cancelled → listing stays in Pay Later state
        setShowPayModal(false);
        onSuccess({id:createdListingId,...f});
        onClose();
        notify("Ad submitted for review. Pay KSh 250 from your dashboard to reveal buyer contact once live.","info");
      }}
      notify={notify}
    />}
  </Modal>;
}

// ── SKELETONS ────────────────────────────────────────────────────────────────

function ListingCardSkeleton({listView}){
  return <div className={`skel-card ${listView?"lcard-list":""}`} style={{display:listView?"flex":"block", borderRadius:18, overflow:"hidden", background:"#fff", border:"1px solid #EBEBEB"}}>
    <div className="skel skel-img" style={{width:listView?200:"100%", height:listView?160:200, borderRadius:0}}/>
    <div style={{padding:20, flex:1, display:"flex", flexDirection:"column", gap:10}}>
      <div className="skel" style={{width:"30%", height:10, borderRadius:4}}/>
      <div className="skel" style={{width:"80%", height:20, borderRadius:6}}/>
      <div className="skel" style={{width:"50%", height:24, borderRadius:6, marginTop:4}}/>
      <div style={{marginTop:"auto", paddingTop:14, borderTop:"1px solid #F0F0F0", display:"flex", gap:12}}>
        <div className="skel" style={{width:60, height:12, borderRadius:4}}/>
        <div className="skel" style={{width:40, height:12, borderRadius:4}}/>
      </div>
    </div>
  </div>;
}

function HeroSkeleton(){
  return <div className="skel-card" style={{minHeight:420, borderRadius:24, overflow:"hidden", position:"relative", background:"#fff"}}>
    <div className="skel" style={{position:"absolute", inset:0, opacity:0.1}}/>
    <div style={{position:"relative", padding:"60px 50px", maxWidth:600}}>
      <div className="skel" style={{width:200, height:24, borderRadius:20, marginBottom:20}}/>
      <div className="skel" style={{width:"100%", height:48, borderRadius:12, marginBottom:20}}/>
      <div className="skel" style={{width:"80%", height:48, borderRadius:12, marginBottom:30}}/>
      <div className="skel" style={{width:"60%", height:60, borderRadius:12}}/>
    </div>
  </div>;
}

// ── LISTING CARD ──────────────────────────────────────────────────────────────

function ListingCard({listing:l,onClick,listView,isSaved,onSave}){
  const photos=Array.isArray(l.photos)?l.photos.map(p=>typeof p==="string"?p:p?.url).filter(Boolean):[];
  const photo=photos[0]||null;
  const photoCount=photos.length;
  const isNew=Date.now()-new Date(l.created_at)<12*3600000&&l.status!=="sold";
  const ripple=useRipple();

  return <div className={`lcard depth-float${listView?" lcard-list":""}`} 
    onClick={e=>{ripple(e);onClick&&onClick();}}
    style={{
      borderRadius: 18,
      background: "#fff",
      border: "1px solid rgba(0,0,0,0.04)",
      overflow: "hidden",
      position: "relative",
      transition: "all 0.5s cubic-bezier(0.23, 1, 0.32, 1)"
    }}>

    <div className="lthumb">
      {photo
        ?<WatermarkedImage src={photo} alt={l.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
        :CAT_PHOTOS[l.category]
          ?<div style={{width:"100%",height:"100%",position:"relative",overflow:"hidden",background:"#F0F0F0"}}>
              <img src={CAT_PHOTOS[l.category]} alt={l.category} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.22,filter:"grayscale(30%)"}}/>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span className="glass" style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#333",padding:"6px 14px",borderRadius:20}}>{l.category}</span>
              </div>
            </div>
          :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#F5F5F5"}}>
              <span style={{fontSize:11,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"#AAAAAA"}}>{l.category||"No Photo"}</span>
            </div>
      }
      {l.status==="sold"&&<div className="sold-badge">SOLD</div>}
      {isNew&&<div style={{position:"absolute",top:12,left:12,background:"#10b981",color:"#fff",fontSize:9,fontWeight:900,padding:"4px 10px",borderRadius:6,letterSpacing:".08em",textTransform:"uppercase",boxShadow:"0 4px 12px rgba(16,185,129,0.3)"}}>NEW</div>}
      {onSave&&<HeartBtn saved={isSaved} onToggle={onSave} size={16} style={{position: 'absolute', top: 10, right: 10}}/>}
    </div>
    <div style={{padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8}}>
      <div style={{fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#AEAEB2', marginBottom: 2}}>{l.category}</div>
      <h4 style={{fontSize: 16, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.015em', color: '#111', margin: 0}}>{l.title}</h4>
      <div style={{fontSize: 22, fontWeight: 900, color: 'var(--a)', letterSpacing: '-0.02em', margin: '4px 0'}}>{fmtKES(l.price)}</div>
      
      {listView&&l.description&&<p style={{fontSize: 14, color: '#6B6B7B', lineHeight: 1.75, margin: '4px 0 12px'}}>{l.description.slice(0, 140)}…</p>}
      
      <div style={{display: 'flex', gap: 12, color: '#6B6B7B', fontSize: 11, flexWrap: 'wrap', borderTop: '1px solid #F0F0F5', paddingTop: 14, marginTop: 'auto', lineHeight: 1.4, fontWeight: 600}}>
        {l.location&&<span style={{display: 'flex', alignItems: 'center', gap: 3}}>{Ic.mapPin(12, '#AEAEB2')} {l.location}</span>}
        <span style={{display: 'flex', alignItems: 'center', gap: 3}}>{Ic.eye(12, '#AEAEB2')} {l.view_count||0}</span>
        {l.interest_count>0&&<span style={{color: '#E8194B', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#E8194B" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {l.interest_count} Interested
        </span>}
        <span style={{marginLeft: 'auto', color: '#AEAEB2', fontWeight: 500}}>{ago(l.created_at)}</span>
      </div>
    </div>
  </div>;
}


// ── DETAIL MODAL ──────────────────────────────────────────────────────────────
// ── LEAVE REVIEW BUTTON ──────────────────────────────────────────────────────
function LeaveReviewBtn({listing,user,token,notify}){
  const [open,setOpen]=useState(false);
  const [rating,setRating]=useState(0);
  const [comment,setComment]=useState("");
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);

  const submit=async()=>{
    if(!rating){notify("Please select a rating","warning");return;}
    setLoading(true);
    try{
      await api(`/api/reviews/${listing.id}`,{method:"POST",body:JSON.stringify({rating,comment})},token);
      setDone(true);
      notify("Review submitted!","success");
      setTimeout(()=>setOpen(false),2000);
    }catch(e){notify(e.message||"Failed to submit","error");}
    finally{setLoading(false);}
  };

  const isSeller=listing.seller_id===user?.id;
  const label=isSeller?"Review Buyer":"Review Seller";

  if(!open)return<button className="btn bs sm" onClick={()=>setOpen(true)}>{label}</button>;

  return<div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
    <div style={{background:"#FFFFFF",borderRadius:6,padding:24,maxWidth:380,width:"100%"}}>
      <div style={{fontWeight:700,fontSize:17,marginBottom:4}}>{label}</div>
      <div style={{color:"#888888",fontSize:13,marginBottom:16}}>
        {isSeller?"How was the buyer? Did the transaction go smoothly?":"How was the seller? Was the item as described?"}
      </div>
      {done?<div style={{textAlign:"center",padding:"20px 0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
        <div style={{fontWeight:600,marginTop:8}}>Review submitted!</div>
      </div>:<>
        <div style={{display:"flex",gap:8,marginBottom:16,justifyContent:"center"}}>
          {[1,2,3,4,5].map(i=><span key={i} onClick={()=>setRating(i)} style={{cursor:"pointer",color:i<=rating?"#111111":"#E0E0E0",userSelect:"none",transition:"color .1s"}}><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>)}
        </div>
        {rating>0&&<div style={{textAlign:"center",fontSize:13,color:"#888888",marginBottom:12}}>
          {["","Poor","Fair","Good","Very Good","Excellent"][rating]}
        </div>}
        <textarea className="inp" rows={3} placeholder="Share your experience (optional)..." value={comment} onChange={e=>setComment(e.target.value)} style={{marginBottom:14,resize:"vertical"}}/>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bs" style={{flex:1}} onClick={()=>setOpen(false)}>Cancel</button>
          <button className="btn bp" style={{flex:1}} onClick={submit} disabled={loading||!rating}>{loading?<Spin/>:"Submit Review"}</button>
        </div>
      </>}
    </div>
  </div>;
}

// ── REPORT LISTING BUTTON ────────────────────────────────────────────────────
const REPORT_REASONS = [
  {value:"scam",label:"Scam / Fraud"},
  {value:"fake_item",label:"Fake or misleading item"},
  {value:"wrong_price",label:"Wrong price"},
  {value:"offensive",label:"Offensive content"},
  {value:"spam",label:"Spam"},
  {value:"wrong_category",label:"Wrong category"},
  {value:"already_sold",label:"Item already sold"},
  {value:"other",label:"Other"},
];
function ReportListingBtn({listingId,token,notify}){
  const [open,setOpen]=useState(false);
  const [reason,setReason]=useState("");
  const [details,setDetails]=useState("");
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);

  const submit=async()=>{
    if(!reason){notify("Please select a reason","warning");return;}
    setLoading(true);
    try{
      await api(`/api/listings/${listingId}/report`,{method:"POST",body:JSON.stringify({reason,details})},token);
      setDone(true);
      setTimeout(()=>setOpen(false),2000);
    }catch(e){notify(e.message||"Report failed","error");}
    finally{setLoading(false);}
  };

  if(!open)return <button className="btn bgh sm" style={{fontSize:11,color:"#CCCCCC"}} onClick={()=>setOpen(true)}>Report</button>;

  return <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
    <div style={{background:"#FFFFFF",borderRadius:6,padding:24,maxWidth:400,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{fontWeight:700,fontSize:17,marginBottom:4}}>Report this listing</div>
      <div style={{color:"#888888",fontSize:13,marginBottom:16}}>Help us keep Weka Soko safe. Reports are anonymous and reviewed by our team.</div>
      {done?<div style={{textAlign:"center",padding:"20px 0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg></div>
        <div style={{fontWeight:600,marginTop:8}}>Report submitted</div>
        <div style={{color:"#888888",fontSize:13}}>Our team will review it shortly.</div>
      </div>:<>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {REPORT_REASONS.map(r=><label key={r.value} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:6,border:`1.5px solid ${reason===r.value?"#111111":"#E0E0E0"}`,cursor:"pointer",background:reason===r.value?"#F5F5F5":"transparent",fontSize:13}}>
            <input type="radio" name="report_reason" value={r.value} checked={reason===r.value} onChange={()=>setReason(r.value)} style={{accentColor:"#111111"}}/>
            {r.label}
          </label>)}
        </div>
        <textarea className="inp" rows={3} placeholder="Additional details (optional)..." value={details} onChange={e=>setDetails(e.target.value)} style={{marginBottom:14,resize:"vertical"}}/>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bs" style={{flex:1}} onClick={()=>setOpen(false)}>Cancel</button>
          <button className="btn bp" style={{flex:1}} onClick={submit} disabled={loading}>{loading?<Spin/>:"Submit Report"}</button>
        </div>
      </>}
    </div>
  </div>;
}



function DetailModal({listing:l,user,token,onClose,onShare,onChat,onLockIn,onUnlock,onEscrow,notify,isSaved,onSave,onSignIn}){
  const isSeller=user?.id===l.seller_id;
  const isBuyer=user?.id===l.locked_buyer_id;
  const photos=Array.isArray(l.photos)?l.photos.map(p=>typeof p==="string"?p:p?.url).filter(Boolean):[];
  const [mainPhoto,setMainPhoto]=useState(photos[0]||null);
  const [lightbox,setLightbox]=useState(null); // {photos, idx}
  const escrowFee=Math.round(Number(l.price)*0.055);
  const photoIdxRef=useRef(0);
  useEffect(()=>{
    if(photos.length<=1) return;
    const id=setInterval(()=>{
      photoIdxRef.current=(photoIdxRef.current+1)%photos.length;
      setMainPhoto(photos[photoIdxRef.current]);
    },3000);
    return()=>clearInterval(id);
  },[]);

  return <Modal title={l.title} onClose={onClose} large footer={
    <div style={{width:"100%",display:"flex",gap:8,flexWrap:"wrap"}}>
      <button className="btn bgh sm" onClick={onShare}>↗ Share</button>
      {user&&onSave&&<HeartBtn saved={isSaved} onToggle={onSave} size={15} bg="transparent" style={{boxShadow:"none",border:"1.5px solid #E0E0E0",borderRadius:8,width:"auto",height:"auto",padding:"6px 12px",gap:5,display:"flex",fontSize:13,fontWeight:700,color:"#636363"}}/>}
      {user&&!isSeller&&<button className="btn bs sm" onClick={onChat}>Chat with Seller</button>}
      {isSeller&&<button className="btn bs sm" onClick={onChat}>View Messages</button>}
      {!isSeller&&l.status==="active"&&user&&<button className="btn bs sm" onClick={onEscrow}>Buy with Escrow</button>}
      {isSeller&&l.locked_buyer_id&&!l.is_unlocked&&<button className="btn bp" style={{flex:1}} onClick={onUnlock}>Reveal Contact Info — KSh 250</button>}
      {!user&&<button className="btn bp" onClick={()=>onSignIn&&onSignIn()}>Sign In to Contact Seller</button>}
    </div>
  }>
    {/* Photos */}
    <div style={{background:"#F5F5F5",borderRadius:6,aspectRatio:"16/9",overflow:"hidden",marginBottom:10,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
      {mainPhoto
        ?<WatermarkedImage src={mainPhoto} alt={l.title}
            style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
            onClick={()=>setLightbox({photos,idx:photos.indexOf(mainPhoto)<0?0:photos.indexOf(mainPhoto)})}/>
        :CAT_PHOTOS[l.category]
          ?<><img src={CAT_PHOTOS[l.category]} alt={l.category} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.2,filter:"grayscale(30%)",position:"absolute",inset:0}}/><span style={{position:"relative",fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#888888",background:"rgba(255,255,255,.85)",padding:"6px 16px",borderRadius:20}}>No photos uploaded</span></>
          :<span style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA"}}>No photos uploaded</span>}
      {/* Zoom hint */}
      {mainPhoto&&<div style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,.45)",color:"#fff",fontSize:11,padding:"4px 10px",borderRadius:80,pointerEvents:"none"}}>Click to enlarge</div>}
      {l.status==="sold"&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}><div style={{background:"#111111",color:"#fff",padding:"8px 28px",borderRadius:6,fontWeight:600,fontSize:18,letterSpacing:".08em"}}>SOLD</div></div>}
    </div>
    {photos.length>1&&<div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto"}}>
      {photos.map((p,i)=><img key={i} src={p} alt="" onClick={()=>setMainPhoto(p)} style={{width:70,height:55,objectFit:"cover",borderRadius:6,cursor:"pointer",opacity:mainPhoto===p?1:.55,border:mainPhoto===p?"2px solid #111111":"2px solid transparent",flexShrink:0}}/>)}
    </div>}
    {lightbox&&<Lightbox photos={lightbox.photos} startIdx={lightbox.idx} onClose={()=>setLightbox(null)}/>}

    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
      <div>
        <div style={{fontSize:32,fontWeight:600,color:"#1428A0",fontFamily:"var(--fn)"}}>{fmtKES(l.price)}</div>
        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
          <span className="badge bg-m">{l.category}</span>
          {l.subcat&&<span className="badge bg-m">{l.subcat}</span>}
        </div>
      </div>
      <span className={`badge ${l.status==="active"||l.status==="locked"?"bg-g":l.status==="sold"?"bg-y":l.status==="pending_review"?"bg-b":l.status==="needs_changes"?"by2":l.status==="rejected"?"br2":"bg-m"}`}>{l.status==="pending_review"?"Under Review":l.status==="needs_changes"?"Needs Changes":l.status==="rejected"?"Rejected":l.status}</span>
    </div>

    {l.description&&<div style={{marginBottom:16}}><div className="lbl">Description</div><p style={{color:"#1D1D1D",fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{l.description}</p></div>}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
      {l.reason_for_sale&&<div style={{background:"#F5F5F5",borderRadius:6,padding:"12px 14px"}}><div className="lbl">Reason for Sale</div><div style={{fontSize:13}}>{l.reason_for_sale}</div></div>}
      {(l.location||l.county)&&<div style={{background:"#F5F5F5",borderRadius:6,padding:"12px 14px"}}>
        <div className="lbl">Location</div>
        <div style={{fontSize:13}}><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> {l.location}{l.county&&l.location&&l.location!==l.county?`, ${l.county}`:l.county||""}</div>
      </div>}
    </div>

    {/* Seller contact + response rate */}
    <div style={{marginBottom:16}}>
      <div className="lbl">Seller</div>
      {l.is_unlocked
        ?<div style={{background:"#F8F8F8",border:"1px solid #E8E8E8",borderRadius:12,padding:"16px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <span><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg></span>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:"#111111"}}>Contact Revealed</div>
              <div style={{fontSize:12,color:"#888888"}}>Share responsibly — do not post publicly</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
            {l.seller_name&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
              <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
              <span style={{fontWeight:600}}>{l.seller_name}</span>
            </div>}
            {l.seller_phone&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
              <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></span>
              <span>{l.seller_phone}</span>
            </div>}
            {l.seller_email&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
              <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
              <span>{l.seller_email}</span>
            </div>}
          </div>
          {l.seller_phone&&(()=>{
            // Convert Kenyan number to WhatsApp international format
            const raw=l.seller_phone.replace(/\D/g,"");
            const wa=raw.startsWith("254")?raw:raw.startsWith("0")?`254${raw.slice(1)}`:raw;
            const msg=encodeURIComponent(`Hi, I saw your listing "${l.title}" on Weka Soko for ${fmtKES(l.price)}. Is it still available?`);
            return <a
              href={`https://wa.me/${wa}?text=${msg}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#25D366",color:"#fff",padding:"12px 20px",fontWeight:700,fontSize:14,textDecoration:"none",fontFamily:"var(--fn)",letterSpacing:".01em",transition:"background .15s"}}
              onMouseOver={e=>e.currentTarget.style.background="#1EA952"}
              onMouseOut={e=>e.currentTarget.style.background="#25D366"}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat on WhatsApp
            </a>;
          })()}
        </div>
        :<div style={{background:"#F5F5F5",borderRadius:6,padding:"14px",display:"flex",alignItems:"center",gap:12}}>
          <span><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
          <div style={{flex:1}}>
            <div style={{fontWeight:600}}>{l.seller_anon||"Anonymous Seller"}</div>
            <div style={{fontSize:12,color:"#888888"}}>{isSeller&&l.locked_buyer_id?"A buyer is interested — unlock their contact below":"Anonymous seller · chat to get in touch"}</div>
            <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap",alignItems:"center"}}>
              {l.seller_avg_rating>0&&<span style={{fontSize:11,background:"rgba(0,0,0,.05)",color:"#1428A0",padding:"2px 8px",borderRadius:80,fontWeight:700}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginRight:2}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> {Number(l.seller_avg_rating).toFixed(1)} ({l.seller_review_count||0} review{l.seller_review_count!==1?"s":""})
              </span>}
              {(!l.seller_avg_rating||l.seller_avg_rating===0)&&<span style={{fontSize:11,color:"#CCCCCC"}}>No reviews yet</span>}
              {l.response_rate!=null&&<span style={{fontSize:11,background:"#F0F0F0",color:"#1428A0",padding:"2px 8px",borderRadius:6,fontWeight:600}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> {Math.round(l.response_rate)}% response rate
              </span>}
              {l.avg_response_hours!=null&&l.avg_response_hours<48&&<span style={{fontSize:11,color:"#888888"}}>
                Replies in ~{l.avg_response_hours<1?"under an hour":l.avg_response_hours<24?Math.round(l.avg_response_hours)+"h":Math.round(l.avg_response_hours/24)+"d"}
              </span>}
            </div>
          </div>
          {isSeller&&l.locked_buyer_id&&!l.is_unlocked&&<button className="btn bp sm" style={{marginLeft:"auto"}} onClick={onUnlock}>Reveal Contact Info — KSh 250</button>}
        </div>}
    </div>

    {/* ── Buyer safety tip ───────────────────────────────────────────── */}
    {!isSeller&&l.status==="active"&&<div style={{background:"#F8F8F8",border:"1px solid #E8E8E8",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:700,color:"#111111",marginBottom:4}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Stay Safe on Weka Soko</div>
      <div style={{fontSize:12,color:"#888888",lineHeight:1.7}}>
        • <strong>Never pay outside this platform.</strong> If a seller asks for M-Pesa directly before you've met, that's a scam.<br/>
        • <strong>Use Escrow</strong> for expensive items — your money is held safely until you confirm delivery.<br/>
        • <strong>Meet in a public place</strong> for physical item handovers. Bring someone if you can.<br/>
        • <strong>Something feel off?</strong> Use the Report button below.
      </div>
    </div>}

    {/* Escrow info */}
    {!isSeller&&l.status==="active"&&<div className="alert ay" style={{fontSize:12}}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginRight:4}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> <strong>Safe Escrow:</strong> Pay {fmtKES(Number(l.price)+escrowFee)} (item {fmtKES(Number(l.price))} + 5.5% fee). Funds held until you confirm you received the item.
    </div>}

    <div style={{display:"flex",gap:16,fontSize:12,color:"#888888",marginTop:10,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",gap:12}}>
        <span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> {l.view_count||0} views</span>
        <span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg> {l.interest_count||0} interested</span>
        <span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginRight:2}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {ago(l.created_at)}</span>
        {l.expires_at&&<span style={{color:new Date(l.expires_at)<new Date()?"#888888":"#CCCCCC"}}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {timeLeft(l.expires_at)}</span>}
      </div>
      {user&&!isSeller&&<ReportListingBtn listingId={l.id} token={token} notify={notify}/>}
      {user&&(isSeller||isBuyer)&&l.status==="sold"&&<LeaveReviewBtn listing={l} user={user} token={token} notify={notify}/>}
    </div>
  </Modal>;
}

// ── ROLE SWITCHER ─────────────────────────────────────────────────────────────
// ── MARK AS SOLD MODAL ────────────────────────────────────────────────────────


function MarkSoldModal({listing, token, notify, onClose, onSuccess}) {
  const [loading, setLoading] = useState(false);

  const confirm = async (channel) => {
    setLoading(true);
    try {
      await api(`/api/listings/${listing.id}/mark-sold`, {
        method: "POST",
        body: JSON.stringify({ channel })
      }, token);
      notify(
        channel === "platform"
          ? "Marked as sold via Weka Soko!"
          : "Marked as sold outside platform.",
        "success"
      );
      onSuccess(listing.id, channel);
      onClose();
    } catch(e) { notify(e.message, "error"); }
    finally { setLoading(false); }
  };

  return <Modal title="Mark as Sold" onClose={onClose}>
    <div style={{textAlign:"center", padding:"8px 0 16px"}}>
      <div style={{marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></div>
      <div style={{fontWeight:700, fontSize:16, marginBottom:6}}>{listing.title}</div>
      <div style={{fontSize:13, color:"#888888", marginBottom:24}}>
        How did this item sell? This helps us improve Weka Soko.
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:12}}>
        <button className="btn bp" style={{width:"100%", padding:"16px", flexDirection:"column", gap:4, height:"auto"}}
          onClick={()=>confirm("platform")} disabled={loading}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
          <div style={{fontWeight:700, fontSize:14}}>Sold via Weka Soko</div>
          <div style={{fontSize:12, opacity:.8, fontWeight:400}}>Buyer found me through this platform</div>
        </button>

        <button className="btn bs" style={{width:"100%", padding:"16px", flexDirection:"column", gap:4, height:"auto"}}
          onClick={()=>confirm("outside")} disabled={loading}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <div style={{fontWeight:700, fontSize:14}}>Sold Outside Platform</div>
          <div style={{fontSize:12, color:"#888888", fontWeight:400}}>I found the buyer elsewhere</div>
        </button>
      </div>

      {loading && <div style={{marginTop:16}}><Spin/></div>}
    </div>
  </Modal>;
}


export { PostAdModal, ListingCardSkeleton, HeroSkeleton, ListingCard, LeaveReviewBtn, ReportListingBtn, DetailModal, MarkSoldModal };
