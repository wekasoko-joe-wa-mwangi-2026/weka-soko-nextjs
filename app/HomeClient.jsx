'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { apiCall, fmtKES, ago, CATS, KENYA_COUNTIES, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';
import { WekaSokoLogo, Spin, Toast, Modal, FF, Counter, ImageUploader, TermsModal, PasswordField, ForgotPasswordPanel, ResetPasswordModal, WatermarkedImage, Lightbox, AuthModal, ShareModal, PayModal, ChatModal, PostAdModal, ListingCard, LeaveReviewBtn, ReportListingBtn, VerificationBanner, DetailModal, MarkSoldModal, RoleSwitcher, PostRequestModal, WhatBuyersWant, SoldSection, StarPicker, ReviewsSection, MyRequestsTab, PitchesTab, ProfileSection, PasswordSection, VerificationSection, MobileDashboard, Dashboard, PWABanner, Pager, MobileRequestsTab, MobileLayout } from '@/components/all';

export default function HomeClient({ initialListings, initialTotal, initialStats, initialCounties, initialFilter, initialPage }) {
  const [user,setUser]=useState(null);
  const [token,setToken]=useState(null);
  const [page,setPage]=useState("home");
  const [listings,setListings]=useState(initialListings||[]);
  const [total,setTotal]=useState(initialTotal||0);
  const [loading,setLoading]=useState(true);
  const [stats,setStats]=useState(initialStats||{users:0,activeAds:0,sold:0,revenue:0});
  const [filter,setFilter]=useState(initialFilter||{cat:"",q:"",county:"",minPrice:"",maxPrice:"",sort:"newest"});
  const [counties,setCounties]=useState(initialCounties||[]);
  const [pg,setPg]=useState(initialPage||1);
  const [vm,setVm]=useState("grid");
  const [toast,setToast]=useState(null);
  const [modal,setModal]=useState(null);
  const [showPWA,setShowPWA]=useState(true);
  const [notifCount,setNotifCount]=useState(0);
  const socketRef=useRef(null);
  const [resetToken,setResetToken]=useState(null);

  const notify=useCallback((msg,type="info")=>setToast({msg,type,id:Date.now()}),[]);

  // ✅ FIX: Initialize isMobile as false, set on client-side only
  const [isMobile,setIsMobile]=useState(false);
  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<768);
    check();
    window.addEventListener('resize',check);
    return()=>window.removeEventListener('resize',check);
  },[]);

  const [mobileFiltersOpen,setMobileFiltersOpen]=useState(false);
  const [mobileTab,setMobileTab]=useState('home');

  const closeModal=useCallback(()=>{
    setModal(null);
    if(typeof window !== 'undefined' && window.location.search.includes('listing=')){
      window.history.pushState({},'','/');
    }
  },[]);

  // ── Handle Google OAuth callback + password reset token ───────────────────
  // IMPORTANT: This must run BEFORE the URL router effects so navTo('/')
  // doesn't strip ?reset_token / ?auth_token / ?verify_email from the URL first.
  useEffect(()=>{
    if(typeof window === 'undefined') return;
    const search=new URLSearchParams(window.location.search);
    const hash=new URLSearchParams(window.location.hash.replace(/^#/,""));
    const getParam=(k)=>search.get(k)||hash.get(k)||null;
    const t=getParam("auth_token");
    const u=getParam("auth_user");
    const err=getParam("auth_error");
    const rt=getParam("reset_token");

    if(t&&u){
      try{
        const parsed=JSON.parse(decodeURIComponent(u));
        localStorage.setItem("ws_token",t);
        localStorage.setItem("ws_user",JSON.stringify(parsed));
        setUser(parsed);setToken(t);
        apiCall("/api/auth/me",{},t).then(fresh=>{setUser(fresh);localStorage.setItem("ws_user",JSON.stringify(fresh));}).catch(()=>{});
        notify("Welcome back, "+parsed.name.split(" ")[0]+"! 🎉","success");
        window.history.replaceState({},"",window.location.pathname);
      }catch(e){console.error("OAuth parse error",e);}
    }
    if(rt){
      setResetToken(rt);
      window.history.replaceState({},"",window.location.pathname);
    }
    const vt=search.get("verify_email");
    if(vt){
      apiCall("/api/auth/verify-email?token="+vt).then(r=>{
        if(r.token&&r.user){
          localStorage.setItem("ws_token",r.token);
          localStorage.setItem("ws_user",JSON.stringify(r.user));
          setUser(r.user);
          setToken(r.token);
          notify("✅ Email verified! Welcome to Weka Soko.","success");
        } else {
          notify("✅ Email verified! You can now sign in.","success");
        }
      }).catch(e=>notify(e.message||"Verification failed","error"));
      window.history.replaceState({},"",window.location.pathname);
    }
    if(err)notify("Google sign-in failed: "+decodeURIComponent(err),"error");
  },[notify]);

  // ── URL ROUTER ────────────────────────────────────────────────────────────────
  const parseAndApplyURL = useCallback((path, search) => {
    const params = new URLSearchParams(search);
    const segments = path.replace(/^\//, '').split('/').filter(Boolean);
    const section = segments[0] || '';
    const sub = segments[1] || '';

    if (section === 'sold') {
      setPage('sold');
    } else if (section === 'dashboard') {
      setPage('dashboard');
      if (sub) {
        if(typeof window !== 'undefined') window.__initialDashTab = sub;
      }
    } else if (section === 'requests') {
      setPage('home');
      setMobileTab('requests');
    } else {
      setPage('home');
      const cat = params.get('cat') || '';
      const q = params.get('q') || '';
      const county = params.get('county') || '';
      const sort = params.get('sort') || 'newest';
      const pg_val = parseInt(params.get('pg') || '1');
      if (cat || q || county || sort !== 'newest' || pg_val > 1) {
        setFilter(f => ({ ...f, cat, q, county, sort }));
        if (pg_val > 1) setPg(pg_val);
      }
      const listingId = params.get('listing');
      if (listingId) {
        apiCall(`/api/listings/${listingId}`, {}, null).then(l => {
          if (l && l.id) setModal({ type: 'detail', listing: l });
        }).catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    if(typeof window === 'undefined') return;
    parseAndApplyURL(window.location.pathname, window.location.search);
  }, [parseAndApplyURL]);

  useEffect(() => {
    if(typeof window === 'undefined') return;
    const onPop = () => parseAndApplyURL(window.location.pathname, window.location.search);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [parseAndApplyURL]);

  const navTo = useCallback((path, replaceState = false) => {
    if(typeof window === 'undefined') return;
    const method = replaceState ? 'replaceState' : 'pushState';
    if (window.location.pathname + window.location.search !== path) {
      window.history[method]({}, '', path);
    }
  }, []);

  useEffect(() => {
    if (page === 'sold') navTo('/sold');
    else if (page === 'dashboard') navTo('/dashboard');
    else if (page === 'home' && mobileTab === 'requests') navTo('/requests');
  }, [page, mobileTab, navTo]);

  useEffect(() => {
    if (page !== 'home' || mobileTab === 'requests') return;
    // Don't overwrite URL if auth/reset tokens are present
    if (typeof window !== 'undefined') {
      const _s = window.location.search;
      if (_s.includes('reset_token=') || _s.includes('auth_token=') || _s.includes('verify_email=')) return;
    }
    const p = new URLSearchParams();
    if (filter.cat) p.set('cat', filter.cat);
    if (filter.q) p.set('q', filter.q);
    if (filter.county) p.set('county', filter.county);
    if (filter.sort && filter.sort !== 'newest') p.set('sort', filter.sort);
    if (pg > 1) p.set('pg', String(pg));
    const qs = p.toString();
    navTo(qs ? `/listings?${qs}` : '/');
  }, [page, filter, pg, mobileTab, navTo]);

  // ── END URL ROUTER ─────────────────────────────────────────────────────────

  // Session restore
  useEffect(()=>{
    if(typeof window === 'undefined') return;
    const t=localStorage.getItem("ws_token");
    const u=localStorage.getItem("ws_user");
    if(t&&u){
      try{const parsed=JSON.parse(u);setUser(parsed);setToken(t);}catch{}
      apiCall("/api/auth/me",{},t).then(u=>{setUser(u);localStorage.setItem("ws_user",JSON.stringify(u));}).catch(()=>{localStorage.removeItem("ws_token");localStorage.removeItem("ws_user");setUser(null);setToken(null);});
    }
  },[]);

  // Stats — fetch on load + poll every 30s
  useEffect(()=>{
    const fetchStats=()=>apiCall("/api/stats").then(setStats).catch(()=>{});
    fetchStats();
    const iv=setInterval(fetchStats,30000);
    return()=>clearInterval(iv);
  },[]);

  // Listings — fetch on filter/page change + silent background refresh every 60s
  const listingsFilterRef=useRef(filter);
  const listingsPgRef=useRef(pg);
  useEffect(()=>{listingsFilterRef.current=filter;},[filter]);
  useEffect(()=>{listingsPgRef.current=pg;},[pg]);

  useEffect(()=>{
    const load=async(silent=false)=>{
      if(!silent)setLoading(true);
      try{
        const p=new URLSearchParams({page:pg,limit:PER_PAGE,sort:filter.sort||"newest"});
        if(filter.cat)p.set("category",filter.cat);
        if(filter.q)p.set("search",filter.q);
        if(filter.county)p.set("county",filter.county);
        if(filter.minPrice)p.set("minPrice",filter.minPrice);
        if(filter.maxPrice)p.set("maxPrice",filter.maxPrice);
        const data=await apiCall(`/api/listings?${p}`);
        setListings(data.listings||[]);
        setTotal(data.total||0);
      }catch{if(!silent)setListings([]);}
      finally{if(!silent)setLoading(false);}
    };
    load(false);
    const iv=setInterval(()=>load(true),60000);
    return()=>clearInterval(iv);
  },[pg,filter]);

  // Real-time notifications for logged-in user
  useEffect(()=>{
    if(!token||!user)return;
    const s=io(API,{auth:{token},transports:["websocket","polling"]});
    socketRef.current=s;
    s.on("notification",(n)=>{
      setNotifCount(c=>c+1);
      if(n.type==="listing_match"){
        setNotifCount(c=>c+1);
        return;
      }
      if(n.type==="request_match"){
        notify(n.body||n.title,"success");
        setNotifCount(c=>c+1);
        return;
      }
      if(n.type==="listing_approved"){
        notify("🎉 Your ad is now live on Weka Soko! "+(n.body||""),"success");
        setNotifCount(c=>c+1);
        return;
      }
      if(n.type==="seller_pitch"){
        notify(n.body||n.title,"success");
        setNotifCount(c=>c+1);
        return;
      }
      if(n.type==="pitch_accepted"){
        notify(n.body||n.title,"success");
        setNotifCount(c=>c+1);
        return;
      }
      if(n.type==="warning"||n.type==="suspension"){
        notify(n.title+(n.body?" — "+n.body:""),"error");
        apiCall("/api/auth/me",{},token).then(fresh=>{
          setUser(fresh);localStorage.setItem("ws_user",JSON.stringify(fresh));
          if(fresh.is_suspended){
            notify("⛔ Your account has been suspended. You will be logged out.","error");
            setTimeout(()=>{
              localStorage.removeItem("ws_token");localStorage.removeItem("ws_user");
              setUser(null);setToken(null);
              notify("Account suspended. Contact support@wekasoko.co.ke","error");
            },3000);
          }
        }).catch(()=>{});
      } else if(n.type==="admin_edit"){
        notify("ℹ️ Admin has updated your listing: "+(n.body||""),"info");
      } else {
        notify(n.body||n.title,"info");
      }
    });
    s.on("new_message_inbox",(msg)=>{
      setNotifCount(c=>c+1);
    });
    return()=>s.disconnect();
  },[token,user,notify]);

  // Fetch unread count on login + poll every 20s silently
  useEffect(()=>{
    if(!token)return;
    const fetchUnread=()=>apiCall("/api/notifications",{},token).then(ns=>{
      if(Array.isArray(ns))setNotifCount(ns.filter(n=>!n.is_read).length);
    }).catch(()=>{});
    fetchUnread();
    const iv=setInterval(fetchUnread,20000);
    return()=>clearInterval(iv);
  },[token]);

  // ── Web Push subscription ─────────────────────────────────────────────────
  useEffect(()=>{
    if(!token||!user)return;
    if(typeof window === 'undefined') return;
    if(!("serviceWorker" in navigator)||!("PushManager" in window))return;
    if(Notification.permission==="denied")return;

    const subscribe=async()=>{
      try{
        const {key} = await apiCall("/api/push/vapid-public-key");
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if(existing){
          await apiCall("/api/push/subscribe",{method:"POST",body:JSON.stringify({subscription:existing})},token).catch(()=>{});
          return;
        }
        if(Notification.permission==="default"){
          const perm = await Notification.requestPermission();
          if(perm!=="granted")return;
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:urlBase64ToUint8Array(key)
        });
        await apiCall("/api/push/subscribe",{method:"POST",body:JSON.stringify({subscription:sub})},token);
      }catch(e){console.warn("[Push] subscribe:",e.message);}
    };
    const t = setTimeout(subscribe, 3000);
    return ()=>clearTimeout(t);
  },[token,user]);

  const handleAuth=(u,t)=>{setUser(u);setToken(t);setNotifCount(0);};
  const logout=()=>{setUser(null);setToken(null);setNotifCount(0);if(typeof window !== 'undefined') localStorage.removeItem("ws_token");if(typeof window !== 'undefined') localStorage.removeItem("ws_user");notify("Signed out.","info");};

  const handleLockIn=async listing=>{
    if(!user){setModal({type:"auth",mode:"login"});return;}
    try{
      await apiCall(`/api/listings/${listing.id}/lock-in`,{method:"POST"},token);
      setListings(p=>p.map(l=>l.id===listing.id?{...l,locked_buyer_id:user.id,interest_count:(l.interest_count||0)+1}:l));
      setModal({type:"detail",listing:{...listing,locked_buyer_id:user.id}});
      notify("🔥 Locked in! The seller has been notified.","success");
    }catch(err){notify(err.message,"error");}
  };

  const openListing=async l=>{
    setModal({type:"detail",listing:l});
    if(typeof window !== 'undefined') window.history.pushState({},'',`/?listing=${l.id}`);
    try{
      const fresh=await apiCall(`/api/listings/${l.id}`,{},token);
      setModal({type:"detail",listing:fresh});
    }catch(e){/* keep showing cached version */}
  };

  // Mobile layout
  if(isMobile&&page!=="dashboard"&&page!=="sold") return <>
    <MobileLayout
      user={user} token={token} notify={notify}
      page={page} setPage={setPage}
      listings={listings} total={total} loading={loading}
      filter={filter} setFilter={setFilter} pg={pg} setPg={setPg}
      stats={stats} counties={counties}
      modal={modal} setModal={setModal}
      notifCount={notifCount}
      mobileFiltersOpen={mobileFiltersOpen} setMobileFiltersOpen={setMobileFiltersOpen}
      mobileTab={mobileTab} setMobileTab={setMobileTab}
      openListing={openListing} handleLockIn={handleLockIn}
    />
    {modal?.type==="auth"&&<AuthModal defaultMode={modal.mode} onClose={closeModal} onAuth={handleAuth} notify={notify}/>}
    {modal?.type==="post"&&token&&<PostAdModal onClose={closeModal} token={token} notify={notify} linkedRequest={modal.linkedRequest||null} onSuccess={l=>{setListings(p=>[l,...p]);setTotal(t=>t+1);}}/>}
    {modal?.type==="detail"&&<DetailModal listing={modal.listing} user={user} token={token} onClose={closeModal} notify={notify}
      onShare={()=>setModal({type:"share",listing:modal.listing})}
      onChat={()=>{if(!user){notify("Sign in to chat","warning");setModal({type:"auth",mode:"login"});return;}setModal({type:"chat",listing:modal.listing});}}
      onLockIn={()=>handleLockIn(modal.listing)}
      onUnlock={()=>setModal({type:"pay",payType:"unlock",listing:modal.listing})}
      onEscrow={()=>{if(!user){notify("Sign in first","warning");setModal({type:"auth",mode:"login"});return;}setModal({type:"pay",payType:"escrow",listing:modal.listing});}}
    />}
    {modal?.type==="chat"&&user&&<ChatModal listing={modal.listing} user={user} token={token} onClose={closeModal} notify={notify}/>}
    {modal?.type==="share"&&<ShareModal listing={modal.listing} onClose={closeModal}/>}
    {modal?.type==="pay"&&user&&<PayModal type={modal.payType} listingId={modal.listing.id}
      amount={modal.payType==="unlock"?250:modal.listing.price+Math.round(modal.listing.price*0.075)}
      purpose={modal.payType==="unlock"?`Unlock buyer contact: ${modal.listing.title}`:`Escrow for: ${modal.listing.title}`}
      token={token} user={user} allowVoucher={true}
      onSuccess={async(result)=>{
        if(result.listing){const ul=result.listing;setListings(p=>p.map(l=>l.id===ul.id?ul:l));closeModal();setTimeout(()=>setModal({type:"detail",listing:ul}),200);notify("🔓 Contact details revealed!","success");return;}
        try{const fresh=await apiCall(`/api/listings/${modal.listing.id}`,{},token);const ul=fresh.listing||fresh;setListings(p=>p.map(l=>l.id===ul.id?ul:l));closeModal();setTimeout(()=>setModal({type:"detail",listing:ul}),200);}catch{closeModal();}
        notify(modal.payType==="unlock"?"🔓 Buyer contact revealed!":"🔐 Escrow activated!","success");
      }}
      onClose={closeModal} notify={notify}/>}
    {toast&&<Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {resetToken&&<ResetPasswordModal token={resetToken} notify={notify} onClose={()=>{setResetToken(null);setModal({type:"auth",mode:"login"});}}/>}
  </>;

  // Desktop layout
  return <>
    {/* NAV */}
    <nav className="nav">
      <div className="logo" onClick={()=>{setPage("home");setFilter({cat:"",q:"",county:"",minPrice:"",maxPrice:"",sort:"newest"});setPg(1);if(typeof window !== 'undefined') window.history.pushState({},"","/");}} style={{color:"#1428A0"}}><WekaSokoLogo size={38}/></div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button className="bgh" style={{color:"#636363",fontSize:13,background:"transparent",border:"none",cursor:"pointer",fontFamily:"var(--fn)",padding:"8px 14px",whiteSpace:"nowrap"}} onClick={()=>{if(page==="sold"){setPage("home");if(typeof window !== 'undefined') window.history.pushState({},"","/");}else{setPage("sold");if(typeof window !== 'undefined') window.history.pushState({},"","/sold");}}}>Sold Items</button>
        {user?<>
          <button style={{background:"transparent",border:"none",color:"#1D1D1D",cursor:"pointer",fontSize:13,fontFamily:"var(--fn)",padding:"8px 14px",position:"relative",whiteSpace:"nowrap"}} onClick={()=>{setPage("dashboard");if(typeof window !== 'undefined') window.history.pushState({},"","/dashboard");}}>
            {user.name?.split(" ")[0]}
            {notifCount>0&&<span className="notif-dot"/>}
          </button>
          <button style={{background:"#1428A0",color:"#FFFFFF",border:"none",padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8,whiteSpace:"nowrap"}} onClick={()=>{
            if(user.role==="buyer"){
              if(typeof window !== 'undefined' && window.confirm("You're currently a Buyer. Switch to Seller to post ads?"))
                apiCall("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token).then(d=>{const upd={...user,...d.user};setUser(upd);localStorage.setItem("ws_user",JSON.stringify(upd));notify("Switched to Seller!","success");setModal({type:"post"});}).catch(e=>notify(e.message,"error"));
              return;
            }
            setModal({type:"post"});
          }}>+ Post Ad</button>
        </>:<>
          <button style={{background:"transparent",color:"#1428A0",border:"1.5px solid #1428A0",padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8,whiteSpace:"nowrap"}} onClick={()=>setModal({type:"auth",mode:"login"})}>Sign In</button>
          <button style={{background:"#1428A0",color:"#FFFFFF",border:"none",padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8,whiteSpace:"nowrap"}} onClick={()=>setModal({type:"auth",mode:"signup"})}>Join Free</button>
        </>}
      </div>
    </nav>

    {/* ── HERO + CATEGORIES side by side ── */}
    {page!=="dashboard"&&page!=="sold"&&<div style={{background:"#FFFFFF",borderBottom:"1px solid #EBEBEB"}}>
      <div style={{display:"flex",alignItems:"stretch",minHeight:460,flexWrap:"wrap"}}>
        {/* LEFT — hero text */}
        <div style={{flex:"1 1 280px",display:"flex",flexDirection:"column",justifyContent:"center",padding:"clamp(32px,4vw,48px) clamp(24px,4vw,48px)",minWidth:280}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"#767676",marginBottom:14}}>Kenya's Smartest Resell Platform</div>
          <h1 style={{fontSize:"clamp(28px,4vw,48px)",fontWeight:700,letterSpacing:"-.03em",color:"#1A1A1A",lineHeight:1.1,marginBottom:16}}>Buy & Sell Safely</h1>
          <p style={{fontSize:15,color:"#636363",lineHeight:1.75,marginBottom:24,maxWidth:420}}>Post free. Pay KSh 250 only when a serious buyer locks in. Chat safely. Build your reputation.</p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {!user?<>
              <button style={{background:"#1428A0",color:"#FFFFFF",border:"none",padding:"11px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8}} onClick={()=>setModal({type:"auth",mode:"signup"})}>Get Started Free</button>
              <button style={{background:"transparent",color:"#1428A0",border:"1.5px solid #1428A0",padding:"10px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8}} onClick={()=>setModal({type:"auth",mode:"login"})}>Sign In</button>
            </>:<button style={{background:"#1428A0",color:"#FFFFFF",border:"none",padding:"11px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8}} onClick={()=>{if(user.role==="buyer"){if(typeof window !== 'undefined' && window.confirm("Switch to Seller to post ads?"))apiCall("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token).then(d=>{const upd={...user,...d.user};setUser(upd);localStorage.setItem("ws_user",JSON.stringify(upd));notify("Switched to Seller!","success");setModal({type:"post"});}).catch(e=>notify(e.message,"error"));return;}setModal({type:"post"});}}>+ Post Your First Ad</button>}
          </div>
        </div>
        {/* RIGHT — categories grid */}
        <div style={{flex:"1 1 280px",display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:1,minWidth:280}}>
          {CATS.slice(0,8).map((c,i)=>(
            <div key={c.name} onClick={()=>{setFilter(f=>({...f,cat:c.name}));setPg(1);}} style={{background:CAT_PHOTOS[c.name]?`url(${CAT_PHOTOS[c.name]}) center/cover`:"#E0E0E0",cursor:"pointer",display:"flex",alignItems:"flex-end",padding:"16px",minHeight:110,position:"relative",overflow:"hidden",transition:"transform .2s"}}>
              <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.3)",transition:"opacity .2s"}}/>
              <div style={{position:"relative",zIndex:1,fontSize:13,fontWeight:700,color:"#fff"}}>{c.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>}

    <main style={{maxWidth:1400,margin:"0 auto",padding:"clamp(24px,4vw,48px) clamp(16px,4vw,40px)"}}>
      {page==="home"&&<>
        {/* FILTERS */}
        <div style={{marginBottom:32}}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
            <input type="text" placeholder="Search listings..." value={filter.q} onChange={e=>{setFilter(f=>({...f,q:e.target.value}));setPg(1);}} style={{flex:"1 1 200px",padding:"10px 14px",fontSize:14,border:"1.5px solid #E0E0E0",borderRadius:8,fontFamily:"var(--fn)",minWidth:150}}/>
            <select value={filter.cat} onChange={e=>{setFilter(f=>({...f,cat:e.target.value}));setPg(1);}} style={{padding:"10px 14px",fontSize:14,border:"1.5px solid #E0E0E0",borderRadius:8,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer"}}>
              <option value="">All Categories</option>
              {CATS.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <select value={filter.county} onChange={e=>{setFilter(f=>({...f,county:e.target.value}));setPg(1);}} style={{padding:"10px 14px",fontSize:14,border:"1.5px solid #E0E0E0",borderRadius:8,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer"}}>
              <option value="">All Counties</option>
              {counties.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filter.sort} onChange={e=>setFilter(f=>({...f,sort:e.target.value}))} style={{padding:"10px 14px",fontSize:14,border:"1.5px solid #E0E0E0",borderRadius:8,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer"}}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="popular">Most Viewed</option>
              <option value="expiring">Expiring Soon</option>
            </select>
            <div style={{display:"flex",gap:2}}>
              <button onClick={()=>setVm("grid")} style={{background:vm==="grid"?"#1428A0":"#fff",color:vm==="grid"?"#fff":"#767676",border:"1.5px solid #E0E0E0",padding:"8px 14px",cursor:"pointer",fontSize:15,fontFamily:"var(--fn)",borderRadius:"8px 0 0 8px",transition:"all .15s"}}>⊞</button>
              <button onClick={()=>setVm("list")} style={{background:vm==="list"?"#1428A0":"#fff",color:vm==="list"?"#fff":"#767676",border:"1.5px solid #E0E0E0",borderLeft:"none",padding:"8px 14px",cursor:"pointer",fontSize:15,fontFamily:"var(--fn)",borderRadius:"0 8px 8px 0",transition:"all .15s"}}>☰</button>
            </div>
            {user&&<button className="btn bp" style={{borderRadius:9,fontSize:14,padding:"9px 20px"}} onClick={()=>{
              if(user.role==="buyer"){
                if(typeof window !== 'undefined' && window.confirm("You're currently a Buyer. Switch to Seller to post ads?"))
                  apiCall("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token).then(d=>{const upd={...user,...d.user};setUser(upd);localStorage.setItem("ws_user",JSON.stringify(upd));notify("Switched to Seller!","success");setModal({type:"post"});}).catch(e=>notify(e.message,"error"));
                return;
              }
              setModal({type:"post"});
            }}>+ Post Ad</button>}
          </div>
        </div>

        {loading?<div style={{textAlign:"center",padding:"80px 0"}}><Spin s="40px"/></div>
          :listings.length===0?<div className="empty"><div style={{fontSize:56,marginBottom:16,opacity:.15}}>🔍</div><h3 style={{fontWeight:700,fontSize:20,marginBottom:8}}>No listings found</h3><p style={{color:"#767676"}}>Try a different search or filter</p></div>
          :<div className={vm==="grid"?"g3":"lvc"}>{listings.map(l=><ListingCard key={l.id} listing={l} onClick={()=>openListing(l)} listView={vm==="list"}/>)}</div>}

        <Pager total={total} perPage={PER_PAGE} page={pg} onChange={p=>{setPg(p);if(typeof window !== 'undefined') window.scrollTo({top:400,behavior:"smooth"});}}/>

      </>}
    </main>

    {/* PLATFORM STATS */}
    <div style={{background:"#1428A0",borderRadius:0,padding:"clamp(28px,4vw,40px) clamp(20px,4vw,48px)",marginBottom:64,margin:"0 clamp(-16px,-4vw,-48px)",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:0,textAlign:"center"}}>
      {[{label:"Active Listings",val:stats.activeAds||0},{label:"Items Sold",val:stats.sold||0},{label:"Registered Users",val:stats.users||0},{label:"Total Views",val:stats.views||0}].map((s,i)=>(
        <div key={s.label} style={{padding:"0 24px",borderRight:i<3?"1px solid rgba(255,255,255,.2)":"none"}}>
          <div style={{fontSize:40,fontWeight:800,color:"#fff",lineHeight:1,fontFamily:"var(--fn)"}}><Counter to={s.val}/></div>
          <div style={{fontSize:14,fontWeight:500,color:"rgba(255,255,255,.7)",marginTop:8,letterSpacing:".02em"}}>{s.label}</div>
        </div>
      ))}
    </div>

    {/* HOW IT WORKS */}
    <div style={{marginTop:80,paddingTop:64,borderTop:"2px solid #CCCCCC"}}>
      <div style={{textAlign:"center",marginBottom:48}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#767676",marginBottom:12}}>How It Works</div>
        <h2 style={{fontSize:"clamp(24px,4vw,40px)",fontWeight:700,letterSpacing:"-.03em",color:"#111111",lineHeight:1.1}}>Simple. Safe.<br/>Built for Kenya.</h2>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:20}}>
        {[["📝","Post for Free","No upfront cost. Photos, description, location — done in 2 minutes."],
          ["💬","Chat Safely","Anonymous, moderated chat. Contact info hidden until unlock."],
          ["🔥","Buyer Locks In","Serious buyers click 'I'm Interested'. You get notified instantly."],
          ["💳","Pay KSh 250","Seller pays once to see buyer contact. Till 5673935. Non-refundable."],
          ["🔐","Safe Escrow","Optional 7.5% escrow. Funds held until you confirm delivery."],
          ["🏆","Deal Done","Leave a review. Build your seller reputation on the platform."]].map(([icon,title,desc])=>(
          <div key={title} style={{background:"#F4F4F4",padding:"28px 24px"}}>
            <div style={{fontSize:28,marginBottom:14}}>{icon}</div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:10,letterSpacing:"-.01em",color:"#1A1A1A"}}>{title}</div>
            <div style={{fontSize:15,color:"#636363",lineHeight:1.75}}>{desc}</div>
          </div>
        ))}
      </div>
    </div>

    {/* MODALS */}
    {modal?.type==="auth"&&<AuthModal defaultMode={modal.mode} onClose={closeModal} onAuth={handleAuth} notify={notify}/>}
    {modal?.type==="post"&&token&&<PostAdModal onClose={closeModal} token={token} notify={notify} linkedRequest={modal.linkedRequest||null} onSuccess={l=>{setListings(p=>[l,...p]);setTotal(t=>t+1);}}/>}
    {modal?.type==="detail"&&<DetailModal
      listing={modal.listing} user={user} token={token} onClose={closeModal} notify={notify}
      onShare={()=>setModal({type:"share",listing:modal.listing})}
      onChat={()=>{if(!user){notify("Sign in to chat","warning");setModal({type:"auth",mode:"login"});return;}setModal({type:"chat",listing:modal.listing});}}
      onLockIn={()=>handleLockIn(modal.listing)}
      onUnlock={()=>setModal({type:"pay",payType:"unlock",listing:modal.listing})}
      onEscrow={()=>{if(!user){notify("Sign in first","warning");setModal({type:"auth",mode:"login"});return;}setModal({type:"pay",payType:"escrow",listing:modal.listing});}}
    />}
    {modal?.type==="chat"&&user&&<ChatModal listing={modal.listing} user={user} token={token} onClose={closeModal} notify={notify}/>}
    {modal?.type==="share"&&<ShareModal listing={modal.listing} onClose={closeModal}/>}
    {modal?.type==="pay"&&user&&<PayModal
      type={modal.payType}
      listingId={modal.listing.id}
      amount={modal.payType==="unlock"?250:modal.listing.price+Math.round(modal.listing.price*0.075)}
      purpose={modal.payType==="unlock"?`Unlock buyer contact: ${modal.listing.title}`:`Escrow for: ${modal.listing.title}`}
      token={token} user={user} allowVoucher={true}
      onSuccess={async(result)=>{
        if(result.listing){
          const updatedListing=result.listing;
          setListings(p=>p.map(l=>l.id===updatedListing.id?updatedListing:l));
          closeModal();
          setTimeout(()=>setModal({type:"detail",listing:updatedListing}),200);
          notify("🔓 Contact details revealed!","success");
          return;
        }
        try{
          const fresh=await apiCall(`/api/listings/${modal.listing.id}`,{},token);
          const updatedListing=fresh.listing||fresh;
          setListings(p=>p.map(l=>l.id===updatedListing.id?updatedListing:l));
          closeModal();
          setTimeout(()=>setModal({type:"detail",listing:updatedListing}),200);
        }catch{closeModal();}
        notify(modal.payType==="unlock"?"🔓 Buyer contact revealed!":"🔐 Escrow activated!","success");
      }}
      onClose={closeModal} notify={notify}
    />}
    {resetToken&&<ResetPasswordModal token={resetToken} notify={notify} onClose={()=>{setResetToken(null);setModal({type:"auth",mode:"login"});}}/>}

    {page==="sold"&&<div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#1D1D1D",padding:"clamp(28px,4vw,52px) clamp(16px,4vw,40px) clamp(28px,4vw,48px)"}}>
        <div>
          <button onClick={()=>setPage("home")} style={{background:"transparent",border:"1px solid rgba(255,255,255,.35)",color:"#fff",padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)",marginBottom:28,display:"inline-flex",alignItems:"center",gap:6,letterSpacing:".02em",borderRadius:8}}>← Back to Marketplace</button>
          <div style={{marginBottom:14,opacity:.9}}><WekaSokoLogo size={26}/></div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(255,255,255,.55)",marginBottom:10}}>Sold Listings</div>
          <h1 style={{fontSize:"clamp(30px,5vw,54px)",fontWeight:700,letterSpacing:"-.03em",color:"#fff",lineHeight:1.05,marginBottom:14}}>Sold on Weka Soko</h1>
          <p style={{fontSize:15,color:"rgba(255,255,255,.7)",maxWidth:500,lineHeight:1.75}}>Real items. Real buyers. Every listing below found a home through Weka Soko.</p>
        </div>
      </div>
      <div style={{padding:"44px 48px 80px"}}>
        <SoldSection token={token} user={user}/>
      </div>
    </div>}
    {user&&!user.is_verified&&page==="home"&&<div style={{position:"sticky",top:60,zIndex:99,padding:"0 16px"}}><VerificationBanner user={user} token={token} notify={notify}/></div>}
    {page==="dashboard"&&user&&<Dashboard user={user} token={token} notify={notify} onPostAd={()=>{setPage("home");if(typeof window !== 'undefined') window.history.pushState({},"","/");setModal({type:"post"});}} onClose={()=>{setPage("home");if(typeof window !== 'undefined') window.history.pushState({},"","/");}} onUserUpdate={updated=>{const m={...user,...updated};setUser(m);localStorage.setItem("ws_user",JSON.stringify(m));}} initialTab={typeof window !== 'undefined' && window.location.pathname.startsWith("/dashboard/")?window.location.pathname.split("/dashboard/")[1]:undefined}/>}
    {toast&&<Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {showPWA&&typeof window !== 'undefined' && !localStorage.getItem("pwa-dismissed")&&<PWABanner onDismiss={()=>{setShowPWA(false);localStorage.setItem("pwa-dismissed","1");}}/>}
  </>;
}
