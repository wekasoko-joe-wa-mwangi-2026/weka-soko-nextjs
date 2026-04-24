'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Ic, Spin, WatermarkedImage, WekaSokoLogo, api } from '@/components/ui/primitives';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';




function SoldCard({l,showContact=false}){
  const photo=Array.isArray(l.photos)?l.photos.find(p=>typeof p==="string")||l.photos[0]?.url||null:null;
  const fmtDate=ts=>{if(!ts)return"";return new Date(ts).toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"});};
  const duration=(created,sold)=>{
    if(!created||!sold)return null;
    const ms=new Date(sold).getTime()-new Date(created).getTime();
    if(ms<0)return null;
    const days=Math.floor(ms/86400000);
    if(days===0)return"same day";if(days===1)return"1 day";
    if(days<7)return`${days} days`;if(days<30)return`${Math.floor(days/7)}w`;
    return`${Math.floor(days/30)}mo`;
  };
  const dur=duration(l.created_at,l.sold_at);
  return<div style={{background:"#fff",border:"1px solid #E5E5E5",overflow:"hidden",borderRadius:12,display:"flex",flexDirection:"column"}}>
    <div style={{aspectRatio:"4/3",background:"#F0F0F0",position:"relative",overflow:"hidden",flexShrink:0}}>
      {photo?<img src={photo} alt={l.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        :<span style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",opacity:.15}}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span>}
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.52)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{background:"#fff",color:"#1428A0",fontSize:11,fontWeight:700,padding:"5px 14px",letterSpacing:".08em",textTransform:"uppercase"}}>SOLD</span>
      </div>
      {l.sold_channel&&<div style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,.75)",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 8px"}}>{l.sold_channel==="platform"?"Via WekaSoko":"Elsewhere"}</div>}
      {l.avg_rating>0&&<div style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,.65)",color:"#fff",fontSize:11,fontWeight:700,padding:"3px 8px",display:"flex",alignItems:"center",gap:3}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>{Number(l.avg_rating).toFixed(1)}
      </div>}
    </div>
    <div style={{padding:"14px 16px",flex:1,display:"flex",flexDirection:"column",gap:0}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#767676",marginBottom:4}}>{l.category}</div>
      <div style={{fontWeight:700,fontSize:14,lineHeight:1.3,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
      <div style={{fontSize:18,fontWeight:700,color:"#111111",letterSpacing:"-.02em",marginBottom:10}}>{fmtKES(l.price)}</div>
      <div style={{background:"#F6F6F6",padding:"9px 11px",fontSize:11,lineHeight:1.9,borderRadius:8,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",color:"#1428A0"}}>
          <span>Listed</span><span style={{fontWeight:600}}>{fmtDate(l.created_at)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",color:"#111"}}>
          <span>Sold</span><span style={{fontWeight:600}}>{fmtDate(l.sold_at)}</span>
        </div>
        {dur&&<div style={{marginTop:3,paddingTop:5,borderTop:"1px solid #E5E5E5",color:"#636363",display:"flex",justifyContent:"space-between"}}>
          <span>Time to sell</span><span style={{fontWeight:700,color:"#111"}}>{dur}</span>
        </div>}
      </div>
      <div style={{fontSize:11,color:"#767676",marginBottom:showContact?8:0}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> {l.county||l.location||"Kenya"}
      </div>
      {showContact&&<div style={{borderTop:"1px solid #F0F0F0",paddingTop:8,display:"flex",flexDirection:"column",gap:5}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:2}}>Contacts</div>
        <div style={{fontSize:12,display:"flex",flexDirection:"column",gap:4}}>
          <div><span style={{fontWeight:600,color:"#1428A0"}}>Seller: </span><span style={{color:"#222"}}>{l.seller_name||"—"}</span>{l.seller_phone&&<span style={{color:"#636363"}}> · {l.seller_phone}</span>}{l.seller_email&&<span style={{color:"#636363",fontSize:11}}> · {l.seller_email}</span>}</div>
          {l.buyer_name&&<div><span style={{fontWeight:600,color:"#059669"}}>Buyer: </span><span style={{color:"#222"}}>{l.buyer_name}</span>{l.buyer_phone&&<span style={{color:"#636363"}}> · {l.buyer_phone}</span>}{l.buyer_email&&<span style={{color:"#636363",fontSize:11}}> · {l.buyer_email}</span>}</div>}
        </div>
      </div>}
    </div>
  </div>;
}

function SoldSection({token,user,compact=false,onViewAll}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [pg,setPg]=useState(1);
  const [total,setTotal]=useState(0);
  const [cat,setCat]=useState("");
  const PER=compact?12:20;

  useEffect(()=>{
    setLoading(true);
    const params=new URLSearchParams({page:pg,limit:PER});
    if(cat)params.set("category",cat);
    api(`/api/listings/sold?${params}`).then(d=>{
      setItems(d.listings||[]);setTotal(d.total||0);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[pg,cat,PER]);

  if(loading)return<div style={{textAlign:"center",padding:60}}><Spin s="36px"/></div>;

  if(items.length===0)return<div className="empty">
    <div style={{marginBottom:16,opacity:.15,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg></div>
    <h3 style={{fontWeight:700,fontSize:20,marginBottom:8,letterSpacing:"-.02em"}}>No sold items yet</h3>
    <p style={{color:"#767676"}}>Completed sales will appear here</p>
  </div>;

  return<>
    {!compact&&<>
      <div style={{display:"flex",gap:0,border:"1px solid #E5E5E5",marginBottom:28,background:"#fff",borderRadius:12,overflow:"hidden",flexWrap:"wrap"}}>
        {[{label:"Total Sales",val:total},{label:"Categories",val:[...new Set(items.map(i=>i.category))].length},{label:"Avg Price",val:"KSh "+Math.round(items.reduce((a,l)=>a+(parseFloat(l.price)||0),0)/Math.max(items.length,1)).toLocaleString("en-KE")}].map((s,i)=>(
          <div key={s.label} style={{flex:1,padding:"18px 20px",borderRight:i<2?"1px solid #E5E5E5":"none",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:700,letterSpacing:"-.02em",color:"#111111"}}>{s.val}</div>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"#767676",marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>
      {[...new Set(items.map(l=>l.category))].length>1&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>
        <button onClick={()=>{setCat("");setPg(1);}} style={{padding:"7px 16px",background:cat===""?"#1D1D1D":"#F4F4F4",color:cat===""?"#fff":"#535353",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",transition:"all .15s"}}>All</button>
        {[...new Set(items.map(l=>l.category))].map(c=>(
          <button key={c} onClick={()=>{setCat(c);setPg(1);}} style={{padding:"7px 16px",background:cat===c?"#1D1D1D":"#F4F4F4",color:cat===c?"#fff":"#535353",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",transition:"all .15s"}}>{c}</button>
        ))}
      </div>}
    </>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:20}}>
      {items.map(l=><SoldCard key={l.id} l={l} showContact={!compact}/>)}
    </div>

    {compact&&onViewAll&&total>PER&&<div style={{textAlign:"center",marginTop:24}}>
      <button onClick={onViewAll} style={{background:"#1D1D1D",color:"#fff",border:"none",padding:"12px 28px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8}}>View All Sold Items ({total}) →</button>
    </div>}
    {!compact&&Math.ceil(total/PER)>1&&<div style={{display:"flex",gap:6,justifyContent:"center",marginTop:32}}>
      {pg>1&&<button className="btn bs sm" onClick={()=>setPg(p=>p-1)}>Prev</button>}
      <span style={{padding:"7px 14px",fontSize:13,color:"#767676",fontWeight:500}}>Page {pg} of {Math.ceil(total/PER)}</span>
      {pg<Math.ceil(total/PER)&&<button className="btn bs sm" onClick={()=>setPg(p=>p+1)}>Next</button>}
    </div>}
  </>;
}


export { SoldCard, SoldSection };
