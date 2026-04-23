'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';
import { api } from '@/components/ui/primitives';
import { Spin, Ic, HeartBtn, WekaSokoLogo, useRipple, Skeleton, SkeletonCard, SkeletonListRow } from '@/components/ui/primitives';
import { Modal, FF, Toast } from '@/components/ui/core';
import { ListingCard, ListingCardSkeleton, HeroSkeleton, PostAdModal, DetailModal } from '@/components/listings/ListingComponents';
import { ShareModal } from '@/components/listings/ShareModal';
import { PostRequestModal, RequestCard, WhatBuyersWant } from '@/components/requests/RequestComponents';
import { SoldCard, SoldSection } from '@/components/sold/SoldComponents';
import { Pager } from '@/components/dashboard/Dashboard';

function MobileRequestsTab({user, token, notify, setModal}){
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [county, setCounty] = useState("");
  const [category, setCategory] = useState("");
  const [subcat, setSubcat] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [showPostModal, setShowPostModal] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const filterCat = CATS.find(c=>c.name===category);
  const hasFilters = search||county||category||subcat||minPrice||maxPrice||sort!=="newest";

  useEffect(()=>{
    setLoading(true);
    const p = new URLSearchParams({page:1, limit:50, sort});
    if(search) p.set("search", search);
    if(county) p.set("county", county);
    if(category) p.set("category", category);
    if(subcat) p.set("subcat", subcat);
    if(minPrice) p.set("min_price", minPrice);
    if(maxPrice) p.set("max_price", maxPrice);
    api(`/api/requests?${p}`).then(d=>{
      setRequests(d.requests||[]);
      setTotal(d.total||0);
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, [search, county, category, subcat, minPrice, maxPrice, sort]);

  const deleteReq = async (id)=>{
    if(!window.confirm("Delete this request?")) return;
    try{
      await api(`/api/requests/${id}`, {method:"DELETE"}, token);
      setRequests(p=>p.filter(r=>r.id!==id));
      setTotal(t=>t-1);
      notify("Request deleted","info");
    }catch(e){notify(e.message,"error");}
  };

  const handleIHaveThis = (request)=>{
    if(!user){setModal({type:"auth",mode:"login"});return;}
    if(user.role!=="seller"){
      if(window.confirm("You need a Seller account to respond to requests.\n\nSwitch to Seller now?")){
        api("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token)
          .then(d=>{
            const updated={...user,...d.user};
            localStorage.setItem("ws_user",JSON.stringify(updated));
            window.location.reload();
          }).catch(e=>notify(e.message,"error"));
      }
      return;
    }
    if(user.id===request.user_id){notify("This is your own request","warning");return;}
    setModal({type:"post", linkedRequest:request});
  };

  return <div style={{paddingBottom:80}}>
    {/* Sticky header — offset by topbar height so it sticks below the topbar */}
    <div style={{padding:"16px 16px 12px",borderBottom:"1px solid #F0F0F0",background:"#fff",position:"sticky",top:"calc(60px + env(safe-area-inset-top))",zIndex:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:2}}>Community</div>
          <div style={{fontSize:19,fontWeight:800,color:"#1A1A1A",letterSpacing:"-.01em"}}>What Buyers Want <span style={{fontSize:13,fontWeight:500,color:"#AAAAAA"}}>({total})</span></div>
        </div>
        <button
          style={{background:"#1428A0",color:"#fff",border:"none",padding:"10px 14px",borderRadius:10,fontSize:13,fontWeight:700,fontFamily:"var(--fn)",cursor:"pointer",whiteSpace:"nowrap"}}
          onClick={()=>{if(!user){setModal({type:"auth",mode:"login"});return;}setShowPostModal(true);}}>
          + Post
        </button>
      </div>
      {/* Search row */}
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <div style={{flex:1,display:"flex",border:"1.5px solid #E0E0E0",borderRadius:8,overflow:"hidden",background:"#FAFAFA"}}>
          <input
            style={{flex:1,padding:"9px 12px",border:"none",fontSize:13,fontFamily:"var(--fn)",outline:"none",background:"transparent"}}
            placeholder="Search requests..." value={searchInput}
            onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")setSearch(searchInput);}}/>
          <button onClick={()=>setSearch(searchInput)} style={{background:"#1428A0",color:"#fff",border:"none",padding:"0 12px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"var(--fn)"}}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2.5"/><path d="M20 20l-3-3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <button onClick={()=>setShowFilters(f=>!f)} style={{background:hasFilters?"#1428A0":"#fff",color:hasFilters?"#fff":"#555",border:"1.5px solid",borderColor:hasFilters?"#1428A0":"#E0E0E0",borderRadius:8,padding:"9px 12px",cursor:"pointer",fontFamily:"var(--fn)",fontSize:13,fontWeight:600,whiteSpace:"nowrap"}}>
          Filters{hasFilters?" ✓":""}
        </button>
      </div>
      {/* Expanded filters */}
      {showFilters&&<div style={{display:"flex",flexDirection:"column",gap:8,paddingBottom:8}}>
        <div style={{display:"flex",gap:8}}>
          <select style={{flex:1,padding:"9px 10px",border:"1.5px solid #E0E0E0",borderRadius:8,fontSize:12,fontFamily:"var(--fn)",outline:"none",background:"#FAFAFA",color:"#555",cursor:"pointer"}}
            value={category} onChange={e=>{setCategory(e.target.value);setSubcat("");}}>
            <option value="">All Categories</option>
            {CATS.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          {filterCat&&<select style={{flex:1,padding:"9px 10px",border:"1.5px solid #E0E0E0",borderRadius:8,fontSize:12,fontFamily:"var(--fn)",outline:"none",background:"#FAFAFA",color:"#555",cursor:"pointer"}}
            value={subcat} onChange={e=>setSubcat(e.target.value)}>
            <option value="">All Subcategories</option>
            {filterCat.sub.map(s=><option key={s} value={s}>{s}</option>)}
          </select>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <select style={{flex:1,padding:"9px 10px",border:"1.5px solid #E0E0E0",borderRadius:8,fontSize:12,fontFamily:"var(--fn)",outline:"none",background:"#FAFAFA",color:"#555",cursor:"pointer"}}
            value={county} onChange={e=>setCounty(e.target.value)}>
            <option value="">All Counties</option>
            {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select style={{flex:1,padding:"9px 10px",border:"1.5px solid #E0E0E0",borderRadius:8,fontSize:12,fontFamily:"var(--fn)",outline:"none",background:"#FAFAFA",color:"#555",cursor:"pointer"}}
            value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="budget_desc">High Budget</option>
            <option value="budget_asc">Low Budget</option>
          </select>
        </div>
        <div style={{display:"flex",gap:8}}>
<input type="text" inputMode="decimal" placeholder="Min KSh" value={minPrice} onChange={e=>setMinPrice(e.target.value)}
  style={{flex:1,padding:"9px 10px",border:"1.5px solid #E0E0E0",borderRadius:8,fontSize:12,fontFamily:"var(--fn)",outline:"none",background:"#FAFAFA"}}/>
  <input type="text" inputMode="decimal" placeholder="Max KSh" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}
  style={{flex:1,padding:"9px 10px",border:"1.5px solid #E0E0E0",borderRadius:8,fontSize:12,fontFamily:"var(--fn)",outline:"none",background:"#FAFAFA"}}/>
          {hasFilters&&<button onClick={()=>{setSearchInput("");setSearch("");setCounty("");setCategory("");setSubcat("");setMinPrice("");setMaxPrice("");setSort("newest");}}
            style={{padding:"9px 12px",background:"#fff",border:"1.5px solid #E0E0E0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"var(--fn)",color:"#636363",whiteSpace:"nowrap"}}>Clear</button>}
        </div>
      </div>}
    </div>

    {/* Body */}
    <div style={{padding:"12px 12px 0"}}>
      {loading
        ? <div style={{textAlign:"center",padding:"48px 0"}}><Spin s="32px"/></div>
        : requests.length===0
          ? <div style={{textAlign:"center",padding:"48px 20px"}}>
              <div style={{marginBottom:12,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
              <div style={{fontWeight:700,fontSize:16,marginBottom:6,color:"#1A1A1A"}}>{hasFilters?"No requests match":"No requests yet"}</div>
              <div style={{fontSize:13,color:"#888",marginBottom:20}}>{hasFilters?"Try different filters":"Be the first to post what you're looking for"}</div>
              {!hasFilters&&<button
                style={{background:"#1428A0",color:"#fff",border:"none",padding:"12px 24px",borderRadius:10,fontSize:14,fontWeight:700,fontFamily:"var(--fn)",cursor:"pointer"}}
                onClick={()=>{if(!user){setModal({type:"auth",mode:"login"});return;}setShowPostModal(true);}}>
                + Post a Request
              </button>}
            </div>
          : <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {requests.map(r=><RequestCard key={r.id} r={r} user={user} token={token} notify={notify}
                onIHaveThis={handleIHaveThis}
                onDelete={id=>{setRequests(p=>p.filter(x=>x.id!==id));setTotal(t=>t-1);}}/>)}
            </div>}
    </div>

    {showPostModal&&<PostRequestModal
      token={token} notify={notify}
      onClose={()=>setShowPostModal(false)}
      onSuccess={r=>{setRequests(p=>[r,...p]);setTotal(t=>t+1);setShowPostModal(false);}}
    />}
  </div>;
}


// ── MOBILE LAYOUT ─────────────────────────────────────────────────────────────
function MobileLayout({
  user,token,notify,page,setPage,
  listings,total,loading,filter,setFilter,pg,setPg,
  stats,counties,modal,setModal,notifCount,
  mobileFiltersOpen,setMobileFiltersOpen,mobileTab,setMobileTab,
  openListing,handleLockIn,savedIds,onToggleSave,newSinceLastVisit,maintenanceMsg
}){
  const photoMap={
    Electronics:"https://images.unsplash.com/photo-1498049794561-7780e7231661?w=140&h=140&fit=crop",
    Vehicles:"https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=140&h=140&fit=crop",
    Property:"https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=140&h=140&fit=crop",
    Fashion:"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=140&h=140&fit=crop",
    Furniture:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=140&h=140&fit=crop",
    "Home & Garden":"https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=140&h=140&fit=crop",
    Sports:"https://images.unsplash.com/photo-1517649763962-0c623066013b?w=140&h=140&fit=crop",
    "Baby & Kids":"https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=140&h=140&fit=crop",
    Books:"https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=140&h=140&fit=crop",
    Agriculture:"https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=140&h=140&fit=crop",
    Services:"https://images.unsplash.com/photo-1504148455328-c376907d081c?w=140&h=140&fit=crop",
    Jobs:"https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=140&h=140&fit=crop",
    Food:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=140&h=140&fit=crop",
    "Health & Beauty":"https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=140&h=140&fit=crop",
    Pets:"https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=140&h=140&fit=crop",
    Other:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=140&h=140&fit=crop",
  };

  const [swipeFeedIdx,setSwipeFeedIdx]=useState(null);
  const [ptrState,setPtrState]=useState("idle"); // idle | pulling | refreshing
  const [ptrY,setPtrY]=useState(0);
  const ptrStartY=useRef(0);
  const ptrActive=useRef(false);

  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    if (mobileTab === 'home') {
      const iv = setInterval(() => setHeroIdx(i => (i + 1) % 3), 6000);
      return () => clearInterval(iv);
    }
  }, [mobileTab]);


  // Pull-to-refresh handlers
  const onTouchStart=useCallback(e=>{
    if(window.scrollY===0&&e.touches[0]){ptrStartY.current=e.touches[0].clientY;ptrActive.current=true;}
  },[]);
  const onTouchMove=useCallback(e=>{
    if(!ptrActive.current)return;
    const dy=e.touches[0].clientY-ptrStartY.current;
    if(dy>0&&window.scrollY===0){setPtrY(Math.min(dy,80));setPtrState(dy>56?"pulling":"idle");}
    else{ptrActive.current=false;setPtrY(0);setPtrState("idle");}
  },[]);
  const onTouchEnd=useCallback(()=>{
    if(!ptrActive.current)return;
    ptrActive.current=false;
    if(ptrY>56){
      setPtrState("refreshing");setPtrY(56);
      setPg&&setPg(1);
      setTimeout(()=>{setPtrY(0);setPtrState("idle");},1200);
    }else{setPtrY(0);setPtrState("idle");}
  },[ptrY]);

  const postAd=()=>{
    if(!user){setModal({type:"auth",mode:"login"});return;}
    setModal({type:"post"});
  };

  return <div className="mob-root" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

    {/* ── PULL TO REFRESH INDICATOR ── */}
    <div className="ptr-wrap" style={{height:ptrY,overflow:"hidden"}}>
      <div className="ptr-inner">
        {ptrState==="refreshing"
          ?<><div className="ptr-spinner"/><span>Refreshing...</span></>
          :<><svg className="ptr-arrow" style={{transform:`rotate(${Math.min(ptrY/56*180,180)}deg)`}} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg><span>{ptrY>56?"Release to refresh":"Pull to refresh"}</span></>}
      </div>
    </div>

    {/* ── MAINTENANCE BANNER ── */}
    {maintenanceMsg&&<div style={{background:"#FEF3C7",borderBottom:"2px solid #F59E0B",color:"#92400E",padding:"10px 16px",textAlign:"center",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,position:"sticky",top:0,zIndex:200}}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {maintenanceMsg}
    </div>}

    {/* ── TOP BAR ── */}
    <div className="mob-topbar">
      <div className="mob-logo" onClick={()=>{setPage("home");setFilter({cat:"",subcat:"",q:"",county:"",minPrice:"",maxPrice:"",sort:"newest"});setPg(1);setMobileTab("home");window.history.pushState({},"","/");}}>WekaSoko</div>
      <div className="mob-search">
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="#AAAAAA" strokeWidth="2"/><path d="M20 20l-3-3" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round"/></svg>
        <input placeholder="Search listings..." value={filter.q} onChange={e=>{setFilter(p=>({...p,q:e.target.value}));setPg(1);setMobileTab("home");}}/>
      </div>
      <div className="mob-notif" onClick={()=>{if(!user){setModal({type:"auth",mode:"login"});return;}setPage("dashboard");setMobileTab("dashboard");window.history.pushState({},"","/dashboard");}}>
        {user
          ?<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round"/></svg>
          :<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round"/></svg>}
        {notifCount>0&&<span style={{position:"absolute",top:4,right:4,width:8,height:8,background:"#FF3B30",borderRadius:"50%",border:"2px solid #fff"}}/>}
      </div>
    </div>

    {/* ── CONTENT ── */}
    {(mobileTab==="home"||mobileTab==="search")&&<>

      {/* Hero banner — only on home tab, hidden in search mode */}
      {mobileTab==="home"&&!filter.q&&!filter.cat&&pg===1 && (
        loading ? <div style={{margin:"10px 12px"}}><HeroSkeleton/></div> : (
          <div className="depth-float" style={{overflow:"hidden",position:"relative",minHeight:260,margin:"10px 12px",display:"flex",flexDirection:"column", borderRadius: 24}}>
            {[
              {
                img: "https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=2070&auto=format&fit=crop",
                title: <>The Smart Way to <br/><span style={{color:"var(--a)"}}>Buy, Sell & Request</span></>,
                label: "KENYA'S LARGEST CLASSIFIEDS"
              },
              {
                img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop",
                title: <>List Items for <br/><span style={{color:"#0d9488"}}>Free in 2 Minutes</span></>,
                label: "ZERO UPFRONT COST"
              },
              {
                img: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?q=80&w=2070&auto=format&fit=crop",
                title: <>Secure Deals with <br/><span style={{color:"#7c3aed"}}>M-Pesa Escrow</span></>,
                label: "100% PEACE OF MIND"
              }
            ].map((slide, i) => (
              <div key={i} style={{
                position: i === 0 ? "relative" : "absolute", 
                inset: 0, 
                opacity: i === heroIdx ? 1 : 0,
                visibility: i === heroIdx ? "visible" : "hidden",
                transition: "opacity 1s ease, transform 1.2s ease",
                transform: i === heroIdx ? "scale(1)" : "scale(1.05)",
                zIndex: i === heroIdx ? 1 : 0,
                display: "flex", flexDirection: "column", justifyContent: "center"
              }}>
                <div style={{position:"absolute",inset:0,background:`url(${slide.img}) center/cover no-repeat`}} />
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.8) 100%), linear-gradient(to right, #fff 30%, transparent 100%)"}} />
                
                <div style={{position:"relative",zIndex:2,padding:24,display:"flex",flexDirection:"column",justifyContent:"center",height:"100%"}}>
                  <div className="glass" style={{display:"inline-flex",alignSelf:"flex-start",padding:"4px 10px",borderRadius:20,fontSize:9,fontWeight:800,color:"var(--a)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:12}}>
                    {slide.label}
                  </div>
                  <h2 style={{fontSize:24,fontWeight:900,letterSpacing:"-0.03em",lineHeight:1.1,marginBottom:12,color:"#111",fontFamily:"var(--fn)"}}>
                    {slide.title}
                  </h2>
                  <p style={{fontSize:13,color:"#4B4B5B",lineHeight:1.6,marginBottom:16,fontWeight:500,maxWidth:240}}>
                    The elite platform to flip, find, or request anything in Kenya.
                  </p>
                  {i===0&&<div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <button className="btn bp" style={{padding:"10px 18px",fontSize:12,borderRadius:8,fontWeight:700}}
                      onClick={e=>{e.stopPropagation();document.querySelector(".mob-section")?.scrollIntoView({behavior:"smooth"});}}>
                      Browse Listings
                    </button>
                    <button className="btn bs" style={{padding:"10px 18px",fontSize:12,borderRadius:8,fontWeight:700}}
                      onClick={e=>{e.stopPropagation();postAd();}}>
                      Post Ad Free
                    </button>
                  </div>}
                </div>
              </div>
            ))}

            <div style={{position:"absolute", bottom:16, left: 24, display:"flex", gap:6, zIndex: 10}}>
              {[0,1,2].map(i => (
                <div key={i} onClick={() => setHeroIdx(i)} style={{
                  width: i === heroIdx ? 16 : 6, height: 6, borderRadius: 10,
                  background: i === heroIdx ? "var(--a)" : "rgba(0,0,0,0.1)",
                  cursor: "pointer", transition: "all 0.3s ease"
                }} />
              ))}
            </div>
          </div>
        )
      )}


      {/* Hot Right Now — Premium mobile feed */}
      {mobileTab==="home"&&!filter.q&&!filter.cat&&pg===1 && (
        <div style={{margin: "24px 12px 10px"}}>
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:16, padding:"0 4px"}}>
             <div style={{width:4, height:18, background:"var(--a)", borderRadius:4}}/>
             <h3 style={{fontSize:18, fontWeight:900, letterSpacing:"-0.02em"}}>Hot Right Now</h3>
          </div>
          <div style={{display:"flex", gap:10, overflowX:"auto", padding: "4px 4px 20px", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", msOverflowStyle:"none", scrollbarWidth:"none"}}>
             {listings.slice(0, 5).map(l => (
               <div key={l.id} className="depth-float" onClick={() => setSwipeFeedIdx(listings.indexOf(l))} style={{
                 flex: "0 0 calc(50% - 5px)", scrollSnapAlign: "start", background: "#fff", borderRadius: 24, overflow: "hidden", position: "relative"
               }}>
                 <img src={Array.isArray(l.photos)&&l.photos[0]?(typeof l.photos[0]==="string"?l.photos[0]:l.photos[0].url):CAT_PHOTOS[l.category]} alt={l.title} 
                   style={{width: "100%", height: 160, objectFit: "cover"}}/>
                 <div style={{padding:16}}>
                   <div style={{fontSize:14, fontWeight:800, color: "#111", marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{l.title}</div>
                   <div style={{fontSize:16, fontWeight:900, color: "var(--a)"}}>{fmtKES(l.price)}</div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* Categories — hidden in search mode */}
      {mobileTab==="home"&&<div className="mob-section">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 4px"}}>
          <div className="mob-section-title" style={{padding:0}}>Categories</div>
          {filter.cat&&<button onClick={()=>{setFilter(p=>({...p,cat:""}));setPg(1);}} style={{fontSize:12,color:"#1428A0",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--fn)",fontWeight:600}}>Clear</button>}
        </div>
        <div className="mob-cats">
          {CATS.map(c=>(
            <div key={c.name} className={`mob-cat${filter.cat===c.name?" active":""}`}
              onClick={()=>{setFilter(p=>({...p,cat:p.cat===c.name?"":c.name}));setPg(1);}}>
              <img src={photoMap[c.name]||photoMap.Other} alt={c.name}/>
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      </div>}

      {/* Sort pills */}
      <div style={{display:"flex",gap:8,padding:"0 12px 8px",overflowX:"auto",WebkitOverflowScrolling:"touch",msOverflowStyle:"none",scrollbarWidth:"none"}}>
        {["newest","price_asc","price_desc","popular"].map(s=>(
          <button key={s} onClick={()=>{setFilter(p=>({...p,sort:s}));setPg(1);}} style={{background:filter.sort===s?"#1428A0":"#fff",color:filter.sort===s?"#fff":"#555",border:`1.5px solid ${filter.sort===s?"#1428A0":"#E0E0E0"}`,borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:600,fontFamily:"var(--fn)",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
            {s==="newest"?"Latest":s==="price_asc"?"Price: Low":s==="price_desc"?"Price: High":"Popular"}
          </button>
        ))}
      </div>

      {/* Listings */}
      <div className="mob-section" style={{marginTop:4}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 12px 8px"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1A1A1A",lineHeight:1.3,whiteSpace:"nowrap"}}>{filter.cat||"All Listings"} <span style={{color:"#AAAAAA",fontWeight:400,fontSize:12}}>({total})</span></div>
          <div style={{flex:1,display:"flex",alignItems:"center",background:"#F5F5F7",borderRadius:10,padding:"6px 10px",gap:6,minWidth:0}}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="#AAAAAA" strokeWidth="2"/><path d="M20 20l-3-3" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round"/></svg>
            <input placeholder="Search..." value={filter.q} onChange={e=>{setFilter(p=>({...p,q:e.target.value}));setPg(1);}} style={{border:"none",background:"transparent",outline:"none",fontSize:13,flex:1,minWidth:0,fontFamily:"var(--fn)"}}/>
          </div>
          <button onClick={()=>setMobileFiltersOpen(true)} style={{flexShrink:0,background:"#F5F5F7",border:"none",borderRadius:10,padding:"7px 10px",display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontFamily:"var(--fn)",fontSize:12,fontWeight:600,color:"#333"}}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M8 12h8M11 18h2"/></svg>
            Filter
          </button>
        </div>
        {/* Zeigarnik progress — how many listings seen out of total */}
        {total>PER_PAGE&&listings.length>0&&<div style={{padding:"0 18px 10px"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#AAAAAA",marginBottom:5}}>
            <span>Showing {listings.length} of {total}</span>
            <span style={{fontWeight:600,color:"#1428A0"}}>{Math.round(listings.length/total*100)}%</span>
          </div>
          <div className="zeigarnik-track"><div className="zeigarnik-fill" style={{width:`${Math.round(listings.length/total*100)}%`}}/></div>
        </div>}
        {loading
          ? <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {Array.from({length: 8}).map((_, i) => <div key={i} style={{padding:"6px 1px"}}><ListingCardSkeleton listView={true}/></div>)}
            </div>
          : listings.length===0

            ?<div style={{textAlign:"center",padding:"48px 20px",color:"#AAAAAA"}}>
                <div style={{marginBottom:14,opacity:.25,display:"flex",justifyContent:"center"}}>{Ic.search(44,"currentColor")}</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:6,color:"#1A1A1A"}}>No listings found</div>
                <div style={{fontSize:13,lineHeight:1.65,marginBottom:20}}>{filter.cat||filter.q?"Try different filters or clear your search":"Be the first to post something here"}</div>
                {filter.cat||filter.q
                  ?<button onClick={()=>{setFilter(p=>({...p,cat:"",q:""}));setPg(1);}} className="btn bs sm" style={{borderRadius:8,marginBottom:12}}>Clear Filters</button>
                  :null}
                <div><button onClick={postAd} className="btn bp sm" style={{borderRadius:8}}>+ Post an Ad for Free</button></div>
              </div>
            :<div className="mob-cards">
              {listings.map(l=>{
                const photo=Array.isArray(l.photos)?l.photos.find(p=>typeof p==="string")||l.photos[0]?.url||null:null;
                const isNew=Date.now()-new Date(l.created_at)<12*3600000;
                return <div key={l.id} className="mob-lcard" onClick={()=>openListing(l)} style={{position:"relative"}}>
                  <div className="mob-lcard-img" style={{position:"relative"}}>
                    {photo?<img src={photo} alt={l.title}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#F2F2F7",opacity:.6}}>{Ic.image(24,"#CCCCCC")}</div>}
                    {isNew&&<div style={{position:"absolute",bottom:4,left:4,background:"#10b981",color:"#fff",fontSize:8,fontWeight:800,padding:"2px 6px",borderRadius:4,letterSpacing:".04em"}}>NEW</div>}
                    {/* Swipe browse button — bottom right of image */}
                    <button onClick={e=>{e.stopPropagation();setSwipeFeedIdx(listings.findIndex(x=>x.id===l.id));}} style={{position:"absolute",bottom:6,right:6,background:"rgba(0,0,0,.55)",color:"#fff",border:"none",borderRadius:6,padding:"4px 8px",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:"var(--fn)"}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      Browse
                    </button>
                  </div>
                  <div className="mob-lcard-body">
                    <div className="mob-lcard-cat">{l.category}</div>
                    <div className="mob-lcard-title">{l.title}</div>
                    <div className="mob-lcard-price">{fmtKES(l.price)}</div>
                    <div className="mob-lcard-meta">
                      {l.location&&<span style={{display:"flex",alignItems:"center",gap:3}}>{Ic.mapPin(10,"currentColor")} {l.location}</span>}
                      {l.interest_count>0&&<span style={{color:"#E8194B",fontWeight:700,display:"flex",alignItems:"center",gap:3}}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#E8194B" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {l.interest_count}
                      </span>}
                      <span style={{marginLeft:"auto"}}>{ago(l.created_at)}</span>
                    </div>
                  </div>
                  {onToggleSave&&<HeartBtn saved={savedIds?.has(l.id)} onToggle={e=>{if(e&&e.stopPropagation)e.stopPropagation();onToggleSave&&onToggleSave(l);}} size={14} style={{position:"absolute",top:12,right:12,width:32,height:32,boxShadow:"0 1px 4px rgba(0,0,0,.15)"}}/>}
                  {l.locked_buyer_id&&!l.is_unlocked&&<div style={{position:"absolute",top:12,right:12,width:8,height:8,background:"#1428A0",borderRadius:"50%"}}/>}
  </div>
              })}
            </div>}
        {/* Pagination */}
        {Math.ceil(total/PER_PAGE)>1&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderTop:"1px solid #F0F0F0"}}>
          <button onClick={()=>{if(pg>1){setPg(p=>p-1);window.scrollTo(0,0);}}} disabled={pg<=1} className="btn bs sm" style={{borderRadius:8,opacity:pg<=1?.4:1}}>Prev</button>
          <span style={{fontSize:13,color:"#AAAAAA",fontWeight:500}}>Page {pg} of {Math.ceil(total/PER_PAGE)}</span>
          <button onClick={()=>{if(pg<Math.ceil(total/PER_PAGE)){setPg(p=>p+1);window.scrollTo(0,0);}}} disabled={pg>=Math.ceil(total/PER_PAGE)} className="btn bp sm" style={{borderRadius:8,opacity:pg>=Math.ceil(total/PER_PAGE)?.4:1}}>Next</button>
        </div>}
      </div>

      {/* Trust strip */}
      <div className="mob-trust">
        {[["check","Free to post"],["check","Anonymous chat"],["check","M-Pesa escrow"]].map(([icon,txt])=>(
          <span key={txt}><span style={{color:"#1428A0",display:"inline-flex",alignItems:"center"}}>{icon==="check"?<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg>:icon}</span>{txt}</span>
        ))}
      </div>

    </>}

    {/* ── SWIPE OVERLAY — opened when user taps a listing card ── */}
    {swipeFeedIdx!==null&&<div style={{position:"fixed",inset:0,zIndex:1000}}>
      <SwipeFeed
        user={user} token={token}
        onOpen={(l)=>{setSwipeFeedIdx(null);openListing(l);}}
        onLockIn={handleLockIn}
        onMessage={(l)=>{if(!user){setModal({type:"auth",mode:"login"});return;}setModal({type:"chat",listing:l});}}
        savedIds={savedIds} onToggleSave={onToggleSave}
        onSignIn={()=>setModal({type:"auth",mode:"login"})}
        onPostAd={()=>{setSwipeFeedIdx(null);postAd();}}
        initialListings={listings}
        startIndex={swipeFeedIdx}
        onClose={()=>setSwipeFeedIdx(null)}
        filter={filter}
      />
    </div>}

    {/* ── REQUESTS TAB ── */}
    {mobileTab==="requests"&&<MobileRequestsTab
      user={user} token={token} notify={notify}
      setModal={setModal}
    />}


    {/* ── BOTTOM TAB BAR ── */}
    <div className="mob-bottombar">
      {[
        {id:"home", icon:Ic.home, label:"Home"},
        {id:"inbox", icon:Ic.inbox, label:"Inbox"},
        {id:"post", icon:Ic.plus, label:"Post Ad", isPost:true},
        {id:"dashboard", icon:Ic.user, label:"Account"},
        {id:"requests", icon:Ic.checklist, label:"Buyer Reqs"},
      ].map((t) => {
        const isActive = t.isPost ? false : mobileTab === t.id;
        return (
          <button key={t.id}
            className={`mob-tab${isActive ? " on" : ""}${t.isPost ? " post-btn" : ""}`}
            onClick={() => {
              if(t.isPost){ postAd(); return; }
              if(t.id==="dashboard"){ if(!user){setModal({type:"auth",mode:"login"});return;} setPage("dashboard"); window.history.pushState({},"","/dashboard"); }
              else if(t.id==="inbox"){ if(!user){setModal({type:"auth",mode:"login"});return;} window.__initialMobSection="notif"; setPage("dashboard"); window.history.pushState({},"","/dashboard"); setMobileTab(t.id); return; }
              else if(t.id==="requests"){ setPage("home"); window.history.pushState({},"","/requests"); }
              else { setPage("home"); }
              setMobileTab(t.id);
            }}>
            {t.isPost
              ? <><div className="post-circle">{t.icon(20,"#fff")}</div><span>{t.label}</span></>
              : <>{t.icon(22,"currentColor")}<span>{t.label}</span></>
            }
          </button>
        );
      })}
    </div>

    {/* ── FILTERS DRAWER ── */}
    {mobileFiltersOpen&&<div className="mob-drawer" onClick={e=>{if(e.target===e.currentTarget)setMobileFiltersOpen(false);}}>
      <div className="mob-drawer-bg" onClick={()=>setMobileFiltersOpen(false)}/>
      <div className="mob-drawer-panel">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:17,fontWeight:700,color:"#1A1A1A"}}>Filters</div>
          <button onClick={()=>setMobileFiltersOpen(false)} style={{background:"#F5F5F5",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>Close</button>
        </div>
        <div className="mob-filter-row">
          <div className="mob-filter-label">Category</div>
          <select className="inp" style={{borderRadius:10}} value={filter.cat} onChange={e=>{setFilter(p=>({...p,cat:e.target.value,subcat:""}));setPg(1);}}>
            <option value="">All Categories</option>
            {CATS.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        {filter.cat&&(()=>{const cat=CATS.find(c=>c.name===filter.cat);return cat?.subs?.length?(<div className="mob-filter-row">
          <div className="mob-filter-label">Subcategory</div>
          <select className="inp" style={{borderRadius:10}} value={filter.subcat||""} onChange={e=>{setFilter(p=>({...p,subcat:e.target.value}));setPg(1);}}>
            <option value="">All Subcategories</option>
            {cat.subs.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>):null;})()}
        <div className="mob-filter-row">
          <div className="mob-filter-label">County</div>
          <select className="inp" style={{borderRadius:10}} value={filter.county} onChange={e=>{setFilter(p=>({...p,county:e.target.value}));setPg(1);}}>
            <option value="">All Counties</option>
            {counties.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="mob-filter-row">
          <div className="mob-filter-label">Price Range (KSh)</div>
          <div style={{display:"flex",gap:10}}>
            <input className="inp" style={{borderRadius:10}} placeholder="Min" type="number" value={filter.minPrice} onChange={e=>{setFilter(p=>({...p,minPrice:e.target.value}));setPg(1);}}/>
            <input className="inp" style={{borderRadius:10}} placeholder="Max" type="number" value={filter.maxPrice} onChange={e=>{setFilter(p=>({...p,maxPrice:e.target.value}));setPg(1);}}/>
          </div>
        </div>
        <div className="mob-filter-row">
          <div className="mob-filter-label">Sort By</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["newest","Latest"],["oldest","Oldest"],["price_asc","Price: Low"],["price_desc","Price: High"],["popular","Most Viewed"],["expiring","Expiring Soon"]].map(([val,lbl])=>(
              <button key={val} onClick={()=>{setFilter(p=>({...p,sort:val}));setPg(1);}} style={{padding:"10px",border:`1.5px solid ${filter.sort===val?"#1428A0":"#E0E0E0"}`,borderRadius:8,background:filter.sort===val?"#EEF2FF":"#fff",color:filter.sort===val?"#1428A0":"#555",fontSize:13,fontWeight:filter.sort===val?700:500,fontFamily:"var(--fn)",cursor:"pointer"}}>{lbl}</button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button onClick={()=>{setFilter({cat:"",subcat:"",q:"",county:"",minPrice:"",maxPrice:"",sort:"newest"});setPg(1);setMobileFiltersOpen(false);}} className="btn bs" style={{flex:1,borderRadius:10}}>Clear All</button>
          <button onClick={()=>setMobileFiltersOpen(false)} className="btn bp" style={{flex:1,borderRadius:10}}>Show Results ({total})</button>
        </div>
      </div>
    </div>}

  </div>;
}


// ── REPORT LISTING MODAL ───────────────────────────────────────────────────────
function ReportListingModal({listing,token,onClose}){
  const [reason,setReason]=useState("");
  const [details,setDetails]=useState("");
  const [saving,setSaving]=useState(false);
  const [done,setDone]=useState(false);
  const reasons=["Wrong category","Misleading title/description","Suspected scam","Offensive content","Duplicate listing","Item already sold","Other"];
  const submit=async()=>{
    if(!reason)return;
    setSaving(true);
    try{
      await apiCall(`/api/listings/${listing.id}/report`,{method:"POST",body:JSON.stringify({reason,details})},token);
      setDone(true);
    }catch(e){setSaving(false);}
};
return(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9000,display:"flex",alignItems:"flex-end"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}} role="dialog" aria-modal="true" aria-label="Report listing">
  <div style={{background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",padding:"24px 20px 40px",maxHeight:"80vh",overflowY:"auto"}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
  <div style={{fontWeight:800,fontSize:17}}>Report Listing</div>
  <button onClick={onClose} aria-label="Close report dialog" style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#888",lineHeight:1}}>×</button>
  </div>
  {done?(
  <div style={{textAlign:"center",padding:"20px 0"}}>
  <div style={{fontSize:32,marginBottom:12}}>
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  </div>
  <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>Report submitted</div>
  <div style={{fontSize:13,color:"#888",marginBottom:20}}>Our team will review this listing.</div>
  <button onClick={onClose} style={{background:"#1428A0",color:"#fff",border:"none",padding:"12px 32px",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"var(--fn)"}}>Done</button>
  </div>
  ):(
  <>
  <div style={{fontSize:13,color:"#555",marginBottom:14}}>What's wrong with <strong>"{listing.title}"</strong>?</div>
  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}} role="radiogroup" aria-label="Report reasons">
  {reasons.map(r=>(
  <button key={r} onClick={()=>setReason(r)} role="radio" aria-checked={reason===r} style={{background:reason===r?"#EEF2FF":"#F5F5F7",border:`1.5px solid ${reason===r?"#1428A0":"transparent"}`,borderRadius:10,padding:"11px 14px",fontSize:14,fontWeight:600,textAlign:"left",cursor:"pointer",fontFamily:"var(--fn)",color:reason===r?"#1428A0":"#333"}}>{r}</button>
  ))}
  </div>
  <label style={{display:"block",fontSize:11,fontWeight:700,color:"#636363",letterSpacing:".1em",textTransform:"uppercase",marginBottom:7,lineHeight:1.4}}>Additional Details (optional)</label>
  <textarea aria-label="Additional details for report" placeholder="Additional details (optional)" value={details} onChange={e=>setDetails(e.target.value)} rows={3} style={{width:"100%",border:"1.5px solid #E0E0E0",borderRadius:10,padding:"10px 12px",fontSize:13,fontFamily:"var(--fn)",resize:"vertical",marginBottom:16,boxSizing:"border-box"}}/>
  <button onClick={submit} disabled={!reason||saving} style={{width:"100%",background:reason?"#E8194B":"#CCC",color:"#fff",border:"none",padding:"14px",fontSize:14,fontWeight:700,borderRadius:12,cursor:reason?"pointer":"default",fontFamily:"var(--fn)"}}>
  {saving?"Submitting...":"Submit Report"}
  </button>
  </>
  )}
  </div>
  </div>
);
}

// ── SWIPE FEED — vertical scroll between ads, tap edges to browse photos ──────
function SwipeFeed({user,token,onOpen,onLockIn,onMessage,savedIds,onToggleSave,onSignIn,onPostAd,initialListings,startIndex,onClose,filter}){
  const [listings,setListings]=useState(initialListings&&initialListings.length?[...initialListings]:[]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(!(initialListings&&initialListings.length));
  const [idx,setIdx]=useState(typeof startIndex==="number"?startIndex:0);
  const [panelIdx,setPanelIdx]=useState(0); // horizontal panel index (photos + info panel)
  const [dragY,setDragY]=useState(0);
  const [dragX,setDragX]=useState(0);
  const [animating,setAnimating]=useState(false);
  const [animatingH,setAnimatingH]=useState(false);
  const [autoScroll,setAutoScroll]=useState(false);
  const [shareModal,setShareModal]=useState(null);
  const [reportTarget,setReportTarget]=useState(null);
  const animatingH_=useRef(false);
  const containerRef=useRef(null);
  const fetching=useRef(false);
  const animating_=useRef(false);
  const startYRef=useRef(null);
  const startXRef=useRef(null);
  const swipeDir=useRef(null);
  const autoScrollRef=useRef(null);
  const panelIdxRef=useRef(0);
  const PER=20;

  // Keep panelIdxRef in sync so autoscroll interval always reads fresh value
  useEffect(()=>{panelIdxRef.current=panelIdx;},[panelIdx]);

  // Autoscroll: cycle through each photo of current ad, then move to next ad
  useEffect(()=>{
    if(autoScroll){
      autoScrollRef.current=setInterval(()=>{
        if(animating_.current||animatingH_.current)return;
        const l=listings[idx];
        const photos=Array.isArray(l?.photos)?l.photos.map(p=>typeof p==="string"?p:p?.url).filter(Boolean):[];
        const photoSrcs=photos.length>0?photos:[null];
        const totalPanels=photoSrcs.length+1;
        if(panelIdxRef.current<totalPanels-1){
          // advance to next photo panel
          animatingH_.current=true;setAnimatingH(true);
          setPanelIdx(p=>p+1);
          setTimeout(()=>{setAnimatingH(false);animatingH_.current=false;},320);
        } else {
          // all photos shown — go to next listing
          snapTo(idx+1);
        }
      },3000);
    } else {
      clearInterval(autoScrollRef.current);
    }
    return()=>clearInterval(autoScrollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[autoScroll,idx]);

  // Reset panel index whenever the active ad changes
  useEffect(()=>{setPanelIdx(0);setDragX(0);},[idx]);

  // Build filter query params (respects active category/search/county)
  const filterQuery=useMemo(()=>{
    if(!filter)return'';
    const p=new URLSearchParams();
    if(filter.cat)p.set('category',filter.cat);
    if(filter.subcat)p.set('subcat',filter.subcat);
    if(filter.q)p.set('search',filter.q);
    if(filter.county)p.set('county',filter.county);
    if(filter.minPrice)p.set('minPrice',filter.minPrice);
    if(filter.maxPrice)p.set('maxPrice',filter.maxPrice);
    const qs=p.toString();
    return qs?'&'+qs:'';
  },[filter]);

  // Initial data fetch
  useEffect(()=>{
    if(initialListings&&initialListings.length){
      api(`/api/listings?sort=newest&limit=1&page=1${filterQuery}`).then(d=>setTotal(d.total||0)).catch(()=>{});
    } else {
      api(`/api/listings?sort=newest&limit=${PER}&page=1${filterQuery}`)
        .then(d=>{setListings(d.listings||[]);setTotal(d.total||0);})
        .catch(()=>{}).finally(()=>setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Non-passive touchmove — direction-locked: vertical = track drag, horizontal = ignore
  useEffect(()=>{
    const el=containerRef.current;
    if(!el)return;
    const onMove=e=>{
      if(startYRef.current===null||animating_.current)return;
      const dx=e.touches[0].clientX-startXRef.current;
      const dy=e.touches[0].clientY-startYRef.current;
      // Lock direction on first 8px of movement
      if(swipeDir.current===null){
        if(Math.abs(dx)>8||Math.abs(dy)>8){
          swipeDir.current=Math.abs(dy)>=Math.abs(dx)?'vertical':'horizontal';
        }
        return; // wait until direction is decided
      }
      if(swipeDir.current==='horizontal'){
        e.preventDefault();
        setDragX(dx); // positive = swiping right (towards prev panel)
        return;
      }
      if(swipeDir.current!=='vertical')return;
      e.preventDefault();
      // Elastic resistance beyond ±120px
      const clamped=dy>0?Math.min(dy,120+Math.max(0,dy-120)*0.2):Math.max(dy,-120+Math.min(0,dy+120)*0.2);
      setDragY(clamped);
    };
    el.addEventListener('touchmove',onMove,{passive:false});
    return()=>el.removeEventListener('touchmove',onMove);
  },[]);

  const fetchMore=()=>{
    if(fetching.current)return;
    fetching.current=true;
    const pg=Math.ceil(listings.length/PER)+1;
    api(`/api/listings?sort=newest&limit=${PER}&page=${pg}${filterQuery}`)
      .then(d=>{
        setTotal(d.total||0);
        setListings(prev=>{const ids=new Set(prev.map(l=>l.id));return[...prev,...(d.listings||[]).filter(l=>!ids.has(l.id))];});
      }).catch(()=>{}).finally(()=>{fetching.current=false;});
  };

  const snapTo=(newIdx)=>{
    if(animating_.current||newIdx<0||newIdx>=listings.length)return false;
    animating_.current=true;
    setAnimating(true);
    setDragY(newIdx>idx?-window.innerHeight:window.innerHeight);
    setTimeout(()=>{
      setIdx(newIdx);
      setDragY(0);
      setAnimating(false);
      animating_.current=false;
      if(newIdx>=listings.length-5&&listings.length<total)fetchMore();
    },300);
    return true;
  };

  const onTouchStart=e=>{
    if(animating_.current)return;
    // Pause autoscroll while user is manually swiping
    clearInterval(autoScrollRef.current);
    startYRef.current=e.touches[0].clientY;
    startXRef.current=e.touches[0].clientX;
    swipeDir.current=null;
  };
  const onTouchEnd=e=>{
    if(startYRef.current===null||animating_.current)return;
    const dy=startYRef.current-e.changedTouches[0].clientY;
    const dx=e.changedTouches[0].clientX-startXRef.current; // positive = swiped right (prev panel)
    const wasVertical=swipeDir.current==='vertical';
    const wasHorizontal=swipeDir.current==='horizontal';
    startYRef.current=null;
    swipeDir.current=null;
    if(wasHorizontal){
      setDragX(0);
      const l=listings[idx];
      const photos=Array.isArray(l?.photos)?l.photos.map(p=>typeof p==="string"?p:p?.url).filter(Boolean):[];
      const photoSrcs=photos.length>0?photos:[null];
      const totalPanels=photoSrcs.length+1; // photos + info panel
      if(!animatingH_.current){
        if(dx<-55&&panelIdx<totalPanels-1){ // swiped left → advance to next panel
          animatingH_.current=true;setAnimatingH(true);setPanelIdx(p=>p+1);
          setTimeout(()=>{setAnimatingH(false);animatingH_.current=false;},320);
        } else if(dx>55&&panelIdx>0){ // swiped right → go back to prev panel
          animatingH_.current=true;setAnimatingH(true);setPanelIdx(p=>p-1);
          setTimeout(()=>{setAnimatingH(false);animatingH_.current=false;},320);
        }
      }
      return;
    }
    if(!wasVertical){setDragY(0);return;}
    if(dy>55&&idx<listings.length-1){snapTo(idx+1);}
    else if(dy<-55&&idx>0){snapTo(idx-1);}
    else{setAnimating(true);setDragY(0);setTimeout(()=>setAnimating(false),280);}
  };

  // Render a single card slide (offset: -1=above, 0=current, +1=below)
  const renderSlide=(offset)=>{
    const cardIdx=idx+offset;
    if(cardIdx<0||cardIdx>=listings.length)return null;
    const l=listings[cardIdx];
    // Build ordered photo array
    const photos=Array.isArray(l.photos)
      ?l.photos.map(p=>typeof p==="string"?p:p?.url).filter(Boolean)
      :[];
    const photoSrcs=photos.length>0?photos:[null]; // at least one panel (placeholder)
    const totalPanels=photoSrcs.length+1; // photo panels + 1 info panel
    const isNew=Date.now()-new Date(l.created_at)<12*3600000;
    const isExpiring=l.expires_at&&new Date(l.expires_at)-Date.now()<3*86400000&&new Date(l.expires_at)>Date.now();
    const isSaved=savedIds?.has(l.id);
    const baseY=offset*100;
    const ty=`calc(${baseY}vh + ${dragY}px)`;
    // Horizontal drag — only applied to the current slide
    const hDrag=offset===0?dragX:0;
    const activePanelIdx=offset===0?panelIdx:0;
    return(
      <div key={l.id} style={{position:"absolute",inset:0,transform:`translateY(${ty})`,transition:animating?"transform .3s cubic-bezier(.25,.46,.45,.94)":"none",willChange:"transform",background:"#000",overflow:"hidden"}}>
        {/* Horizontal panel strip */}
        {photoSrcs.map((src,panelI)=>{
          const isCurrentPanel=panelI===activePanelIdx;
          const tx=`calc(${(panelI-activePanelIdx)*100}% + ${hDrag}px)`;
          const isLastPhoto=panelI===photoSrcs.length-1;
          const hasNoPhoto=!src;
          // Progressive info content per panel
          const infoLayer=panelI===0
            ?{// Panel 0: title + price
              top:<><div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.7)",marginBottom:4}}>{l.category}{l.subcat?` · ${l.subcat}`:""}</div><div style={{fontSize:20,fontWeight:800,color:"#fff",lineHeight:1.2,marginBottom:6,textShadow:"0 1px 8px rgba(0,0,0,.8)"}}>{l.title}</div><div style={{fontSize:28,fontWeight:800,color:"#fff",letterSpacing:"-.01em",textShadow:"0 1px 8px rgba(0,0,0,.8)"}}>KSh {Number(l.price).toLocaleString("en-KE")}</div></>,
              btns:null}
            :panelI===1&&l.description
            ?{// Panel 1: full description in scrollable frosted card
              top:null,
              card:<div style={{position:"absolute",bottom:80,left:0,right:0,maxHeight:"58vh",overflowY:"auto",WebkitOverflowScrolling:"touch",background:"rgba(10,10,10,.82)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRadius:"20px 20px 0 0",padding:"18px 18px 14px"}}>
                <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,.3)",margin:"0 auto 16px"}}/>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.45)",marginBottom:10}}>About this item</div>
                <p style={{fontSize:15,color:"rgba(255,255,255,.95)",lineHeight:1.75,margin:"0 0 14px",whiteSpace:"pre-wrap"}}>{l.description}</p>
                {l.county&&<div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginBottom:10,display:"flex",alignItems:"center",gap:5}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{l.county}</div>}
              </div>,
              btns:null}
            :{// Panel 2+ / last: seller & why selling
              top:<>{l.reason_for_sale&&<><div style={{fontSize:11,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"rgba(255,255,255,.55)",marginBottom:4}}>Why selling</div><div style={{fontSize:14,color:"rgba(255,255,255,.9)",lineHeight:1.55,textShadow:"0 1px 4px rgba(0,0,0,.7)",marginBottom:8}}>{l.reason_for_sale.length>100?l.reason_for_sale.slice(0,100)+"…":l.reason_for_sale}</div></>}<div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>{l.county&&<span style={{background:"rgba(255,255,255,.15)",color:"rgba(255,255,255,.9)",fontSize:12,fontWeight:600,padding:"4px 10px",borderRadius:20,backdropFilter:"blur(4px)"}}>{l.county}</span>}{l.seller_avg_rating>0&&<span style={{background:"rgba(255,255,255,.15)",color:"rgba(255,255,255,.9)",fontSize:12,fontWeight:600,padding:"4px 10px",borderRadius:20,backdropFilter:"blur(4px)",display:"flex",alignItems:"center",gap:4}}><svg width="11" height="11" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>{Number(l.seller_avg_rating).toFixed(1)}</span>}<span style={{background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",fontSize:12,padding:"4px 10px",borderRadius:20}}>{ago(l.created_at)}</span></div></>,
              btns:null};
          return(
            <div key={panelI} style={{position:"absolute",inset:0,transform:`translateX(${tx})`,transition:animatingH?"transform .3s cubic-bezier(.25,.46,.45,.94)":"none",willChange:"transform",background:hasNoPhoto?"#F2F2F2":"#000",overflow:"hidden"}}>
              {/* Image or placeholder */}
              {src
                ?<img src={src} alt={l.title} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain"}}/>
                :<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,background:"#F2F2F2"}}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span style={{fontSize:13,fontWeight:600,color:"#AAAAAA",letterSpacing:".04em"}}>No photos uploaded</span>
                  </div>}
              {/* Dark gradient only when there's a real image */}
              {src&&<div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.3) 0%,transparent 28%,transparent 40%,rgba(0,0,0,.88) 100%)",pointerEvents:"none"}}/>}
              {/* Overlays — only on the active panel of the current slide */}
              {offset===0&&isCurrentPanel&&(
                <>
                  {/* Panel dots */}
                  {totalPanels>1&&<div style={{position:"absolute",top:onClose?58:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:4,zIndex:15,pointerEvents:"none"}}>
                    {Array.from({length:totalPanels},(_,di)=>{
                      const isInfo=di===totalPanels-1;
                      const isAct=di===activePanelIdx;
                      return<div key={di} style={{width:isAct?20:5,height:5,borderRadius:3,background:isAct?(isInfo?"#1428A0":"#fff"):isInfo?"rgba(20,40,160,.45)":"rgba(255,255,255,.45)",transition:"all .2s"}}/>;
                    })}
                  </div>}
                  {/* Badges */}
                  <div style={{position:"absolute",top:onClose?60:14,left:14,display:"flex",flexDirection:"column",gap:5,zIndex:10}}>
                    {isNew&&<div style={{background:"#10b981",color:"#fff",fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:6,letterSpacing:".06em"}}>NEW</div>}
                    {isExpiring&&<div style={{background:"#f59e0b",color:"#fff",fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:6}}>EXPIRING</div>}
                    {l.status==="sold"&&<div style={{background:"#111",color:"#fff",fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:6}}>SOLD</div>}
                  </div>
                  {/* Progressive bottom info overlay */}
                  {infoLayer.card
                    /* Description panel: full scrollable frosted card replaces the overlay */
                    ?<div style={{position:"absolute",inset:0,zIndex:10,pointerEvents:"none"}}>
                        <div style={{position:"absolute",inset:0,pointerEvents:"auto"}}>{infoLayer.card}</div>
                      </div>
                    :<div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 16px 110px",zIndex:10}}>
                        {infoLayer.top}
                        {isLastPhoto&&totalPanels>1&&<div style={{fontSize:11,fontWeight:700,color:src?"rgba(255,255,255,.55)":"#AAAAAA",marginTop:8,marginBottom:10,textAlign:"center",letterSpacing:".04em"}}>← Swipe left for full details →</div>}
                        {infoLayer.btns&&<div style={{display:"flex",gap:8,marginTop:isLastPhoto&&totalPanels>1?0:12}}>{infoLayer.btns}</div>}
                      </div>}
                  {/* Swipe-up hint */}
                  {idx===0&&listings.length>1&&activePanelIdx===0&&<div style={{position:"absolute",bottom:80,left:"50%",transform:"translateX(-50%)",color:src?"rgba(255,255,255,.3)":"#CCCCCC",fontSize:11,textAlign:"center",pointerEvents:"none",zIndex:5,whiteSpace:"nowrap"}}>↑ swipe up for next ad</div>}
                </>
              )}
            </div>
          );
        })}
        {/* Info panel — the last horizontal panel */}
        {offset===0&&(()=>{
          const panelI=photoSrcs.length;
          const isCurrentPanel=panelI===activePanelIdx;
          const tx=`calc(${(panelI-activePanelIdx)*100}% + ${hDrag}px)`;
          return(
            <div style={{position:"absolute",inset:0,transform:`translateX(${tx})`,transition:animatingH?"transform .3s cubic-bezier(.25,.46,.45,.94)":"none",willChange:"transform",background:"#FFFFFF",overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch"}}>
              {/* Dot strip — pinned at top */}
              {totalPanels>1&&<div style={{position:"sticky",top:0,zIndex:20,background:"#fff",paddingTop:onClose?14:12,paddingBottom:10,display:"flex",justifyContent:"center",gap:4,borderBottom:"1px solid #F0F0F0"}}>
                {Array.from({length:totalPanels},(_,di)=>{
                  const isInf=di===totalPanels-1;
                  const isAct=di===activePanelIdx;
                  return<div key={di} style={{width:isAct?20:5,height:5,borderRadius:3,background:isAct?"#1428A0":isInf?"rgba(20,40,160,.3)":"rgba(0,0,0,.15)",transition:"all .2s"}}/>;
                })}
              </div>}

              {/* Header: title + price */}
              <div style={{padding:"18px 18px 0"}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#1428A0",marginBottom:4}}>{l.category}{l.subcat?` · ${l.subcat}`:""}</div>
                <div style={{fontSize:21,fontWeight:800,color:"#1A1A1A",lineHeight:1.25,marginBottom:6}}>{l.title}</div>
                <div style={{fontSize:30,fontWeight:800,color:"#1428A0",letterSpacing:"-.02em",marginBottom:12}}>KSh {Number(l.price).toLocaleString("en-KE")}</div>

                {/* Meta pills */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                  {l.county&&<span style={{background:"#F0F0F0",color:"#444",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{l.county}</span>}
                  <span style={{background:"#F0F0F0",color:"#888",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:20}}>{ago(l.created_at)}</span>
                  {l.location&&l.location!==l.county&&<span style={{background:"#F0F0F0",color:"#888",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:20}}>{l.location}</span>}
                  {isNew&&<span style={{background:"#10b981",color:"#fff",fontSize:12,fontWeight:700,padding:"5px 12px",borderRadius:20}}>New</span>}
                  {isExpiring&&<span style={{background:"#f59e0b",color:"#fff",fontSize:12,fontWeight:700,padding:"5px 12px",borderRadius:20}}>Expiring soon</span>}
                </div>

                {/* CTA buttons */}
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  {user?.id!==l.seller_id&&<button onClick={e=>{e.stopPropagation();if(!user){onSignIn&&onSignIn();return;}onMessage&&onMessage(l);}} style={{flex:1,background:"#1428A0",color:"#fff",border:"none",padding:"14px",fontSize:14,fontWeight:700,borderRadius:12,cursor:"pointer",fontFamily:"var(--fn)",boxShadow:"0 4px 14px rgba(20,40,160,.35)"}}>Message Seller</button>}
                  {user?.id===l.seller_id&&<div style={{flex:1,background:"#F0F0F0",borderRadius:12,padding:"14px",fontSize:13,fontWeight:600,color:"#888",textAlign:"center"}}>Your Listing</div>}
                  <button onClick={e=>{e.stopPropagation();if(!user){onSignIn&&onSignIn();return;}onToggleSave&&onToggleSave(l);}} style={{background:isSaved?"#E8194B":"#F5F5F5",color:isSaved?"#fff":"#1A1A1A",border:"none",padding:"14px 18px",fontSize:13,fontWeight:700,borderRadius:12,cursor:"pointer",fontFamily:"var(--fn)",display:"flex",alignItems:"center",gap:6}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved?"#fff":"none"} stroke={isSaved?"#fff":"currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    {isSaved?"Saved":"Save"}
                  </button>
                </div>
                {/* Contact info block — only relevant when is_unlocked */}
                {l.is_unlocked&&user?.id!==l.seller_id&&(
                  <div style={{background:"#F0FDF4",border:"1.5px solid #86EFAC",borderRadius:12,padding:"14px 16px",marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#166534",marginBottom:10}}>Seller Contact</div>
                    {l.seller_name&&<div style={{fontSize:14,fontWeight:700,color:"#1A1A1A",marginBottom:6}}>{l.seller_name}</div>}
                    {l.seller_phone&&<a href={`tel:${l.seller_phone}`} style={{display:"flex",alignItems:"center",gap:8,fontSize:14,color:"#1428A0",fontWeight:600,marginBottom:6,textDecoration:"none"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>{l.seller_phone}</a>}
                    {l.seller_email&&<a href={`mailto:${l.seller_email}`} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#555",textDecoration:"none"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>{l.seller_email}</a>}
                  </div>
                )}
                {/* Seller: reveal buyer contact button */}
                {user?.id===l.seller_id&&l.locked_buyer_id&&!l.is_unlocked&&(
                  <button onClick={e=>{e.stopPropagation();onLockIn&&onLockIn(l);}} style={{width:"100%",background:"#1428A0",color:"#fff",border:"none",padding:"14px",fontSize:14,fontWeight:700,borderRadius:12,cursor:"pointer",fontFamily:"var(--fn)",marginBottom:8,boxShadow:"0 4px 14px rgba(20,40,160,.25)"}}>Reveal Buyer Contact — KSh 250</button>
                )}
                {user?.id===l.seller_id&&l.is_unlocked&&(
                  <div style={{background:"#F0FDF4",border:"1.5px solid #86EFAC",borderRadius:12,padding:"12px 14px",marginBottom:8,fontSize:12,color:"#166534",fontWeight:600}}>Buyer contact has been revealed — check your dashboard.</div>
                )}
                <div style={{display:"flex",gap:8,marginBottom:18}}>
                  <button onClick={e=>{e.stopPropagation();setShareModal(l);}} style={{flex:1,background:"none",color:"#636363",border:"1.5px solid #EBEBEB",padding:"10px",fontSize:12,fontWeight:700,borderRadius:10,cursor:"pointer",fontFamily:"var(--fn)",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Share</button>
                  <button onClick={e=>{e.stopPropagation();onOpen&&onOpen(l);}} style={{flex:1,background:"none",color:"#636363",border:"1.5px solid #EBEBEB",padding:"10px",fontSize:12,fontWeight:700,borderRadius:10,cursor:"pointer",fontFamily:"var(--fn)",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Full Listing</button>
                  <button onClick={e=>{e.stopPropagation();if(!user){onSignIn&&onSignIn();return;}setReportTarget(l);}} style={{flex:1,background:"none",color:"#E8194B",border:"1.5px solid #FECDD3",padding:"10px",fontSize:12,fontWeight:700,borderRadius:10,cursor:"pointer",fontFamily:"var(--fn)",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>Report</button>
                </div>
              </div>

              {/* Divider */}
              <div style={{height:8,background:"#F5F5F5",margin:"0"}}/>

              {/* Description — full, no clamp */}
              {l.description&&<div style={{padding:"16px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:8}}>Description</div>
                <p style={{fontSize:14,color:"#1D1D1D",lineHeight:1.8,margin:0,whiteSpace:"pre-wrap"}}>{l.description}</p>
              </div>}

              {/* Reason for sale */}
              {l.reason_for_sale&&<>
                <div style={{height:1,background:"#F0F0F0",margin:"0 18px"}}/>
                <div style={{padding:"14px 18px"}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:8}}>Why Selling</div>
                  <p style={{fontSize:14,color:"#1D1D1D",lineHeight:1.7,margin:0}}>{l.reason_for_sale}</p>
                </div>
              </>}

              {/* Divider */}
              <div style={{height:8,background:"#F5F5F5"}}/>

              {/* Seller info */}
              <div style={{padding:"16px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:10}}>Seller</div>
                <div style={{display:"flex",alignItems:"center",gap:12,background:"#F8F8F8",borderRadius:12,padding:"14px"}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#1428A0,#6c63ff)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{color:"#fff",fontWeight:800,fontSize:17}}>{(l.seller_anon||l.anon_tag||l.seller_name||"?")[0].toUpperCase()}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#1A1A1A"}}>{l.seller_anon||l.anon_tag||"Anonymous Seller"}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
                      {l.seller_avg_rating>0&&<span style={{fontSize:12,color:"#8B6400",fontWeight:600,display:"flex",alignItems:"center",gap:3}}><svg width="11" height="11" viewBox="0 0 24 24" fill="#8B6400" stroke="#8B6400" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>{Number(l.seller_avg_rating).toFixed(1)} ({l.seller_review_count||0} reviews)</span>}
                      {l.response_rate!=null&&<span style={{fontSize:12,color:"#555",fontWeight:500}}>{Math.round(l.response_rate)}% response rate</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom spacer so content clears the fold */}
              <div style={{height:32}}/>
            </div>
          );
        })()}

        {/* Fixed action bar — stays put while swiping through photo panels */}
        {offset===0&&activePanelIdx<photoSrcs.length&&<>
          {/* Right-side column: Save / Views / Interest */}
          <div style={{position:"absolute",right:12,bottom:100,display:"flex",flexDirection:"column",gap:14,alignItems:"center",zIndex:30,pointerEvents:"auto"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <HeartBtn saved={isSaved} onToggle={e=>{if(e&&e.stopPropagation)e.stopPropagation();if(!user){onSignIn&&onSignIn();return;}onToggleSave&&onToggleSave(l);}} size={20} bg="rgba(0,0,0,.55)" style={{width:44,height:44,border:"1.5px solid rgba(255,255,255,.3)",backdropFilter:"blur(6px)"}}/>
              <span style={{color:"#fff",fontSize:10,fontWeight:700,textShadow:"0 1px 4px rgba(0,0,0,.8)"}}>{isSaved?"Saved":"Save"}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(255,255,255,.2)",backdropFilter:"blur(6px)"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              <span style={{color:"rgba(255,255,255,.8)",fontSize:10,fontWeight:700}}>{l.view_count||0}</span>
            </div>
            {l.interest_count>0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(232,25,75,.8)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(255,255,255,.2)",backdropFilter:"blur(6px)",flexDirection:"column"}}>
                <span style={{color:"#fff",fontSize:12,fontWeight:800,lineHeight:1}}>{l.interest_count}</span>
                <span style={{color:"rgba(255,255,255,.7)",fontSize:8,fontWeight:700}}>INT</span>
              </div>
            </div>}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <button onClick={e=>{e.stopPropagation();setShareModal(l);}} style={{width:44,height:44,borderRadius:"50%",background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(255,255,255,.2)",backdropFilter:"blur(6px)",cursor:"pointer"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
              <span style={{color:"rgba(255,255,255,.8)",fontSize:10,fontWeight:700}}>Share</span>
            </div>
          </div>
          {/* Bottom action buttons */}
          {user?.id!==l.seller_id&&<div style={{position:"absolute",bottom:0,left:0,right:0,padding:`12px 16px calc(env(safe-area-inset-bottom,0px) + 20px)`,display:"flex",gap:8,zIndex:30,background:"linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 100%)"}}>
            <button onClick={e=>{e.stopPropagation();if(!user){onSignIn&&onSignIn();return;}onMessage&&onMessage(l);}} style={{flex:1,background:"rgba(255,255,255,.15)",color:"#fff",border:"1.5px solid rgba(255,255,255,.4)",padding:"14px",fontSize:14,fontWeight:700,borderRadius:12,cursor:"pointer",fontFamily:"var(--fn)",backdropFilter:"blur(8px)"}}>Message Seller</button>
          </div>}
        </>}
      </div>
    );
  };

  if(loading&&!listings.length)return<div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#000"}}><Spin s="48px"/></div>;
  if(!listings.length)return<div style={{height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#111",gap:16,padding:24,textAlign:"center"}}>
    <div style={{opacity:.3,marginBottom:4}}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
    <div style={{fontWeight:700,fontSize:18,color:"#fff"}}>No listings yet</div>
    <div style={{fontSize:14,color:"rgba(255,255,255,.5)"}}>Be the first to post something</div>
    <button onClick={()=>onPostAd&&onPostAd()} style={{background:"#1428A0",color:"#fff",border:"none",padding:"14px 28px",fontSize:14,fontWeight:700,borderRadius:10,cursor:"pointer",fontFamily:"var(--fn)",marginTop:8}}>+ Post an Ad</button>
  </div>;

  const visCount=Math.min(listings.length,7);
  const visStart=Math.max(0,Math.min(idx-3,listings.length-visCount));

  return(<>
    {shareModal&&<ShareModal listing={shareModal} onClose={()=>setShareModal(null)}/>}
    {reportTarget&&<ReportListingModal listing={reportTarget} token={token} onClose={()=>setReportTarget(null)}/>}
    <div ref={containerRef} style={{height:"100vh",width:"100%",background:"#000",position:"relative",overflow:"hidden",userSelect:"none",WebkitUserSelect:"none",touchAction:"none"}}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* Left / Current / Right slides */}
      {renderSlide(-1)}
      {renderSlide(1)}
      {renderSlide(0)}

      {/* Fixed UI — always on top, not part of swipe stack */}
      {/* Back button */}
      {onClose&&<button onClick={onClose} style={{position:"absolute",top:14,left:14,width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,.6)",border:"2px solid rgba(255,255,255,.3)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:20,backdropFilter:"blur(4px)"}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
      </button>}
      {/* Counter pill + autoscroll toggle */}
      <div style={{position:"absolute",top:14,right:14,display:"flex",gap:8,alignItems:"center",zIndex:20}}>
        {/* Autoscroll toggle switch */}
        <div
          onClick={()=>setAutoScroll(s=>!s)}
          title={autoScroll?"Pause autoscroll":"Start autoscroll"}
          style={{
            display:"flex",alignItems:"center",gap:7,
            background:"rgba(0,0,0,.58)",
            borderRadius:20,padding:"5px 10px 5px 12px",
            cursor:"pointer",backdropFilter:"blur(6px)",
            border:"1.5px solid rgba(255,255,255,.18)",
            userSelect:"none",WebkitUserSelect:"none",
          }}
        >
          <span style={{color:"rgba(255,255,255,.85)",fontSize:10,fontWeight:700,letterSpacing:".05em",fontFamily:"var(--fn)"}}>AUTOPLAY</span>
          {/* Toggle track */}
          <div style={{
            width:34,height:18,borderRadius:9,flexShrink:0,position:"relative",
            background:autoScroll?"#1428A0":"rgba(255,255,255,.22)",
            border:"1.5px solid rgba(255,255,255,.2)",
            transition:"background .2s ease",
          }}>
            {/* Toggle thumb */}
            <div style={{
              position:"absolute",top:1,
              left:autoScroll?14:1,
              width:12,height:12,borderRadius:"50%",
              background:"#fff",
              transition:"left .2s ease",
              boxShadow:"0 1px 4px rgba(0,0,0,.5)",
            }}/>
          </div>
        </div>
        <div style={{background:"rgba(0,0,0,.55)",color:"#fff",fontSize:12,fontWeight:700,padding:"5px 12px",borderRadius:20,backdropFilter:"blur(4px)"}}>
          {idx+1} / {total}
        </div>
      </div>
    </div>
  </>);
}

// ── HOT RIGHT NOW — horizontal scroll of popular listings ─────────────────────
function HotRightNow({onOpen,savedIds,onToggleSave,user,onOpenInFeed}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [feedIdx,setFeedIdx]=useState(null);
  useEffect(()=>{api("/api/listings?sort=popular&limit=10").then(d=>setItems(d.listings||[])).catch(()=>{}).finally(()=>setLoading(false));},[]);
  if(!loading&&!items.length)return null;
  if(loading)return <div style={{marginBottom:8}}>
    <div style={{fontWeight:700,fontSize:15,color:"#1A1A1A",padding:"14px 16px 10px"}}>Hot Right Now</div>
    <div style={{display:"flex",gap:10,padding:"4px 16px 14px",overflowX:"hidden"}}>
      {[1,2,3,4].map(i=><div key={i} style={{flexShrink:0,width:150}}>
        <Skeleton w={150} h={150} r={12} style={{marginBottom:8}}/>
        <Skeleton w="80%" h={13} style={{marginBottom:5}}/>
        <Skeleton w="50%" h={16}/>
      </div>)}
    </div>
  </div>;
  const openItem=(l,i)=>{
    if(onOpenInFeed){onOpenInFeed(items,i);}
    else if(typeof window!=="undefined"&&window.innerWidth>=768&&onOpen){onOpen(l);}
    else{setFeedIdx(i);}
  };
  return<>
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 6px"}}>
        <div style={{fontWeight:700,fontSize:15,color:"#1A1A1A"}}>Hot Right Now</div>
        <div style={{fontSize:11,color:"#AAAAAA",fontWeight:500}}>Most viewed today</div>
      </div>
      <div style={{display:"flex",gap:10,overflowX:"auto",padding:"4px 16px 12px",WebkitOverflowScrolling:"touch",msOverflowStyle:"none",scrollbarWidth:"none"}}>
        {items.map((l,i)=>{
          const photo=Array.isArray(l.photos)?l.photos.find(p=>typeof p==="string")||l.photos[0]?.url||null:null;
          const isNew=Date.now()-new Date(l.created_at)<12*3600000;
          const catPhoto=CAT_PHOTOS[l.category];
          return<div key={l.id} onClick={()=>openItem(l,i)} style={{flexShrink:0,width:152,cursor:"pointer"}}>
            <div style={{width:152,height:152,borderRadius:14,overflow:"hidden",background:"#F0F0F0",position:"relative",marginBottom:9,boxShadow:"0 2px 8px rgba(0,0,0,.10),0 6px 20px rgba(20,40,160,.07)",transition:"transform .2s,box-shadow .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.12),0 12px 32px rgba(20,40,160,.12)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.10),0 6px 20px rgba(20,40,160,.07)";}}>
              {photo
                ?<img src={photo} alt={l.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                :catPhoto
                  ?<img src={catPhoto} alt={l.category} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.22,filter:"grayscale(20%)"}}/>
                  :<div style={{width:"100%",height:"100%",background:"#F0F0F0",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:10,color:"#AAAAAA",fontWeight:600}}>No photo</span></div>}
              {isNew&&<div style={{position:"absolute",top:7,left:7,background:"#10b981",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:5,boxShadow:"0 1px 4px rgba(16,185,129,.4)"}}>NEW</div>}
              {l.interest_count>0&&<div style={{position:"absolute",bottom:7,left:7,background:"rgba(232,25,75,.88)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,display:"flex",alignItems:"center",gap:4,backdropFilter:"blur(4px)"}}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>{l.interest_count}
              </div>}
              <HeartBtn saved={savedIds?.has(l.id)} onToggle={e=>{e&&e.stopPropagation&&e.stopPropagation();onToggleSave&&onToggleSave(l);}} size={14} style={{position:"absolute",top:7,right:7,width:30,height:30}}/>
            </div>
            <div style={{fontSize:12,fontWeight:700,color:"#1A1A1A",lineHeight:1.4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{l.title}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#1428A0",marginTop:3,letterSpacing:"-.01em"}}>{fmtKES(l.price)}</div>
          </div>;
        })}
      </div>
    </div>
    {/* SwipeFeed overlay for hot listings */}
    {feedIdx!==null&&<div style={{position:"fixed",inset:0,zIndex:600}}>
      <SwipeFeed user={user} token={null} initialListings={items} startIndex={feedIdx}
        onOpen={l=>{setFeedIdx(null);onOpen&&onOpen(l);}}
        onLockIn={()=>{}} onMessage={()=>{}} savedIds={savedIds} onToggleSave={onToggleSave}
        onSignIn={()=>{}} onPostAd={()=>{}} onClose={()=>setFeedIdx(null)}/>
    </div>}
  </>;
}

// ── ALL LISTINGS PAGE — Full standalone /listings page ────────────────────────
function AllListingsPage({user,token,notify,onBack,onOpenListing,onToggleSave,savedIds,onPostAd,onSignIn,onLockIn,onChatListing,initialFilter}){
  const [listings,setListings]=useState([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false);
  const [vm,setVm]=useState("grid");
  const [searchInput,setSearchInput]=useState(initialFilter?.q||"");
  const [search,setSearch]=useState(initialFilter?.q||"");
  const [category,setCategory]=useState(initialFilter?.cat||"");
  const [subcat,setSubcat]=useState(initialFilter?.subcat||"");
  const [county,setCounty]=useState(initialFilter?.county||"");
  const [minPrice,setMinPrice]=useState(initialFilter?.minPrice||"");
  const [maxPrice,setMaxPrice]=useState(initialFilter?.maxPrice||"");
  const [sort,setSort]=useState(initialFilter?.sort||"newest");
  const [pg,setPg]=useState(1);
  const [feedIdx,setFeedIdx]=useState(null);
  const loaderRef=useRef(null);
  const PER=24;
  const filterCat=CATS.find(c=>c.name===category);
  const hasFilters=search||category||subcat||county||minPrice||maxPrice||sort!=="newest";

  useEffect(()=>{
    if(pg===1)setLoading(true);else setLoadingMore(true);
    const p=new URLSearchParams({page:pg,limit:PER,sort});
    if(search)p.set("search",search);
    if(category)p.set("category",category);
    if(subcat)p.set("subcat",subcat);
    if(county)p.set("county",county);
    if(minPrice)p.set("minPrice",minPrice);
    if(maxPrice)p.set("maxPrice",maxPrice);
    api(`/api/listings?${p}`).then(d=>{
      setListings(prev=>pg===1?(d.listings||[]):[...prev,...(d.listings||[])]);
      setTotal(d.total||0);
    }).catch(()=>{}).finally(()=>{setLoading(false);setLoadingMore(false);});
  },[search,category,subcat,county,minPrice,maxPrice,sort,pg]);

  // Reset to page 1 when filters change
  useEffect(()=>{setPg(1);},[search,category,subcat,county,minPrice,maxPrice,sort]);

  // Infinite scroll observer
  useEffect(()=>{
    if(!loaderRef.current)return;
    const obs=new IntersectionObserver(([e])=>{
      if(e.isIntersecting&&!loadingMore&&!loading&&listings.length<total){setPg(p=>p+1);}
    },{threshold:0.1});
    obs.observe(loaderRef.current);
    return()=>obs.disconnect();
  },[loadingMore,loading,listings.length,total]);

  const clearFilters=()=>{setSearchInput("");setSearch("");setCategory("");setSubcat("");setCounty("");setMinPrice("");setMaxPrice("");setSort("newest");setPg(1);};

  return<div style={{minHeight:"100vh",background:"#F7F7F7",fontFamily:"var(--fn)"}}>
    {/* Header */}
    <div style={{background:"linear-gradient(135deg,#1D1D1D 0%,#333 100%)",padding:"clamp(20px,4vw,40px) clamp(16px,4vw,48px) 0"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,gap:12,flexWrap:"wrap"}}>
        <div>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)",display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>Back
          </button>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.6)",marginBottom:6}}>Marketplace</div>
          <h1 style={{fontSize:"clamp(24px,3vw,40px)",fontWeight:700,color:"#fff",letterSpacing:"-.02em",lineHeight:1.1}}>All Listings</h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,.7)",marginTop:6}}>{total} item{total!==1?"s":""} available</p>
        </div>
        {user&&<button style={{background:"#1428A0",color:"#fff",border:"none",padding:"12px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8,whiteSpace:"nowrap"}} onClick={onPostAd}>+ Post Ad</button>}
        {!user&&<button style={{background:"#fff",color:"#1D1D1D",border:"none",padding:"12px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8,whiteSpace:"nowrap"}} onClick={onSignIn}>Sign In to Post</button>}
      </div>
      {/* Search bar */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingBottom:20}}>
        <div style={{display:"flex",flex:"2 1 300px",gap:0,border:"1.5px solid rgba(255,255,255,.3)",borderRadius:8,overflow:"hidden",background:"rgba(255,255,255,.1)",minWidth:0}}>
          <input style={{flex:1,padding:"10px 14px",border:"none",outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"transparent",color:"#fff",minWidth:0}}
            placeholder="Search listings..." value={searchInput}
            onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){setSearch(searchInput);setPg(1);}}}/>
          <button onClick={()=>{setSearch(searchInput);setPg(1);}} style={{background:"rgba(255,255,255,.2)",color:"#fff",border:"none",padding:"0 16px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"var(--fn)",flexShrink:0}}>Search</button>
        </div>
        <select style={{padding:"10px 12px",border:"1.5px solid rgba(255,255,255,.3)",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"rgba(255,255,255,.1)",cursor:"pointer",color:"#fff",flex:"1 1 160px"}}
          value={category} onChange={e=>{setCategory(e.target.value);setSubcat("");setPg(1);}}>
          <option value="">All Categories</option>
          {CATS.map(c=><option key={c.name} value={c.name} style={{color:"#000"}}>{c.name}</option>)}
        </select>
        {filterCat&&<select style={{padding:"10px 12px",border:"1.5px solid rgba(255,255,255,.3)",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"rgba(255,255,255,.1)",cursor:"pointer",color:"#fff",flex:"1 1 140px"}}
          value={subcat} onChange={e=>{setSubcat(e.target.value);setPg(1);}}>
          <option value="">All Subcategories</option>
          {filterCat.sub.map(s=><option key={s} value={s} style={{color:"#000"}}>{s}</option>)}
        </select>}
      </div>
    </div>
{/* Secondary filters */}
<div style={{background:"#fff",borderBottom:"1px solid #EBEBEB",padding:"12px clamp(16px,4vw,48px)",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
  <select style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer",color:"#444"}}
  value={county} onChange={e=>{setCounty(e.target.value);setPg(1);}}>
  <option value="">All Counties</option>
  {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
  </select>
  <input style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",width:120}} type="text" inputMode="decimal" placeholder="Min KSh" value={minPrice} onChange={e=>{setMinPrice(e.target.value);setPg(1);}}/>
  <input style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",width:120}} type="text" inputMode="decimal" placeholder="Max KSh" value={maxPrice} onChange={e=>{setMaxPrice(e.target.value);setPg(1);}}/>
  <select style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer",color:"#444"}}
  value={sort} onChange={e=>{setSort(e.target.value);setPg(1);}}>
  <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="price_asc">Price: Low → High</option>
        <option value="price_desc">Price: High → Low</option>
        <option value="popular">Most Viewed</option>
        <option value="expiring">Expiring Soon</option>
      </select>
      <div style={{display:"flex",gap:2}}>
        <button onClick={()=>setVm("grid")} style={{background:vm==="grid"?"#1D1D1D":"#fff",color:vm==="grid"?"#fff":"#767676",border:"1px solid #E0E0E0",padding:"8px 12px",cursor:"pointer",fontSize:13,fontFamily:"var(--fn)",borderRadius:"6px 0 0 6px"}}>Grid</button>
        <button onClick={()=>setVm("list")} style={{background:vm==="list"?"#1D1D1D":"#fff",color:vm==="list"?"#fff":"#767676",border:"1px solid #E0E0E0",borderLeft:"none",padding:"8px 12px",cursor:"pointer",fontSize:13,fontFamily:"var(--fn)",borderRadius:"0 6px 6px 0"}}>List</button>
      </div>
      {hasFilters&&<button style={{padding:"8px 14px",border:"1px solid #E0E0E0",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,fontFamily:"var(--fn)",color:"#636363"}} onClick={clearFilters}>Clear All</button>}
    </div>
    {/* Content */}
    <div style={{padding:"clamp(20px,3vw,40px) clamp(16px,4vw,48px) 80px"}}>
      {loading?<div className={vm==="grid"?"g3":"lvc"}>{[1,2,3,4,5,6,7,8].map(i=><SkeletonCard key={i}/>)}</div>
        :listings.length===0?<div style={{textAlign:"center",padding:"80px 20px",color:"#767676"}}>
          <div style={{marginBottom:16,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.search(56,"currentColor")}</div>
          <div style={{fontWeight:700,fontSize:18,marginBottom:10,letterSpacing:"-.01em"}}>No listings found</div>
          <div style={{fontSize:14,marginBottom:22,color:"#AAAAAA",lineHeight:1.65}}>Try adjusting your filters or search terms</div>
          {hasFilters&&<button className="btn bp" onClick={clearFilters}>Clear Filters</button>}
        </div>
        :<>
          <div className={vm==="grid"?"g3":"lvc"}>
            {listings.map((l, i)=><ListingCard key={l.id} listing={l} onClick={()=>{
              if(typeof window!=="undefined"&&window.innerWidth<768){
                setFeedIdx(i);
              }else{
                onOpenListing&&onOpenListing(l);
              }
            }} listView={vm==="list"} isSaved={savedIds?.has(l.id)} onSave={user?()=>onToggleSave&&onToggleSave(l):null}/>)}
          </div>
          <div ref={loaderRef} style={{height:72,display:"flex",alignItems:"center",justifyContent:"center",marginTop:16}}>
            {loadingMore&&<div className={vm==="grid"?"g3":"lvc"} style={{width:"100%"}}>{[1,2,3].map(i=><SkeletonCard key={i}/>)}</div>}
            {!loadingMore&&listings.length>=total&&total>0&&<div className="inf-end">You've seen all {total} listings — check back soon for new ones</div>}
          </div>
        </>}
    </div>
    {feedIdx!==null&&<div style={{position:"fixed",inset:0,zIndex:9999}}>
      <SwipeFeed user={user} token={token} initialListings={listings} startIndex={feedIdx}
        onOpen={l=>{setFeedIdx(null);onOpenListing&&onOpenListing(l);}}
        onLockIn={onLockIn||((l)=>{})} onMessage={l=>{setFeedIdx(null);onChatListing&&onChatListing(l);}} savedIds={savedIds} onToggleSave={onToggleSave}
        onSignIn={onSignIn} onPostAd={onPostAd} onClose={()=>setFeedIdx(null)}/>
    </div>}
  </div>;
}

// ── SOLD PAGE — Full standalone /sold page ─────────────────────────────────────
function SoldPage({token,user,onBack}){
  const [items,setItems]=useState([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [searchInput,setSearchInput]=useState("");
  const [search,setSearch]=useState("");
  const [cat,setCat]=useState("");
  const [pg,setPg]=useState(1);
  const PER=24;

  useEffect(()=>{
    setLoading(true);
    const params=new URLSearchParams({page:pg,limit:PER});
    if(cat)params.set("category",cat);
    if(search)params.set("search",search);
    api(`/api/listings/sold?${params}`).then(d=>{setItems(d.listings||[]);setTotal(d.total||0);})
      .catch(()=>{}).finally(()=>setLoading(false));
  },[pg,cat,search]);

  return<div style={{minHeight:"100vh",background:"#111",fontFamily:"var(--fn)"}}>
    {/* Dark header */}
    <div style={{background:"#1D1D1D",padding:"clamp(20px,4vw,52px) clamp(16px,4vw,48px) 0"}}>
      <button onClick={onBack} style={{background:"transparent",border:"1px solid rgba(255,255,255,.35)",color:"#fff",padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)",marginBottom:28,display:"inline-flex",alignItems:"center",gap:6,letterSpacing:".02em",borderRadius:8}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>Back to Marketplace
      </button>
      <div style={{marginBottom:14,opacity:.9}}><WekaSokoLogo size={26} light/></div>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(255,255,255,.55)",marginBottom:10}}>Sold Listings</div>
      <h1 style={{fontSize:"clamp(30px,5vw,54px)",fontWeight:700,letterSpacing:"-.03em",color:"#fff",lineHeight:1.05,marginBottom:14}}>Sold on Weka Soko</h1>
      <p style={{fontSize:15,color:"rgba(255,255,255,.7)",maxWidth:500,lineHeight:1.75,marginBottom:24}}>Real items. Real buyers. Every listing below found a home through Weka Soko.</p>
      {/* Search + category */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingBottom:20}}>
        <div style={{display:"flex",flex:"2 1 280px",gap:0,border:"1.5px solid rgba(255,255,255,.25)",borderRadius:8,overflow:"hidden",background:"rgba(255,255,255,.08)",minWidth:0}}>
          <input style={{flex:1,padding:"10px 14px",border:"none",outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"transparent",color:"#fff",minWidth:0}}
            placeholder="Search sold items..." value={searchInput}
            onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){setSearch(searchInput);setPg(1);}}}/>
          <button onClick={()=>{setSearch(searchInput);setPg(1);}} style={{background:"rgba(255,255,255,.15)",color:"#fff",border:"none",padding:"0 16px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"var(--fn)",flexShrink:0}}>Search</button>
        </div>
        <select style={{padding:"10px 12px",border:"1.5px solid rgba(255,255,255,.25)",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"rgba(255,255,255,.08)",cursor:"pointer",color:"#fff",flex:"1 1 160px"}}
          value={cat} onChange={e=>{setCat(e.target.value);setPg(1);}}>
          <option value="">All Categories</option>
          {CATS.map(c=><option key={c.name} value={c.name} style={{color:"#000"}}>{c.name}</option>)}
        </select>
      </div>
    </div>
    <div style={{background:"#F0F0F0",padding:"clamp(28px,3vw,44px) clamp(16px,4vw,48px) 80px"}}>
      {total>0&&<div style={{display:"flex",gap:0,border:"1px solid #E5E5E5",marginBottom:28,background:"#fff",borderRadius:12,overflow:"hidden",flexWrap:"wrap"}}>
        {[{label:"Total Sales",val:total},{label:"Categories",val:[...new Set(items.map(i=>i.category))].length},{label:"Avg Price",val:items.length?"KSh "+Math.round(items.reduce((a,l)=>a+(parseFloat(l.price)||0),0)/items.length).toLocaleString("en-KE"):"—"}].map((s,i)=>(
          <div key={s.label} style={{flex:1,padding:"18px 20px",borderRight:i<2?"1px solid #E5E5E5":"none",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:700,letterSpacing:"-.02em",color:"#111111"}}>{s.val}</div>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"#767676",marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>}
      {loading?<div style={{textAlign:"center",padding:60}}><Spin s="40px"/></div>
        :items.length===0?<div style={{textAlign:"center",padding:"80px 20px",color:"#767676"}}>
          <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>No sold items found</div>
          {(cat||search)&&<button className="btn bs" style={{marginTop:12}} onClick={()=>{setCat("");setSearch("");setSearchInput("");}}>Clear Filters</button>}
        </div>
        :<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:20,marginBottom:32}}>
            {items.map(l=><SoldCard key={l.id} l={l} showContact={true}/>)}
          </div>
          {Math.ceil(total/PER)>1&&<div style={{display:"flex",justifyContent:"center",gap:8,alignItems:"center"}}>
            <button className="btn bs sm" onClick={()=>{setPg(p=>Math.max(1,p-1));window.scrollTo(0,0);}} disabled={pg<=1} style={{opacity:pg<=1?.4:1}}>← Prev</button>
            <span style={{fontSize:13,color:"#888",fontWeight:500}}>Page {pg} of {Math.ceil(total/PER)}</span>
            <button className="btn bp sm" onClick={()=>{setPg(p=>Math.min(Math.ceil(total/PER),p+1));window.scrollTo(0,0);}} disabled={pg>=Math.ceil(total/PER)} style={{opacity:pg>=Math.ceil(total/PER)?.4:1}}>Next →</button>
          </div>}
        </>}
    </div>
  </div>;
}

// ── BUYERS WANT PAGE — Full standalone page ───────────────────────────────────
function BuyersWantPage({user,token,notify,onBack,onIHaveThis,onSignIn}){
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
  const [pg,setPg]=useState(1);
  const PER=20;
  const filterCat=CATS.find(c=>c.name===category);
  const hasFilters=search||county||category||subcat||minPrice||maxPrice||sort!=="newest";

  const handleIHaveThis=(request)=>{
    if(!user){onSignIn&&onSignIn();return;}
    if(user.role!=="seller"){
      if(window.confirm("To respond to this buyer request you need a Seller account.\n\nSwitch to Seller now?")){
        onIHaveThis&&onIHaveThis(request,"switch_to_seller");
      }
      return;
    }
    if(user.id===request.user_id){notify("This is your own request","warning");return;}
    onIHaveThis&&onIHaveThis(request,"post_ad");
  };

  useEffect(()=>{
    setLoading(true);
    const p=new URLSearchParams({page:pg,limit:PER,sort});
    if(search)p.set("search",search);
    if(county)p.set("county",county);
    if(category)p.set("category",category);
    if(subcat)p.set("subcat",subcat);
    if(minPrice)p.set("min_price",minPrice);
    if(maxPrice)p.set("max_price",maxPrice);
    api(`/api/requests?${p}`).then(d=>{setRequests(d.requests||[]);setTotal(d.total||0);})
      .catch(()=>{}).finally(()=>setLoading(false));
  },[search,county,category,subcat,minPrice,maxPrice,sort,pg]);

  const clearFilters=()=>{setSearchInput("");setSearch("");setCounty("");setCategory("");setSubcat("");setMinPrice("");setMaxPrice("");setSort("newest");setPg(1);};

  return <div style={{minHeight:"100vh",background:"#F7F7F7",fontFamily:"var(--fn)"}}>
    {/* Page header */}
    <div style={{background:"linear-gradient(135deg,#1428A0 0%,#0F1F8A 100%)",padding:"clamp(20px,4vw,40px) clamp(16px,4vw,48px) 0"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,gap:12,flexWrap:"wrap"}}>
        <div>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)",display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>Back
          </button>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.6)",marginBottom:6}}>Community</div>
          <h1 style={{fontSize:"clamp(24px,3vw,40px)",fontWeight:700,color:"#fff",letterSpacing:"-.02em",lineHeight:1.1}}>What Buyers Want</h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,.7)",marginTop:6}}>{total} active request{total!==1?"s":""}</p>
        </div>
        <button style={{background:"#fff",color:"#1428A0",border:"none",padding:"12px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8,whiteSpace:"nowrap"}}
          onClick={()=>{if(!user){onSignIn&&onSignIn();return;}setShowModal(true);}}>+ Post a Request</button>
      </div>
      {/* Filter bar — inside header */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingBottom:20}}>
        <div style={{display:"flex",flex:"2 1 280px",gap:0,border:"1.5px solid rgba(255,255,255,.3)",borderRadius:8,overflow:"hidden",background:"rgba(255,255,255,.1)",minWidth:0}}>
          <input style={{flex:1,padding:"10px 14px",border:"none",outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"transparent",color:"#fff",minWidth:0}}
            placeholder="Search requests..." value={searchInput}
            onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){setSearch(searchInput);setPg(1);}}}
            style={{flex:1,padding:"10px 14px",border:"none",outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"transparent",color:"#fff",minWidth:0,"::placeholder":{color:"rgba(255,255,255,.5)"}}}/>
          <button onClick={()=>{setSearch(searchInput);setPg(1);}} style={{background:"rgba(255,255,255,.2)",color:"#fff",border:"none",padding:"0 16px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"var(--fn)",flexShrink:0}}>Search</button>
        </div>
        <select style={{padding:"10px 12px",border:"1.5px solid rgba(255,255,255,.3)",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"rgba(255,255,255,.1)",cursor:"pointer",color:"#fff",flex:"1 1 140px"}}
          value={category} onChange={e=>{setCategory(e.target.value);setSubcat("");setPg(1);}}>
          <option value="">All Categories</option>
          {CATS.map(c=><option key={c.name} value={c.name} style={{color:"#000"}}>{c.name}</option>)}
        </select>
        {filterCat&&<select style={{padding:"10px 12px",border:"1.5px solid rgba(255,255,255,.3)",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"rgba(255,255,255,.1)",cursor:"pointer",color:"#fff",flex:"1 1 120px"}}
          value={subcat} onChange={e=>{setSubcat(e.target.value);setPg(1);}}>
          <option value="">All Subcategories</option>
          {filterCat.sub.map(s=><option key={s} value={s} style={{color:"#000"}}>{s}</option>)}
        </select>}
      </div>
    </div>

{/* Secondary filter row */}
<div style={{background:"#fff",borderBottom:"1px solid #EBEBEB",padding:"12px clamp(16px,4vw,48px)",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
  <select style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer",color:"#444"}}
  value={county} onChange={e=>{setCounty(e.target.value);setPg(1);}}>
  <option value="">All Counties</option>
  {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
  </select>
  <input style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",width:120}} type="text" inputMode="decimal" placeholder="Min KSh" value={minPrice} onChange={e=>{setMinPrice(e.target.value);setPg(1);}}/>
  <input style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",width:120}} type="text" inputMode="decimal" placeholder="Max KSh" value={maxPrice} onChange={e=>{setMaxPrice(e.target.value);setPg(1);}}/>
  <select style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer",color:"#444"}}
  value={sort} onChange={e=>{setSort(e.target.value);setPg(1);}}>
  <option value="newest">Newest First</option>
  <option value="oldest">Oldest First</option>
  <option value="budget_desc">Highest Budget</option>
  <option value="budget_asc">Lowest Budget</option>
  </select>
      {hasFilters&&<button style={{padding:"8px 14px",border:"1px solid #E0E0E0",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,fontFamily:"var(--fn)",color:"#636363"}} onClick={clearFilters}>Clear All</button>}
    </div>

    {/* Content */}
    <div style={{padding:"clamp(20px,3vw,40px) clamp(16px,4vw,48px) 80px"}}>
      {loading?<div style={{textAlign:"center",padding:60}}><Spin s="40px"/></div>
        :requests.length===0?<div style={{textAlign:"center",padding:"80px 20px",color:"#767676"}}>
          <div style={{marginBottom:16,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
          <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>{hasFilters?"No requests match your filters":"No requests yet"}</div>
          <div style={{fontSize:14,marginBottom:20}}>{hasFilters?"Try different filters":"Be the first to post what you're looking for"}</div>
          {hasFilters?<button className="btn bp" style={{marginTop:8}} onClick={clearFilters}>Clear Filters</button>
            :<button className="btn bp" style={{marginTop:8}} onClick={()=>{if(!user){onSignIn&&onSignIn();return;}setShowModal(true);}}>+ Post a Request</button>}
        </div>
        :<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14,marginBottom:32}}>
            {requests.map(r=><RequestCard key={r.id} r={r} user={user} token={token} notify={notify}
              onIHaveThis={handleIHaveThis}
              onDelete={id=>{setRequests(p=>p.filter(x=>x.id!==id));setTotal(t=>t-1);}}/>)}
          </div>
          {/* Pagination */}
          {Math.ceil(total/PER)>1&&<div style={{display:"flex",justifyContent:"center",gap:8,alignItems:"center"}}>
            <button className="btn bs sm" onClick={()=>{setPg(p=>Math.max(1,p-1));window.scrollTo(0,0);}} disabled={pg<=1} style={{opacity:pg<=1?.4:1}}>← Prev</button>
            <span style={{fontSize:13,color:"#888",fontWeight:500}}>Page {pg} of {Math.ceil(total/PER)}</span>
            <button className="btn bp sm" onClick={()=>{setPg(p=>Math.min(Math.ceil(total/PER),p+1));window.scrollTo(0,0);}} disabled={pg>=Math.ceil(total/PER)} style={{opacity:pg>=Math.ceil(total/PER)?.4:1}}>Next →</button>
          </div>}
        </>}
    </div>

    {showModal&&<PostRequestModal token={token} notify={notify} onClose={()=>setShowModal(false)} onSuccess={r=>{setRequests(p=>[r,...p]);setTotal(t=>t+1);}}/>}
  </div>;
}



export { MobileRequestsTab, MobileLayout, ReportListingModal, SwipeFeed, HotRightNow, AllListingsPage, SoldPage, BuyersWantPage };
