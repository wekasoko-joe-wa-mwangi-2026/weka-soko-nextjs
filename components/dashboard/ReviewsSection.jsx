'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';
import { api } from '@/components/ui/primitives';
import { Spin, Ic } from '@/components/ui/primitives';
import { Modal, FF } from '@/components/ui/core';

function StarPicker({value,onChange}){
  const [hover,setHover]=useState(0);
  return<div style={{display:"flex",gap:4,cursor:"pointer"}}>
    {[1,2,3,4,5].map(s=><span key={s}
      style={{color:s<=(hover||value)?"#111111":"#E0E0E0",transition:"color .1s",userSelect:"none"}}
      onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)}
      onClick={()=>onChange(s)}><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>)}
  </div>;
}

function ReviewsSection({token,user,notify}){
  const [pending,setPending]=useState([]);
  const [myReviews,setMyReviews]=useState([]);
  const [reviewsAboutMe,setReviewsAboutMe]=useState(null);
  const [loading,setLoading]=useState(true);
  const [writing,setWriting]=useState(null); // listing object
  const [rating,setRating]=useState(0);
  const [comment,setComment]=useState("");
  const [submitting,setSubmitting]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const [pend,aboutMe]=await Promise.all([
        api("/api/reviews/my-pending",{},token).catch(()=>[]),
        api(`/api/reviews/user/${user.id}`,{},token).catch(()=>({reviews:[],stats:{}})),
      ]);
      setPending(Array.isArray(pend)?pend:[]);
      setReviewsAboutMe(aboutMe);
    }finally{setLoading(false);}
  },[token,user.id]);

  useEffect(()=>{load();},[load]);

  const submit=async()=>{
    if(!rating){notify("Please select a star rating","warning");return;}
    setSubmitting(true);
    try{
      await api("/api/reviews",{method:"POST",body:JSON.stringify({listing_id:writing.id,rating,comment})},token);
      notify("Review submitted!","success");
      setWriting(null);setRating(0);setComment("");
      load();
    }catch(e){notify(e.message||"Failed to submit","error");}
    finally{setSubmitting(false);}
  };

  if(loading)return<div style={{textAlign:"center",padding:40}}><Spin s="36px"/></div>;

  const stats=reviewsAboutMe?.stats;
  const reviews=reviewsAboutMe?.reviews||[];

  return<>
    {/* My rating summary */}
    {stats&&(stats.review_count>0)&&<div style={{background:"#F5F5F5",border:"1px solid #E8E8E8",borderRadius:6,padding:"18px 20px",marginBottom:18,display:"flex",gap:16,alignItems:"center"}}>
      <div style={{textAlign:"center",flexShrink:0}}>
        <div style={{fontSize:44,fontWeight:700,color:"#111111",lineHeight:1}}>{Number(stats.avg_rating||0).toFixed(1)}</div>
        <div style={{fontSize:16,color:"#1428A0",marginTop:2,display:"flex",gap:2,justifyContent:"center"}}>{[1,2,3,4,5].map(i=><svg key={i} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={i<=Math.round(stats.avg_rating||0)?"currentColor":"none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}</div>
      </div>
      <div>
        <div style={{fontWeight:700,fontSize:16,marginBottom:2}}>Your Rating</div>
        <div style={{fontSize:13,color:"#888888"}}>{stats.review_count} review{stats.review_count!==1?"s":""} from transactions</div>
        <div style={{fontSize:12,color:"#CCCCCC",marginTop:4}}>Reviews are left by buyers and sellers after a completed sale</div>
      </div>
    </div>}

    {/* Pending reviews to write */}
    {pending.length>0&&<>
      <div className="lbl" style={{marginBottom:10}}>Leave a Review ({pending.length} pending)</div>
      <div className="alert ay" style={{fontSize:12,marginBottom:14}}>
        You can leave a review after a transaction is complete. Reviews help build trust on Weka Soko.
      </div>
      {pending.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 15px",background:"rgba(176,127,16,.06)",border:"1px solid rgba(176,127,16,.2)",borderRadius:6,marginBottom:10}}>
        <span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
          <div style={{fontSize:11,color:"#888888"}}>You were the {p.my_role} · Rate the {p.my_role==="buyer"?"seller":"buyer"}</div>
        </div>
        <button className="btn bp sm" onClick={()=>{setWriting(p);setRating(0);setComment("");}}>Write Review</button>
      </div>)}
    </>}

    {/* Review form */}
    {writing&&<div style={{background:"#F5F5F5",border:"1px solid #E8E8E8",borderRadius:6,padding:"18px 20px",marginBottom:18}}>
      <div style={{fontWeight:700,marginBottom:4}}>Review for: {writing.title}</div>
      <div style={{fontSize:12,color:"#888888",marginBottom:14}}>Rate the {writing.my_role==="buyer"?"seller":"buyer"} on this transaction</div>
      <div style={{marginBottom:14}}>
        <div className="lbl" style={{marginBottom:6}}>Rating *</div>
        <StarPicker value={rating} onChange={setRating}/>
        <div style={{fontSize:11,color:"#888888",marginTop:4}}>{["","Poor","Below average","Average","Good","Excellent"][rating]||""}</div>
      </div>
      <FF label="Comment (optional)" hint="Share your experience with this transaction">
        <textarea className="inp" rows={3} placeholder="Great seller, item exactly as described..." value={comment} onChange={e=>setComment(e.target.value)} style={{resize:"vertical"}}/>
      </FF>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bs" onClick={()=>{setWriting(null);setRating(0);setComment("");}}>Cancel</button>
        <button className="btn bp" style={{flex:1}} onClick={submit} disabled={submitting||!rating}>{submitting?<Spin/>:"Submit Review"}</button>
      </div>
    </div>}

    {/* Reviews about me */}
    <div className="lbl" style={{marginBottom:10}}>Reviews About You ({reviews.length})</div>
    {reviews.length===0?<div style={{color:"#888888",fontSize:13,padding:"20px 0",textAlign:"center"}}>
      No reviews yet. Complete a transaction to start building your reputation.
    </div>:reviews.map((r,i)=><div key={r.id||i} style={{padding:"14px 16px",background:"#F5F5F5",borderRadius:6,marginBottom:10,border:"1px solid #E8E8E8"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{color:"#1428A0",display:"inline-flex",gap:1,alignItems:"center"}}>{[1,2,3,4,5].map(i=><svg key={i} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={i<=r.rating?"currentColor":"none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}</span>
          <span style={{fontWeight:700,fontSize:14}}>{r.rating}/5</span>
          <span className={`badge ${r.reviewer_role==="buyer"?"bg-b":"bg-g"}`} style={{fontSize:10}}>{r.reviewer_role==="buyer"?"Buyer":"Seller"}</span>
        </div>
        <span style={{fontSize:11,color:"#CCCCCC"}}>{ago(r.created_at)}</span>
      </div>
      {r.comment&&<p style={{fontSize:13,color:"var(--txt)",lineHeight:1.7,marginBottom:4}}>"{r.comment}"</p>}
      <div style={{fontSize:11,color:"#CCCCCC"}}>Re: {r.listing_title} · From {r.reviewer_anon||"Anonymous"}</div>
    </div>)}
  </>;
}

// ── DASHBOARD (REVAMPED) ──────────────────────────────────────────────────────



export { StarPicker, ReviewsSection };
