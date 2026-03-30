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
  // counties loaded server-side via initialCounties prop
  const [pg,setPg]=useState(initialPage||1);
  const [vm,setVm]=useState("grid");
  const [toast,setToast]=useState(null);
  const [modal,setModal]=useState(null);
  const [showPWA,setShowPWA]=useState(true);
  const [notifCount,setNotifCount]=useState(0);
  const socketRef=useRef(null);

  const notify=useCallback((msg,type="info")=>setToast({msg,type,id:Date.now()}),[]);
  // Detect mobile vs desktop
  const [isMobile,setIsMobile]=useState(()=>window.innerWidth<768);
  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener('resize',check);
    return()=>window.removeEventListener('resize',check);
  },[]);
  const [mobileFiltersOpen,setMobileFiltersOpen]=useState(false);
  const [mobileTab,setMobileTab]=useState('home'); // home|search|post|dashboard|more
  const closeModal=useCallback(()=>{
    setModal(null);
    // If we were on a listing URL, go back to the listing grid
    if(window.location.search.includes('listing=')){
      window.history.pushState({},'','/');
    }
  },[]);

  // ── URL ROUTER ────────────────────────────────────────────────────────────
  // Parses URL → state on mount, pushes URL → on state changes.
  // URL scheme:
  //   /                        → home
  //   /?cat=Electronics        → home filtered by category
  //   /?q=iphone               → home with search
  //   /?listing=[id]           → open listing detail
  //   /sold                    → sold items page
  //   /dashboard               → dashboard overview
  //   /dashboard/[tab]         → dashboard specific tab
  //   /requests                → requests tab (mobile)

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
        // Will be picked up by Dashboard via initialTab prop
        window.__initialDashTab = sub;
      }
    } else if (section === 'requests') {
      setPage('home');
      setMobileTab('requests');
    } else {
      // Home — apply any filters from query params
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
      // Listing detail via ?listing=[id]
      const listingId = params.get('listing');
      if (listingId) {
        apiCall(`/api/listings/${listingId}`, {}, null).then(l => {
          if (l && l.id) setModal({ type: 'detail', listing: l });
        }).catch(() => {});
      }
    }
  }, []); // eslint-disable-line

  // Parse URL on first mount
  useEffect(() => {
    parseAndApplyURL(window.location.pathname, window.location.search);
  }, []); // eslint-disable-line

  // Handle browser back/forward
  useEffect(() => {
    const onPop = () => parseAndApplyURL(window.location.pathname, window.location.search);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [parseAndApplyURL]);

  // Push URL when page changes
  const navTo = useCallback((path, replaceState = false) => {
    const method = replaceState ? 'replaceState' : 'pushState';
    if (window.location.pathname + window.location.search !== path) {
      window.history[method]({}, '', path);
    }
  }, []);

  // Sync page → URL
  useEffect(() => {
    if (page === 'sold') navTo('/sold');
    else if (page === 'dashboard') navTo('/dashboard');
    else if (page === 'home' && mobileTab === 'requests') navTo('/requests');
    // home page URL is updated by the filter/pg effect below
  }, [page, mobileTab, navTo]); // eslint-disable-line

  // Sync home filters → URL
  useEffect(() => {
    if (page !== 'home' || mobileTab === 'requests') return;
    const p = new URLSearchParams();
    if (filter.cat) p.set('cat', filter.cat);
    if (filter.q) p.set('q', filter.q);
    if (filter.county) p.set('county', filter.county);
    if (filter.sort && filter.sort !== 'newest') p.set('sort', filter.sort);
    if (pg > 1) p.set('pg', String(pg));
    const qs = p.toString();
    navTo(qs ? `/listings?${qs}` : '/');
  }, [page, filter, pg, mobileTab, navTo]); // eslint-disable-line

  // ── END URL ROUTER ─────────────────────────────────────────────────────────


  // CSS and viewport loaded via Next.js layout.jsx

  // Handle Google OAuth callback + password reset token
  const [resetToken,setResetToken]=useState(null);
  useEffect(()=>{
    // Check both query params and hash (some redirects vary)
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
        // Verify the token is valid immediately
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
          // Auto-login the user after verification
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
  },[]);

  // Session restore
  useEffect(()=>{
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
    // Silent background refresh every 60s
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
      // Handle warning/suspension notifications prominently
      if(n.type==="listing_match"){
        // A seller has an item matching a buyer's request — or buyer has a match
        notify(n.body||n.title,"info");
        setNotifCount(c=>c+1);
        return;
      }
      if(n.type==="request_match"){
        // A new listing matches a buyer's open request
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
        // Re-fetch user to get current suspended status
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
    // New message arrived while chat modal is closed - update unread count
    s.on("new_message_inbox",(msg)=>{
      setNotifCount(c=>c+1);
    });
    return()=>s.disconnect();
  },[token,user]);

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
    // Only run once per session — skip if already subscribed
    if(!("serviceWorker" in navigator)||!("PushManager" in window))return;
    if(Notification.permission==="denied")return;

    const subscribe=async()=>{
      try{
        // Get VAPID public key from backend
        const {key} = await apiCall("/api/push/vapid-public-key");
        const reg = await navigator.serviceWorker.ready;

        // Check if already subscribed
        const existing = await reg.pushManager.getSubscription();
        if(existing){
          // Re-send to backend in case it was lost
          await apiCall("/api/push/subscribe",{method:"POST",body:JSON.stringify({subscription:existing})},token).catch(()=>{});
          return;
        }

        // Request permission if not already granted
        if(Notification.permission==="default"){
          const perm = await Notification.requestPermission();
          if(perm!=="granted")return;
        }

        // Subscribe
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:urlBase64ToUint8Array(key)
        });
        await apiCall("/api/push/subscribe",{method:"POST",body:JSON.stringify({subscription:sub})},token);
      }catch(e){console.warn("[Push] subscribe:",e.message);}
    };

    // Small delay so the page loads first before the permission prompt
    const t = setTimeout(subscribe, 3000);
    return ()=>clearTimeout(t);
  },[token,user]);

  const handleAuth=(u,t)=>{setUser(u);setToken(t);setNotifCount(0);};
  const logout=()=>{setUser(null);setToken(null);setNotifCount(0);localStorage.removeItem("ws_token");localStorage.removeItem("ws_user");notify("Signed out.","info");};

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
    setModal({type:"detail",listing:l}); // show immediately with what we have
    // Push listing URL so refresh/share restores the detail view
    window.history.pushState({},'',`/?listing=${l.id}`);
    try{
      const fresh=await apiCall(`/api/listings/${l.id}`,{},token);
      setModal({type:"detail",listing:fresh});
    }catch(e){/* keep showing cached version */}
  };

  // Mobile layout — completely separate, Jiji-style
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
    {/* Modals still render on mobile */}
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

  // Desktop layout — full design
  return <>
    {/* NAV */}
    <nav className="nav">
      <div className="logo" onClick={()=>{setPage("home");setFilter({cat:"",q:"",county:"",minPrice:"",maxPrice:"",sort:"newest"});setPg(1);window.history.pushState({},"","/");}} style={{color:"#1428A0"}}><WekaSokoLogo size={38}/></div>
      {/* Desktop nav */}
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button className="bgh" style={{color:"#636363",fontSize:13,background:"transparent",border:"none",cursor:"pointer",fontFamily:"var(--fn)",padding:"8px 14px",whiteSpace:"nowrap"}} onClick={()=>{if(page==="sold"){setPage("home");window.history.pushState({},"","/");}else{setPage("sold");window.history.pushState({},"","/sold");}}}>Sold Items</button>
        {user?<>
          <button style={{background:"transparent",border:"none",color:"#1D1D1D",cursor:"pointer",fontSize:13,fontFamily:"var(--fn)",padding:"8px 14px",position:"relative",whiteSpace:"nowrap"}} onClick={()=>{setPage("dashboard");window.history.pushState({},"","/dashboard");}}>
            {user.name?.split(" ")[0]}
            {notifCount>0&&<span className="notif-dot"/>}
          </button>
          <button style={{background:"#1428A0",color:"#FFFFFF",border:"none",padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8,whiteSpace:"nowrap"}} onClick={()=>{
            if(user.role==="buyer"){
              if(window.confirm("You're currently a Buyer. Switch to Seller to post ads?"))
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
        <div style={{flex:"1 1 380px",minWidth:0,padding:"clamp(28px,5vw,60px) clamp(20px,5vw,56px)",display:"flex",flexDirection:"column",justifyContent:"center",borderRight:"1px solid #EBEBEB",background:"#fff"}}>
          <div style={{fontSize:13,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",marginBottom:18,color:"#1428A0"}}>
            🇰🇪 Kenya's Resell Platform
          </div>
          <h1 style={{fontSize:"clamp(32px,3.5vw,50px)",fontWeight:800,letterSpacing:"-.02em",lineHeight:1.12,marginBottom:20,color:"#1A1A1A",fontFamily:"var(--fn)"}}>
            Post Free.<br/>
            <span style={{color:"#1428A0"}}>Pay Only When</span><br/>
            You Get a Buyer.
          </h1>
          <p style={{fontSize:17,color:"#636363",lineHeight:1.8,marginBottom:34,fontWeight:400}}>
            List items in minutes with photos. Pay KSh 250 only when a serious buyer locks in to buy.
          </p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}}>
            <button style={{background:"#1428A0",color:"#fff",border:"none",padding:"16px 34px",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:10,transition:"background .15s",boxShadow:"0 4px 14px rgba(20,40,160,.25)"}}
              onMouseOver={e=>e.currentTarget.style.background="#0F1F8A"} onMouseOut={e=>e.currentTarget.style.background="#1428A0"}
              onClick={()=>{
                if(!user){setModal({type:"auth",mode:"signup"});return;}
                if(user.role==="buyer"){
                  if(window.confirm("You're currently a Buyer. To post an ad, switch to a Seller account.\n\nSwitch to Seller now?")){
                    apiCall("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token).then(d=>{
                      const upd={...user,...d.user};setUser(upd);localStorage.setItem("ws_user",JSON.stringify(upd));
                      notify("Switched to Seller! Now post your ad.","success");setModal({type:"post"});
                    }).catch(e=>notify(e.message,"error"));
                  }
                  return;
                }
                setModal({type:"post"});
              }}>+ Post an Ad for Free</button>
            <button style={{background:"#fff",color:"#1A1A1A",border:"1.5px solid #D0D0D0",padding:"16px 30px",fontSize:16,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:10,transition:"all .15s"}}
              onMouseOver={e=>{e.currentTarget.style.borderColor="#1428A0";e.currentTarget.style.color="#1428A0";}} onMouseOut={e=>{e.currentTarget.style.borderColor="#D0D0D0";e.currentTarget.style.color="#1A1A1A";}}
              onClick={()=>document.getElementById("listings-section")?.scrollIntoView({behavior:"smooth"})}>Browse Listings</button>
          </div>
          <div style={{display:"flex",gap:22,fontSize:14,color:"#888",fontWeight:500,flexWrap:"wrap"}}>
            <span style={{display:"flex",alignItems:"center",gap:7}}><span style={{color:"#1428A0",fontWeight:800,fontSize:16}}>✓</span>Free to post</span>
            <span style={{display:"flex",alignItems:"center",gap:7}}><span style={{color:"#1428A0",fontWeight:800,fontSize:16}}>✓</span>Anonymous chat</span>
            <span style={{display:"flex",alignItems:"center",gap:7}}><span style={{color:"#1428A0",fontWeight:800,fontSize:16}}>✓</span>M-Pesa escrow</span>
          </div>
        </div>

        {/* RIGHT — OLX-style categories with real images */}
        <div style={{flex:"1 1 320px",minWidth:0,padding:"clamp(24px,4vw,40px) clamp(16px,4vw,48px) 32px",background:"#FAFAFA"}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:6}}>Browse by Category</div>
          <h2 style={{fontSize:22,fontWeight:700,color:"#1A1A1A",marginBottom:24,letterSpacing:"-.01em",fontFamily:"var(--fn)"}}>What are you looking for?</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(72px,1fr))",gap:8}}>
            {CATS.map(c=>{
              const photoMap={
                Electronics:"https://images.unsplash.com/photo-1498049794561-7780e7231661?w=140&h=140&fit=crop&crop=center",
                Vehicles:"https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=140&h=140&fit=crop&crop=center",
                Property:"https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=140&h=140&fit=crop&crop=center",
                Fashion:"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=140&h=140&fit=crop&crop=center",
                Furniture:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=140&h=140&fit=crop&crop=center",
                "Home & Garden":"https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=140&h=140&fit=crop&crop=center",
                Sports:"https://images.unsplash.com/photo-1517649763962-0c623066013b?w=140&h=140&fit=crop&crop=center",
                "Baby & Kids":"https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=140&h=140&fit=crop&crop=center",
                Books:"https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=140&h=140&fit=crop&crop=center",
                Agriculture:"https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=140&h=140&fit=crop&crop=center",
                Services:"https://images.unsplash.com/photo-1504148455328-c376907d081c?w=140&h=140&fit=crop&crop=center",
                Jobs:"https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=140&h=140&fit=crop&crop=center",
                Food:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=140&h=140&fit=crop&crop=center",
                "Health & Beauty":"https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=140&h=140&fit=crop&crop=center",
                Pets:"https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=140&h=140&fit=crop&crop=center",
                Other:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=140&h=140&fit=crop&crop=center",
              };
              const photo=photoMap[c.name]||photoMap.Other;
              const active=filter.cat===c.name;
              return <div key={c.name}
                onClick={()=>{setFilter(p=>({...p,cat:p.cat===c.name?"":c.name}));setPg(1);setTimeout(()=>document.getElementById("listings-section")?.scrollIntoView({behavior:"smooth"}),100);}}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"12px 4px",cursor:"pointer",borderRadius:14,background:active?"#EEF2FF":"#fff",border:`1.5px solid ${active?"#1428A0":"#EBEBEB"}`,transition:"all .15s",boxShadow:active?"0 0 0 2px rgba(20,40,160,.1)":"none"}}>
                <div style={{width:62,height:62,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:`2.5px solid ${active?"#1428A0":"#E5E5E5"}`,boxShadow:"0 2px 8px rgba(0,0,0,.1)"}}>
                  <img src={photo} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                </div>
                <div style={{fontSize:11,fontWeight:600,color:active?"#1428A0":"#333",textAlign:"center",lineHeight:1.3,wordBreak:"break-word"}}>{c.name}</div>
              </div>;
            })}
          </div>
        </div>
      </div>

      {/* Trust bar */}
      <div style={{background:"#1428A0",padding:"12px 20px",display:"flex",gap:20,alignItems:"center",justifyContent:"center",flexWrap:"wrap"}}>
        {["Free to list","Safe anonymous chat","M-Pesa escrow","Kenyan platform"].map(t=>(
          <span key={t} style={{fontSize:14,fontWeight:600,color:"rgba(255,255,255,.92)",display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:"#fff",fontSize:16,fontWeight:800}}>✓</span>{t}
          </span>
        ))}
      </div>
    </div>}

    {page!=="dashboard"&&page!=="sold"&&<main style={{padding:"clamp(20px,4vw,40px) clamp(16px,4vw,48px) 80px"}}>
      {/* ── TWO-COLUMN LAYOUT: sidebar left, content right ── */}
      <div style={{display:"flex",gap:24,alignItems:"flex-start",flexWrap:"wrap",flexDirection:window.innerWidth<768?"column":"row"}}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{width:"min(240px,100%)",flexShrink:0,display:"flex",flexDirection:"column",gap:14,order:window.innerWidth<768?1:0}}>

          {/* Search */}
          <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"20px 18px"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:12}}>Search</div>
            <input style={{width:"100%",padding:"11px 14px",border:"1.5px solid #E0E0E0",borderRadius:10,outline:"none",fontSize:14,fontFamily:"var(--fn)",color:"#1A1A1A",background:"#FAFAFA"}} placeholder="Search listings..." value={filter.q} onChange={e=>{setFilter(p=>({...p,q:e.target.value}));setPg(1);}}/>
          </div>

          {/* Price range */}
          <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"20px 18px"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:12}}>Price Range (KSh)</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input className="inp" style={{borderRadius:8,fontSize:14}} placeholder="Min price" type="number" value={filter.minPrice} onChange={e=>{setFilter(p=>({...p,minPrice:e.target.value}));setPg(1);}}/>
              <input className="inp" style={{borderRadius:8,fontSize:14}} placeholder="Max price" type="number" value={filter.maxPrice} onChange={e=>{setFilter(p=>({...p,maxPrice:e.target.value}));setPg(1);}}/>
            </div>
          </div>

          {/* County */}
          <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"20px 18px"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:12}}>Location</div>
            <select className="inp" style={{borderRadius:8,fontSize:14}} value={filter.county} onChange={e=>{setFilter(p=>({...p,county:e.target.value}));setPg(1);}}>
              <option value="">All Counties</option>
              {counties.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Clear filters */}
          {(filter.cat||filter.county||filter.minPrice||filter.maxPrice||filter.q)&&
            <button className="btn bs" style={{width:"100%",borderRadius:10,fontSize:14}} onClick={()=>{setFilter({cat:"",q:"",county:"",minPrice:"",maxPrice:"",sort:"newest"});setPg(1);}}>✕ Clear All Filters</button>}

          {/* What Buyers Want — in sidebar */}
          <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"20px 18px"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:4}}>Community</div>
            <div style={{fontSize:16,fontWeight:700,color:"#1A1A1A",marginBottom:12}}>🛒 Buyers Want</div>
            <WhatBuyersWant user={user} token={token} notify={notify} onSignIn={()=>setModal({type:"auth",mode:"login"})}
              compact={true}
              onIHaveThis={(request,action)=>{
                if(action==="switch_to_seller"){
                  apiCall("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token)
                    .then(d=>{const u={...user,...d.user};setUser(u);localStorage.setItem("ws_user",JSON.stringify(u));
                      notify("Switched to Seller! Now post your ad.","success");
                      setModal({type:"post",linkedRequest:request});
                    }).catch(e=>notify(e.message,"error"));
                  return;
                }
                // Seller → PostAd pre-filled
                setModal({type:"post",linkedRequest:request});
              }}/>
          </div>

        </div>

        {/* ── RIGHT: main content ── */}
        <div style={{flex:1,minWidth:0}} id="listings-section">

          {/* Top bar: sort + view toggle + post ad */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:20,flexWrap:"wrap"}}>
            <h2 style={{fontSize:22,fontWeight:700,letterSpacing:"-.02em",color:"#1A1A1A"}}>
              {filter.cat||"All Listings"} <span style={{fontWeight:400,fontSize:15,color:"#AAAAAA"}}>{total} items</span>
            </h2>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <select style={{padding:"9px 14px",border:"1.5px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:14,fontFamily:"var(--fn)",background:"#fff",color:"#444",cursor:"pointer"}} value={filter.sort} onChange={e=>{setFilter(p=>({...p,sort:e.target.value}));setPg(1);}}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
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
                  if(window.confirm("You're currently a Buyer. Switch to Seller to post ads?"))
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

          <Pager total={total} perPage={PER_PAGE} page={pg} onChange={p=>{setPg(p);window.scrollTo({top:400,behavior:"smooth"});}}/>

        </div>
      </div>{/* end two-column */}

      {/* PLATFORM STATS — bottom strip */}
      <div style={{background:"#1428A0",borderRadius:0,padding:"clamp(28px,4vw,40px) clamp(20px,4vw,48px)",marginBottom:64,margin:"0 clamp(-16px,-4vw,-48px)",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:0,textAlign:"center"}}>
        {[{label:"Active Listings",val:stats.activeAds||0},{label:"Items Sold",val:stats.sold||0},{label:"Registered Users",val:stats.users||0},{label:"Total Views",val:stats.views||0}].map((s,i)=>(
          <div key={s.label} style={{padding:"0 24px",borderRight:i<3?"1px solid rgba(255,255,255,.2)":"none"}}>
            <div style={{fontSize:40,fontWeight:800,color:"#fff",lineHeight:1,fontFamily:"var(--fn)"}}><Counter to={s.val}/></div>
            <div style={{fontSize:14,fontWeight:500,color:"rgba(255,255,255,.7)",marginTop:8,letterSpacing:".02em"}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* HOW IT WORKS — Samsung Learn section style */}
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

    </main>}

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
        // If free/voucher unlock, result.listing already has contact info
        if(result.listing){
          const updatedListing=result.listing;
          setListings(p=>p.map(l=>l.id===updatedListing.id?updatedListing:l));
          closeModal();
          setTimeout(()=>setModal({type:"detail",listing:updatedListing}),200);
          notify("🔓 Contact details revealed!","success");
          return;
        }
        // Paid unlock — reload from API to get fresh contact info
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
      {/* Hero banner */}
      <div style={{background:"#1D1D1D",padding:"clamp(28px,4vw,52px) clamp(16px,4vw,40px) clamp(28px,4vw,48px)"}}>
        <div>
          <button onClick={()=>setPage("home")} style={{background:"transparent",border:"1px solid rgba(255,255,255,.35)",color:"#fff",padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)",marginBottom:28,display:"inline-flex",alignItems:"center",gap:6,letterSpacing:".02em",borderRadius:8}}>← Back to Marketplace</button>
          <div style={{marginBottom:14,opacity:.9}}><WekaSokoLogo size={26}/></div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(255,255,255,.55)",marginBottom:10}}>Sold Listings</div>
          <h1 style={{fontSize:"clamp(30px,5vw,54px)",fontWeight:700,letterSpacing:"-.03em",color:"#fff",lineHeight:1.05,marginBottom:14}}>Sold on Weka Soko</h1>
          <p style={{fontSize:15,color:"rgba(255,255,255,.7)",maxWidth:500,lineHeight:1.75}}>Real items. Real buyers. Every listing below found a home through Weka Soko.</p>
        </div>
      </div>
      {/* Content */}
      <div style={{padding:"44px 48px 80px"}}>
        <SoldSection token={token} user={user}/>
      </div>
    </div>}
    {user&&!user.is_verified&&page==="home"&&<div style={{position:"sticky",top:60,zIndex:99,padding:"0 16px"}}><VerificationBanner user={user} token={token} notify={notify}/></div>}
    {page==="dashboard"&&user&&<Dashboard user={user} token={token} notify={notify} onPostAd={()=>{setPage("home");window.history.pushState({},"","/");setModal({type:"post"});}} onClose={()=>{setPage("home");window.history.pushState({},"","/");}} onUserUpdate={updated=>{const m={...user,...updated};setUser(m);localStorage.setItem("ws_user",JSON.stringify(m));}} initialTab={window.location.pathname.startsWith("/dashboard/")?window.location.pathname.split("/dashboard/")[1]:undefined}/>}
    {toast&&<Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {showPWA&&!localStorage.getItem("pwa-dismissed")&&<PWABanner onDismiss={()=>{setShowPWA(false);localStorage.setItem("pwa-dismissed","1");}}/>}
  </>;
}
