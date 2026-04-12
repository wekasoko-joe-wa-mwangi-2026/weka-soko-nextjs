'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { apiCall, fmtKES, ago, CATS, KENYA_COUNTIES, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';
import { Ic, urlBase64ToUint8Array, WekaSokoLogo, Spin, Toast, Modal, FF, Counter, ImageUploader, TermsModal, PasswordField, ForgotPasswordPanel, ResetPasswordModal, WatermarkedImage, Lightbox, AuthModal, ShareModal, PayModal, ChatModal, PostAdModal, ListingCard, ListingCardSkeleton, HeroSkeleton, LeaveReviewBtn, ReportListingBtn, VerificationBanner, DetailModal, MarkSoldModal, RoleSwitcher, PostRequestModal, WhatBuyersWant, SoldSection, StarPicker, ReviewsSection, MyRequestsTab, PitchesTab, ProfileSection, PasswordSection, VerificationSection, MobileDashboard, Dashboard, PWABanner, Pager, MobileRequestsTab, MobileLayout, BuyersWantPage, AllListingsPage, SoldPage, HotRightNow, SwipeFeed } from '@/components/all';


export default function HomeClient({ initialListings, initialTotal, initialStats, initialCounties, initialFilter, initialPage }) {
  const [user,setUser]=useState(null);
  const [token,setToken]=useState(null);
  const [page,setPage]=useState("home");
  const [listings,setListings]=useState(initialListings||[]);
  const [total,setTotal]=useState(initialTotal||0);
  const [loading,setLoading]=useState(true);
  const [stats,setStats]=useState(initialStats||{users:0,activeAds:0,sold:0,revenue:0});
  const [filter,setFilter]=useState(initialFilter||{cat:"",subcat:"",q:"",county:"",minPrice:"",maxPrice:"",sort:"newest"});
  const [searchInput,setSearchInput]=useState("");
  const [counties,setCounties]=useState(initialCounties||[]);
  const [pg,setPg]=useState(initialPage||1);
  const [vm,setVm]=useState("grid");
  const [toast,setToast]=useState(null);
  const [modal,setModal]=useState(null);
  const [showPWA,setShowPWA]=useState(true);
  const [maintenanceMsg,setMaintenanceMsg]=useState(null);
  const [notifCount,setNotifCount]=useState(0);
  const socketRef=useRef(null);
  const [resetToken,setResetToken]=useState(null);
  const [savedIds,setSavedIds]=useState(new Set());
  const [newSinceLastVisit,setNewSinceLastVisit]=useState(0);
  const [feedContext,setFeedContext]=useState(null);
  const [heroIdx, setHeroIdx] = useState(0);

  // Auto-slide hero
  useEffect(() => {
    const iv = setInterval(() => setHeroIdx(i => (i + 1) % 3), 6000);
    return () => clearInterval(iv);
  }, []);


  const notify=useCallback((msg,type="info")=>setToast({msg,type,id:Date.now()}),[]);

  // <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg> FIX: Initialize isMobile as false, set on client-side only
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

  // ── Register service worker (enables PWA install + push notifications) ──────
  useEffect(()=>{
    if(typeof window==="undefined"||!("serviceWorker" in navigator))return;
    navigator.serviceWorker.register("/sw.js").catch(err=>console.warn("[SW] registration failed:",err));
  },[]);

  // ── Global ripple effect on all .btn clicks ────────────────────────────────
  useEffect(()=>{
    const handler=(e)=>{
      const btn=e.target.closest(".btn");
      if(!btn)return;
      const rect=btn.getBoundingClientRect();
      const size=Math.max(rect.width,rect.height)*2;
      const x=e.clientX-rect.left-size/2;
      const y=e.clientY-rect.top-size/2;
      const rpl=document.createElement("span");
      rpl.className="rpl";
      rpl.style.cssText=`width:${size}px;height:${size}px;left:${x}px;top:${y}px;position:absolute;border-radius:50%;pointer-events:none;`;
      btn.appendChild(rpl);
      setTimeout(()=>rpl.remove(),600);
    };
    document.addEventListener("click",handler);
    return()=>document.removeEventListener("click",handler);
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
        notify("Welcome back, "+parsed.name.split(" ")[0]+"!","success");
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
          notify("Email verified! Welcome to Weka Soko.","success");
        } else {
          notify("Email verified! You can now sign in.","success");
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
    } else if (section === 'listings') {
      setPage('listings');
    } else if (section === 'dashboard') {
      setPage('dashboard');
      if (sub) {
        if(typeof window !== 'undefined') window.__initialDashTab = sub;
      }
    } else if (section === 'requests') {
      setPage('requests');
    } else if (params.get('tab') === 'requests') {
      setPage('home');
      setMobileTab('requests');
    } else {
      setPage('home');
      const cat = params.get('cat') || '';
      const subcat = params.get('subcat') || '';
      const q = params.get('q') || '';
      const county = params.get('county') || '';
      const sort = params.get('sort') || 'newest';
      const pg_val = parseInt(params.get('pg') || '1');
      if (cat || subcat || q || county || sort !== 'newest' || pg_val > 1) {
        setFilter(f => ({ ...f, cat, subcat, q, county, sort }));
        if (pg_val > 1) setPg(pg_val);
      }
      const listingId = params.get('listing');
      if (listingId) {
        apiCall(`/api/listings/${listingId}`, {}, null).then(l => {
          if (l && l.id) {
            if (window.innerWidth < 768) {
              setFeedContext({ items: [l], index: 0 });
            } else {
              setModal({ type: 'detail', listing: l });
            }
          }
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
    else if (page === 'listings') navTo('/listings');
    else if (page === 'dashboard') navTo('/dashboard');
    else if (page === 'requests') navTo('/requests');
    else if (page === 'home' && mobileTab === 'requests') navTo('/?tab=requests');
  }, [page, mobileTab, navTo]);

  useEffect(() => {
    if (page !== 'home' || mobileTab === 'requests' || page === 'listings') return;
    // Don't overwrite URL if auth/reset tokens are present
    if (typeof window !== 'undefined') {
      const _s = window.location.search;
      if (_s.includes('reset_token=') || _s.includes('auth_token=') || _s.includes('verify_email=') || _s.includes('listing=')) return;
    }
    const p = new URLSearchParams();
    if (filter.cat) p.set('cat', filter.cat);
    if (filter.subcat) p.set('subcat', filter.subcat);
    if (filter.q) p.set('q', filter.q);
    if (filter.county) p.set('county', filter.county);
    if (filter.sort && filter.sort !== 'newest') p.set('sort', filter.sort);
    const qs = p.toString();
    navTo(qs ? `/?${qs}` : '/');
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

  // Saved IDs — fetch when user logs in
  useEffect(()=>{
    if(!token)return;
    apiCall("/api/listings/buyer/saved/ids",{},token).then(ids=>{
      if(Array.isArray(ids))setSavedIds(new Set(ids));
    }).catch(()=>{});
  },[token]);

  // New since last visit — localStorage tracking
  useEffect(()=>{
    if(typeof window==="undefined")return;
    const last=localStorage.getItem("ws_last_visit");
    const now=Date.now();
    if(last){
      const hoursSince=(now-parseInt(last))/3600000;
      if(hoursSince>0.5){
        const estimated=Math.round(hoursSince*2.5);
        if(estimated>0)setNewSinceLastVisit(Math.min(estimated,999));
      }
    }
    localStorage.setItem("ws_last_visit",String(now));
  },[]);

  const handleToggleSave=useCallback(async(listing)=>{
    if(!user||!token){setModal({type:"auth",mode:"login"});return;}
    const newSaved=!savedIds.has(listing.id);
    setSavedIds(prev=>{const s=new Set(prev);newSaved?s.add(listing.id):s.delete(listing.id);return s;});
    try{
      await apiCall(`/api/listings/${listing.id}/save`,{method:"POST"},token);
    }catch{
      setSavedIds(prev=>{const s=new Set(prev);newSaved?s.delete(listing.id):s.add(listing.id);return s;});
    }
    notify(newSaved?"Saved!":"Removed from saved","success");
  },[user,token,savedIds,notify]);

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
        const p=new URLSearchParams({page:1,limit:48,sort:filter.sort||"newest"});
        if(filter.cat)p.set("category",filter.cat);
        if(filter.subcat)p.set("subcat",filter.subcat);
        if(filter.q)p.set("search",filter.q);
        if(filter.county)p.set("county",filter.county);
        if(filter.minPrice)p.set("minPrice",filter.minPrice);
        if(filter.maxPrice)p.set("maxPrice",filter.maxPrice);
        const data=await apiCall(`/api/listings?${p}`);
        setListings(data.listings||[]);
        setTotal(data.total||0);
        setMaintenanceMsg(null);
      }catch(e){
        if(e.maintenance){setMaintenanceMsg(e.maintenance);if(!silent)setListings([]);}
        else if(!silent)setListings([]);
      }
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
        notify("Your ad is now live on Weka Soko! "+(n.body||""),"success");
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
            notify("Your account has been suspended. You will be logged out.","error");
            setTimeout(()=>{
              localStorage.removeItem("ws_token");localStorage.removeItem("ws_user");
              setUser(null);setToken(null);
              notify("Account suspended. Contact support@wekasoko.co.ke","error");
            },3000);
          }
        }).catch(()=>{});
      } else if(n.type==="admin_edit"){
        notify("Admin has updated your listing: "+(n.body||""),"info");
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

  const handleAuth=(u,t)=>{setUser(u);setToken(t);setNotifCount(0);setPage("dashboard");if(typeof window !== 'undefined') window.history.pushState({},"","/dashboard");};
  const logout=()=>{setUser(null);setToken(null);setNotifCount(0);if(typeof window !== 'undefined') localStorage.removeItem("ws_token");if(typeof window !== 'undefined') localStorage.removeItem("ws_user");notify("Signed out.","info");};

  const handleLockIn=async listing=>{
    if(!user){setModal({type:"auth",mode:"login"});return;}
    try{
      await apiCall(`/api/listings/${listing.id}/lock-in`,{method:"POST"},token);
      setListings(p=>p.map(l=>l.id===listing.id?{...l,locked_buyer_id:user.id,interest_count:(l.interest_count||0)+1}:l));
      setModal({type:"detail",listing:{...listing,locked_buyer_id:user.id}});
      notify("Locked in! The seller has been notified.","success");
    }catch(err){notify(err.message,"error");}
  };

  const openListing=async l=>{
    if (isMobile) {
      const idx = listings.findIndex(x => x.id === l.id);
      setFeedContext({ items: idx >= 0 ? listings : [l], index: Math.max(0, idx) });
      return;
    }
    setModal({type:"detail",listing:l});
    if(typeof window !== 'undefined') window.history.pushState({},'',`/listings/${l.id}`);
    try{
      const fresh=await apiCall(`/api/listings/${l.id}`,{},token);
      setModal({type:"detail",listing:fresh});
    }catch(e){/* keep showing cached version */}
  };

  // Mobile layout
  if(isMobile&&page!=="sold"&&page!=="listings"){
    // Mobile dashboard — show Dashboard directly (it renders MobileDashboard internally), no desktop nav
    if(page==="dashboard"&&user) return <>
      <Dashboard user={user} token={token} notify={notify}
        onPostAd={()=>{setPage("home");if(typeof window !== 'undefined') window.history.pushState({},"","/");setModal({type:"post"});}}
        onClose={()=>{setPage("home");setMobileTab("home");if(typeof window !== 'undefined') window.history.pushState({},"","/");}}
        onUserUpdate={updated=>{const m={...user,...updated};setUser(m);localStorage.setItem("ws_user",JSON.stringify(m));}}
        initialTab={typeof window !== 'undefined' && window.location.pathname.startsWith("/dashboard/")?window.location.pathname.split("/dashboard/")[1]:undefined}
      />
      {toast&&<Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      {resetToken&&<ResetPasswordModal token={resetToken} notify={notify} onClose={()=>{setResetToken(null);}}/>}
    </>;
    // Mobile full buyers-want page
    if(page==="requests") return <>
      <BuyersWantPage user={user} token={token} notify={notify}
        onBack={()=>{setPage("home");setMobileTab("home");if(typeof window!=='undefined')window.history.pushState({},"","/");}}
        onIHaveThis={(request,action)=>{
          if(!user){setModal({type:"auth",mode:"login"});return;}
          if(action==="switch_to_seller"){
            if(typeof window!=='undefined'&&window.confirm("You're currently a Buyer. Switch to Seller to post ads?"))
              apiCall("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token)
                .then(d=>{const u={...user,...d.user};setUser(u);localStorage.setItem("ws_user",JSON.stringify(u));notify("Switched to Seller! Now post your ad.","success");setModal({type:"post",linkedRequest:request});})
                .catch(e=>notify(e.message,"error"));
            return;
          }
          setModal({type:"post",linkedRequest:request});
        }}
        onSignIn={()=>setModal({type:"auth",mode:"login"})}
      />
      {modal?.type==="auth"&&<AuthModal defaultMode={modal.mode} onClose={closeModal} onAuth={handleAuth} notify={notify}/>}
      {modal?.type==="post"&&token&&<PostAdModal onClose={closeModal} token={token} notify={notify} linkedRequest={modal.linkedRequest||null} onSuccess={l=>{setListings(p=>[l,...p]);setTotal(t=>t+1);}}/>}
      {toast&&<Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      {resetToken&&<ResetPasswordModal token={resetToken} notify={notify} onClose={()=>{setResetToken(null);}}/>}
    </>;
    // Mobile home/requests/search
    return <>
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
        savedIds={savedIds} onToggleSave={handleToggleSave}
        newSinceLastVisit={newSinceLastVisit}
      />
      {modal?.type==="auth"&&<AuthModal defaultMode={modal.mode} onClose={closeModal} onAuth={handleAuth} notify={notify}/>}
      {modal?.type==="post"&&token&&<PostAdModal onClose={closeModal} token={token} notify={notify} linkedRequest={modal.linkedRequest||null} onSuccess={l=>{setListings(p=>[l,...p]);setTotal(t=>t+1);}}/>}
      {modal?.type==="detail"&&<DetailModal listing={modal.listing} user={user} token={token} onClose={closeModal} notify={notify}
        onShare={()=>setModal({type:"share",listing:modal.listing})}
        onChat={()=>{if(!user){notify("Sign in to chat","warning");setModal({type:"auth",mode:"login"});return;}setModal({type:"chat",listing:modal.listing});}}
        onLockIn={()=>handleLockIn(modal.listing)}
        onUnlock={()=>setModal({type:"pay",payType:"unlock",listing:modal.listing})}
        onEscrow={()=>{if(!user){notify("Sign in first","warning");setModal({type:"auth",mode:"login"});return;}setModal({type:"pay",payType:"escrow",listing:modal.listing});}}
        isSaved={savedIds.has(modal.listing?.id)} onSave={user?()=>handleToggleSave(modal.listing):null}
      />}
      {modal?.type==="chat"&&user&&<ChatModal listing={modal.listing} user={user} token={token} onClose={closeModal} notify={notify}/>}
      {modal?.type==="share"&&<ShareModal listing={modal.listing} onClose={closeModal}/>}
      {modal?.type==="pay"&&user&&<PayModal type={modal.payType} listingId={modal.listing.id}
        amount={modal.payType==="unlock"?250:Number(modal.listing.price)+Math.round(Number(modal.listing.price)*0.055)}
        purpose={modal.payType==="unlock"?`Unlock buyer contact: ${modal.listing.title}`:`Escrow for: ${modal.listing.title}`}
        token={token} user={user} allowVoucher={true}
        onSuccess={async(result)=>{
          if(result.listing){const ul=result.listing;setListings(p=>p.map(l=>l.id===ul.id?ul:l));closeModal();setTimeout(()=>setModal({type:"detail",listing:ul}),200);notify("Contact details revealed!","success");return;}
          try{const fresh=await apiCall(`/api/listings/${modal.listing.id}`,{},token);const ul=fresh.listing||fresh;setListings(p=>p.map(l=>l.id===ul.id?ul:l));closeModal();setTimeout(()=>setModal({type:"detail",listing:ul}),200);}catch{closeModal();}
          notify(modal.payType==="unlock"?"Buyer contact revealed!":"Escrow activated!","success");
        }}
        onClose={closeModal} notify={notify}/>}
      {toast&&<Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      {resetToken&&<ResetPasswordModal token={resetToken} notify={notify} onClose={()=>{setResetToken(null);setModal({type:"auth",mode:"login"});}}/>}
      {feedContext && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          <SwipeFeed
            user={user} token={token}
            initialListings={feedContext.items} startIndex={feedContext.index}
            onOpen={l => { setFeedContext(null); setModal({type:"detail",listing:l}); }}
            onLockIn={handleLockIn}
            onMessage={l => { if(!user) { notify("Sign in to chat","warning"); setModal({type:"auth",mode:"login"}); } else { setModal({type:"chat",listing:l}); } }}
            savedIds={savedIds} onToggleSave={handleToggleSave}
            onSignIn={() => setModal({type:"auth",mode:"login"})}
            onPostAd={() => { setFeedContext(null); setModal({type:"post"}); }}
            onClose={() => setFeedContext(null)}
          />
        </div>
      )}
    </>;
  }

  // Mobile sold page
  if(isMobile&&page==="sold") return <>
    <SoldPage token={token} user={user} onBack={()=>{setPage("home");setMobileTab("home");if(typeof window!=='undefined')window.history.pushState({},"","/");}}/>
    {toast&&<Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
  </>;

  // Mobile all listings page
  if(isMobile&&page==="listings") return <>
    <AllListingsPage
      user={user} token={token} notify={notify} savedIds={savedIds}
      onBack={()=>{setPage("home");setMobileTab("home");if(typeof window!=='undefined')window.history.pushState({},"","/");}}
      onOpenListing={openListing}
      onToggleSave={handleToggleSave}
      onPostAd={()=>{ if(!user){setModal({type:"auth",mode:"signup"});return;} setModal({type:"post"}); }}
      onSignIn={()=>setModal({type:"auth",mode:"login"})}
      initialFilter={filter}
    />
    {modal?.type==="auth"&&<AuthModal defaultMode={modal.mode} onClose={closeModal} onAuth={handleAuth} notify={notify}/>}
    {modal?.type==="post"&&token&&<PostAdModal onClose={closeModal} token={token} notify={notify} onSuccess={(l, isEdit)=>{
      if (isEdit) {
        setPage("dashboard");
        if(typeof window !== 'undefined') window.history.pushState({}, "", "/dashboard");
        notify("Listing updated and sent for review", "success");
      } else {
        setListings(p=>[l,...p]);
        setTotal(t=>t+1);
      }
    }}/>}

    {modal?.type==="detail"&&<DetailModal listing={modal.listing} user={user} token={token} onClose={closeModal} notify={notify}
      onShare={()=>setModal({type:"share",listing:modal.listing})}
      onChat={()=>{if(!user){notify("Sign in to chat","warning");setModal({type:"auth",mode:"login"});return;}setModal({type:"chat",listing:modal.listing});}}
      onLockIn={()=>handleLockIn(modal.listing)}
      onUnlock={()=>setModal({type:"pay",payType:"unlock",listing:modal.listing})}
      onEscrow={()=>{if(!user){notify("Sign in first","warning");setModal({type:"auth",mode:"login"});return;}setModal({type:"pay",payType:"escrow",listing:modal.listing});}}
      isSaved={savedIds.has(modal.listing?.id)} onSave={user?()=>handleToggleSave(modal.listing):null}
    />}
    {modal?.type==="chat"&&user&&<ChatModal listing={modal.listing} user={user} token={token} onClose={closeModal} notify={notify}/>}
    {modal?.type==="share"&&<ShareModal listing={modal.listing} onClose={closeModal}/>}
    {modal?.type==="pay"&&user&&<PayModal type={modal.payType} listingId={modal.listing.id}
      amount={modal.payType==="unlock"?250:Number(modal.listing.price)+Math.round(Number(modal.listing.price)*0.055)}
      purpose={modal.payType==="unlock"?`Unlock buyer contact: ${modal.listing.title}`:`Escrow for: ${modal.listing.title}`}
      token={token} user={user} allowVoucher={true}
      onSuccess={async(result)=>{
        if(result.listing){const ul=result.listing;setListings(p=>p.map(l=>l.id===ul.id?ul:l));closeModal();setTimeout(()=>setModal({type:"detail",listing:ul}),200);notify("Contact details revealed!","success");return;}
        try{const fresh=await apiCall(`/api/listings/${modal.listing.id}`,{},token);const ul=fresh.listing||fresh;setListings(p=>p.map(l=>l.id===ul.id?ul:l));closeModal();setTimeout(()=>setModal({type:"detail",listing:ul}),200);}catch{closeModal();}
        notify(modal.payType==="unlock"?"Buyer contact revealed!":"Escrow activated!","success");
      }}
      onClose={closeModal} notify={notify}/>}
    {toast&&<Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {resetToken&&<ResetPasswordModal token={resetToken} notify={notify} onClose={()=>{setResetToken(null);setModal({type:"auth",mode:"login"});}}/>}
  </>;

  // Desktop layout
  return <>
    {/* NAV */}
    <nav className="nav">
      <div className="logo" onClick={()=>{setPage("home");setFilter({cat:"",subcat:"",q:"",county:"",minPrice:"",maxPrice:"",sort:"newest"});setSearchInput("");setPg(1);if(typeof window !== 'undefined') window.history.pushState({},"","/");}} style={{color:"#1428A0"}}><WekaSokoLogo size={38}/></div>
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

    {maintenanceMsg&&<div style={{background:"#FEF3C7",borderBottom:"2px solid #F59E0B",color:"#92400E",padding:"12px 20px",textAlign:"center",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {maintenanceMsg}
    </div>}
    {!maintenanceMsg&&page!=="dashboard"&&page!=="sold"&&page!=="requests"&&page!=="listings"&&newSinceLastVisit>0&&<div style={{background:"#10b981",color:"#fff",padding:"9px 20px",textAlign:"center",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      <span>{newSinceLastVisit} new listing{newSinceLastVisit!==1?"s":""} added since your last visit</span>
    </div>}



    {page!=="dashboard"&&page!=="sold"&&page!=="requests"&&page!=="listings"&&<main style={{padding:"clamp(20px,4vw,40px) clamp(16px,4vw,48px) 80px"}}>

      {/* ── TOP PANEL: Left = Hero+Cats+Filters | Right = What Buyers Want ── */}
      <div style={{display:"flex",gap:28,alignItems:"flex-start",marginBottom:48,flexWrap:"wrap"}}>

        {/* LEFT: hero + categories + filters */}
        <div style={{flex:"1 1 380px",minWidth:0,display:"flex",flexDirection:"column",gap:28}}>

          {/* Premium Hero with Real Carousel Content */}
          {loading ? <HeroSkeleton/> : (
            <div className="depth-float" style={{overflow:"hidden",position:"relative",minHeight:420,display:"flex",flexDirection:"column", borderRadius: 28}}>
              {[
                {
                  img: "https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=2070&auto=format&fit=crop",
                  title: <>The Smart Way to <br/><span style={{color:"var(--a)"}}>Buy, Sell & Request</span></>,
                  label: "KENYA'S LARGEST DIGITAL CLASSIFIEDS"
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
                  zIndex: i === heroIdx ? 1 : 0
                }}>
                  <div style={{position:"absolute",inset:0,background:`url(${slide.img}) center/cover no-repeat`}} />
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to right, #fff 40%, rgba(255,255,255,0.7) 60%, transparent 100%)"}} />
                  
                  <div style={{position:"relative",zIndex:2,padding:"clamp(30px,5vw,60px)",display:"flex",flexDirection:"column",justifyContent:"center",height:"100%",maxWidth:600}}>
                    <div className="glass" style={{display:"inline-flex",alignSelf:"flex-start",padding:"6px 14px",borderRadius:30,fontSize:10,fontWeight:800,color:i===1?"#0d9488":i===2?"#7c3aed":"var(--a)",letterSpacing:".14em",textTransform:"uppercase",marginBottom:20}}>
                      {slide.label}
                    </div>
                    <h1 style={{fontSize:"clamp(28px,3.8vw,52px)",fontWeight:900,letterSpacing:"-0.03em",lineHeight:1.05,marginBottom:20,color:"#111",fontFamily:"var(--fn)"}}>
                      {slide.title}
                    </h1>
                    <p style={{fontSize:16,color:"#4B4B5B",lineHeight:1.7,marginBottom:36,fontWeight:500,maxWidth:460}}>
                      Join thousands of Kenyans turning pre-owned items into cash and finding the best deals in the country.
                    </p>
                    
                    <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                      <button className="btn bp lg" style={{boxShadow: "0 10px 25px rgba(20,40,160,0.2)"}} onClick={() => setModal({type:"post"})}>
                        Post Now Free
                      </button>
                      <button className="btn bs lg glass" style={{fontWeight:800}} onClick={() => document.getElementById("listings-section")?.scrollIntoView({behavior:"smooth"})}>
                        Browse Deals {Ic.chevronRight(16)}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Carousel Indicators */}
              <div style={{position:"absolute", bottom:24, left: "clamp(30px, 5vw, 60px)", display:"flex", gap:8, zIndex: 10}}>
                {[0,1,2].map(i => (
                  <div key={i} onClick={() => setHeroIdx(i)} style={{
                    width: i === heroIdx ? 24 : 8, height: 8, borderRadius: 10,
                    background: i === heroIdx ? "var(--a)" : "rgba(0,0,0,0.1)",
                    cursor: "pointer", transition: "all 0.3s ease"
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* High-Visibility Categories Bar */}
          <div style={{display:"flex",flexDirection:"column",gap:20, marginTop: 10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <h3 style={{fontSize:18,fontWeight:900,letterSpacing:"-0.02em"}}>Premium Categories</h3>
              <button className="icon-btn" title="View all categories" style={{width: 40, height: 40}}>{Ic.chevronRight(20)}</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(110px, 1fr))",gap:16}}>
              {CATS.slice(0, 8).map(c => {
                const active = filter.cat === c.name;
                return <div key={c.name}
                  onClick={()=>{setFilter(p=>({...p,cat:p.cat===c.name?"":c.name}));setPg(1);setTimeout(()=>document.getElementById("listings-section")?.scrollIntoView({behavior:"smooth"}),100);}}
                  className={active ? "depth-float" : "glass"}
                  style={{
                    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:"20px 10px",cursor:"pointer",borderRadius:24,
                    border: active ? "2px solid var(--a)" : "1px solid rgba(0,0,0,0.04)",
                    transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
                    transform: active ? "scale(1.08) translateY(-4px)" : "scale(1)",
                    boxShadow: active ? "var(--shadow-hover-float)" : "none"
                  }}>
                  <div style={{width:54,height:54,borderRadius:"50%",overflow:"hidden",boxShadow:"0 6px 14px rgba(0,0,0,0.08)", border: "2px solid #fff"}}>
                    <img src={CAT_PHOTOS[c.name]||CAT_PHOTOS.Other} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  </div>
                  <div style={{fontSize:11,fontWeight:800,color:active?"var(--a)":"#111",textAlign:"center",letterSpacing: "-0.01em"}}>{c.name}</div>
                </div>;
              })}
            </div>
          </div>



          {/* Search & Filters */}
          <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:20,padding:"24px 22px",boxShadow:"0 1px 3px rgba(0,0,0,.06),0 6px 24px rgba(0,0,0,.07)",display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:13,fontWeight:700,color:"#1A1A1A"}}>Search & Filter</div>
            <div style={{display:"flex",gap:0,border:"1.5px solid #E0E0E0",borderRadius:10,overflow:"hidden",background:"#FAFAFA",transition:"border-color .15s"}}
              onFocusCapture={e=>e.currentTarget.style.borderColor="#1428A0"} onBlurCapture={e=>e.currentTarget.style.borderColor="#E0E0E0"}>
              <input style={{flex:1,padding:"10px 14px",border:"none",outline:"none",fontSize:14,fontFamily:"var(--fn)",color:"#1A1A1A",background:"transparent",minWidth:0}}
                placeholder="Search listings..." value={searchInput}
                onChange={e=>setSearchInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"){setFilter(p=>({...p,q:searchInput}));setPg(1);}}}/>
              <button className="btn bp" style={{borderRadius:0,padding:"0 16px",fontSize:14}}
                onClick={()=>{setFilter(p=>({...p,q:searchInput}));setPg(1);}}>Search</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{display:"block",fontSize:13,fontWeight:600,color:"#636363",marginBottom:6}}>Category</label>
                <select className="inp" value={filter.cat} onChange={e=>{setFilter(p=>({...p,cat:e.target.value,subcat:""}));setPg(1);}}>
                  <option value="">All Categories</option>
                  {CATS.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:13,fontWeight:600,color:"#636363",marginBottom:6}}>County</label>
                <select className="inp" value={filter.county} onChange={e=>{setFilter(p=>({...p,county:e.target.value}));setPg(1);}}>
                  <option value="">All Counties</option>
                  {counties.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:13,fontWeight:600,color:"#636363",marginBottom:6}}>Min Price (KSh)</label>
                <input className="inp" placeholder="e.g. 500" type="number" value={filter.minPrice} onChange={e=>{setFilter(p=>({...p,minPrice:e.target.value}));setPg(1);}}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:13,fontWeight:600,color:"#636363",marginBottom:6}}>Max Price (KSh)</label>
                <input className="inp" placeholder="e.g. 50000" type="number" value={filter.maxPrice} onChange={e=>{setFilter(p=>({...p,maxPrice:e.target.value}));setPg(1);}}/>
              </div>
            </div>
            {filter.cat&&<select className="inp" value={filter.subcat} onChange={e=>{setFilter(p=>({...p,subcat:e.target.value}));setPg(1);}}>
              <option value="">All Subcategories</option>
              {(CATS.find(c=>c.name===filter.cat)?.sub||[]).map(s=><option key={s} value={s}>{s}</option>)}
            </select>}
            {(filter.cat||filter.subcat||filter.county||filter.minPrice||filter.maxPrice||filter.q)&&
              <button className="btn bs" style={{width:"100%",borderRadius:10}} onClick={()=>{setFilter({cat:"",subcat:"",q:"",county:"",minPrice:"",maxPrice:"",sort:"newest"});setSearchInput("");setPg(1);}}>Clear Filters</button>}
          </div>
        </div>

        {/* RIGHT: What Buyers Want — full panel */}
        <div style={{flex:"1 1 340px",minWidth:0,maxWidth:480,background:"#fff",border:"1px solid #EBEBEB",borderRadius:20,padding:"24px 22px",boxShadow:"0 1px 3px rgba(0,0,0,.06),0 6px 24px rgba(0,0,0,.07)",position:"sticky",top:"calc(var(--nav-h) + 16px)"}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:4}}>Community</div>
          <div style={{fontSize:20,fontWeight:800,color:"#1A1A1A",marginBottom:4,letterSpacing:"-.02em"}}>Buyers Want</div>
          <p style={{fontSize:13,color:"#888",marginBottom:18,lineHeight:1.6}}>Sellers — see what buyers are actively looking for and respond with a listing.</p>
          <WhatBuyersWant user={user} token={token} notify={notify} onSignIn={()=>setModal({type:"auth",mode:"login"})} compact={true}
            onViewAll={()=>{setPage("requests");if(typeof window!=='undefined')window.history.pushState({},"","/requests");}}
            onIHaveThis={(request,action)=>{
              if(action==="switch_to_seller"){
                apiCall("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token)
                  .then(d=>{const u={...user,...d.user};setUser(u);localStorage.setItem("ws_user",JSON.stringify(u));notify("Switched to Seller! Now post your ad.","success");setModal({type:"post",linkedRequest:request});})
                  .catch(e=>notify(e.message,"error"));
                return;
              }
              setModal({type:"post",linkedRequest:request});
            }}/>
        </div>
      </div>

      {/* ── LISTINGS SECTION — full width below ── */}
      <div id="listings-section">
        <HotRightNow onOpen={openListing} savedIds={savedIds} onToggleSave={handleToggleSave} user={user}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:20,flexWrap:"wrap"}}>
          <h2 style={{fontSize:22,fontWeight:700,letterSpacing:"-.02em",color:"#1A1A1A"}}>
            {filter.cat||"All Listings"} <span style={{fontWeight:400,fontSize:15,color:"#AAAAAA"}}>{total} items</span>
          </h2>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <select style={{padding:"9px 14px",border:"1.5px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:14,fontFamily:"var(--fn)",background:"#fff",color:"#444",cursor:"pointer",transition:"border-color .15s"}}
              value={filter.sort} onChange={e=>{setFilter(p=>({...p,sort:e.target.value}));setPg(1);}}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="popular">Most Viewed</option>
              <option value="expiring">Expiring Soon</option>
            </select>
            <div style={{display:"flex",gap:0,borderRadius:8,overflow:"hidden",border:"1.5px solid #E0E0E0"}}>
              <button onClick={()=>setVm("grid")} style={{background:vm==="grid"?"#1428A0":"#fff",color:vm==="grid"?"#fff":"#767676",border:"none",padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"var(--fn)",transition:"all .15s"}}>Grid</button>
              <button onClick={()=>setVm("list")} style={{background:vm==="list"?"#1428A0":"#fff",color:vm==="list"?"#fff":"#767676",border:"none",borderLeft:"1.5px solid #E0E0E0",padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"var(--fn)",transition:"all .15s"}}>List</button>
            </div>
            {user&&<button className="btn bp" style={{borderRadius:9,fontSize:13,padding:"9px 20px"}} onClick={()=>{
              if(user.role==="buyer"){
                if(typeof window!=="undefined"&&window.confirm("You're currently a Buyer. Switch to Seller to post ads?"))
                  apiCall("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token).then(d=>{const upd={...user,...d.user};setUser(upd);localStorage.setItem("ws_user",JSON.stringify(upd));notify("Switched to Seller!","success");setModal({type:"post"});}).catch(e=>notify(e.message,"error"));
                return;
              }
              setModal({type:"post"});
            }}>+ Post Ad</button>}
          </div>
        </div>

        {loading ? (
          <div className={vm==="grid"?"g3":"lvc"}>
            {Array.from({length: isMobile?12:24}).map((_, i) => <ListingCardSkeleton key={i} listView={vm==="list"}/>)}
          </div>
        ) : listings.length===0 ? (
          <div className="empty glass" style={{padding:"120px 20px", borderRadius: 24}}><h3 style={{fontWeight:900,fontSize:24,marginBottom:12}}>No listings found</h3><p style={{color:"#767676", fontSize: 16}}>Try adjusting your search or category filters.</p></div>
        ) : (
          <div className={vm==="grid"?"g3":"lvc"}>{listings.map(l=><ListingCard key={l.id} listing={l} onClick={()=>openListing(l)} listView={vm==="list"} isSaved={savedIds.has(l.id)} onSave={user?()=>handleToggleSave(l):null}/>)}</div>
        )}

        {!loading&&total>0&&<div style={{textAlign:"center",marginTop:40}}>
          <button className="btn bp lg" style={{padding:"16px 48px", borderRadius: 14, boxShadow: "0 10px 30px rgba(20,40,160,0.2)"}}
            onClick={()=>{setPage("listings");if(typeof window!=='undefined')window.history.pushState({},"","/listings");}}>
            Explore All {total} Listings {Ic.chevronRight(18)}
          </button>
        </div>}

      </div>

      {/* RECENTLY SOLD */}
      <div style={{marginTop:56,paddingTop:48,borderTop:"1px solid #EBEBEB"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,gap:12,flexWrap:"wrap"}}>
          <h2 style={{fontSize:20,fontWeight:700,letterSpacing:"-.02em",color:"#1A1A1A"}}>Recently Sold</h2>
          <button className="btn bs sm" style={{borderRadius:8}}
            onClick={()=>{setPage("sold");if(typeof window!=='undefined')window.history.pushState({},"","/sold");}}>View All Sold Items →</button>
        </div>
        <SoldSection compact={true} onViewAll={()=>{setPage("sold");if(typeof window!=='undefined')window.history.pushState({},"","/sold");}}/>
      </div>

      {/* HOW IT WORKS + STATS */}
      <div style={{marginTop:56,paddingTop:48,borderTop:"1px solid #EBEBEB"}}>
        {/* Stats row — inline, not full-bleed band */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:0,background:"#fff",border:"1px solid #EBEBEB",borderRadius:16,marginBottom:48,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.06)"}}>
          {[{label:"Active Listings",val:stats.activeAds||0},{label:"Items Sold",val:stats.sold||0},{label:"Registered Users",val:stats.users||0},{label:"Total Views",val:stats.views||0}].map((s,i)=>(
            <div key={s.label} style={{padding:"20px 16px",textAlign:"center",borderRight:i<3?"1px solid #EBEBEB":"none"}}>
              <div style={{fontSize:32,fontWeight:800,color:"#1428A0",lineHeight:1,fontFamily:"var(--fn)"}}><Counter to={s.val}/></div>
              <div style={{fontSize:12,fontWeight:500,color:"#888",marginTop:6,letterSpacing:".01em"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── EDUCATIONAL PILLARS: Sell, Buy, Request ── */}
        <div style={{marginBottom:60,textAlign:"center"}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:".2em",textTransform:"uppercase",color:"var(--a)",marginBottom:12}}>How It Works</div>
          <h2 style={{fontSize:"clamp(24px,3vw,38px)",fontWeight:900,letterSpacing:"-0.03em",color:"#111",lineHeight:1.1,marginBottom:12}}>Kenya's Most Versatile Marketplace</h2>
          <p style={{fontSize:15,color:"#6B6B7B",lineHeight:1.8,margin:"0 auto",maxWidth:540}}>Weka Soko isn't just a grid of photos. It's an ecosystem built for intentional buying and selling.</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:24,marginBottom:80}}>
          {[
            {
              title: "Sell & Dispose",
              desc: "The fastest way to turn your pre-owned items into cash. List for free and only pay when we find you a locked-in buyer.",
              icon: Ic.fire(24, "var(--a)"),
              color: "#EEF2FF"
            },
            {
              title: "Buy Smart",
              desc: "Access high-quality items at unbeatable prices. Chat anonymously and use our Escrow service for total peace of mind.",
              icon: Ic.creditCard(24, "#0d9488"),
              color: "#F0FDF4"
            },
            {
              title: "Request Anything",
              desc: "Can't find what you're looking for? Post a request and let the network of sellers find it for you.",
              icon: Ic.search(24, "#B07F10"),
              color: "#FFFBEB"
            }
          ].map((card, i) => (
            <div key={i} className="depth-float" style={{padding:40,display:"flex",flexDirection:"column",gap:20,background:card.color}}>
              <div style={{width:60,height:60,borderRadius:16,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(0,0,0,0.05)"}}>
                {card.icon}
              </div>
              <h3 style={{fontSize:22,fontWeight:900,color:"#111"}}>{card.title}</h3>
              <p style={{fontSize:15,color:"#4B4B5B",lineHeight:1.8}}>{card.desc}</p>
            </div>
          ))}
        </div>


        <div style={{display:"flex",flexWrap:"nowrap",justifyContent:"center",gap:16,overflowX:"auto",paddingBottom:4}}>
          {[
            ["doc","Post for Free","#1428A0","No upfront cost. Photos, description, location — done in 2 minutes."],
            ["chat","Chat Safely","#0d9488","Anonymous, moderated chat. Contact info hidden until unlock."],
            ["fire","Buyer Locks In","#E8194B","Serious buyers click 'I'm Interested'. You get notified instantly."],
            ["card","Pay KSh 250","#f59e0b","Seller pays once to see buyer contact. Till 5673935. Non-refundable."],
            ["lock","Safe Escrow","#7c3aed","Optional 5.5% escrow. Funds held until you confirm delivery."],
            ["trophy","Deal Done","#10b981","Leave a review. Build your seller reputation on the platform."]
          ].map(([icon,title,color,desc],i)=>(
            <div key={title} style={{background:"#fff",borderRadius:16,padding:"20px 18px",boxShadow:"0 1px 3px rgba(0,0,0,.06),0 4px 18px rgba(0,0,0,.07)",border:"1px solid rgba(0,0,0,.05)",display:"flex",flexDirection:"column",flex:"1 1 0",minWidth:150,maxWidth:210,transition:"transform .18s ease,box-shadow .18s ease"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 2px 6px rgba(0,0,0,.07),0 14px 36px rgba(0,0,0,.11)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.06),0 4px 18px rgba(0,0,0,.07)";}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:color+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {icon==="doc"&&<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
                  {icon==="chat"&&<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                  {icon==="fire"&&<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg>}
                  {icon==="card"&&<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
                  {icon==="lock"&&<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                  {icon==="trophy"&&<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5"/><path d="M17 4h3a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5"/><rect x="7" y="2" width="10" height="10" rx="1"/></svg>}
                </div>
                <span style={{fontWeight:700,fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:color}}>Step {i+1}{i===4&&<span style={{marginLeft:6,fontWeight:700,fontSize:9,letterSpacing:".08em",background:"#7c3aed18",color:"#7c3aed",borderRadius:4,padding:"2px 6px",verticalAlign:"middle"}}>OPTIONAL</span>}</span>
              </div>
              <div style={{fontWeight:700,fontSize:15,marginBottom:8,color:"#1A1A1A",lineHeight:1.3}}>{title}</div>
              <div style={{fontSize:13,color:"#636363",lineHeight:1.75}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER — CTA + links + copyright in one compact block */}
      <footer style={{marginTop:48,background:"linear-gradient(135deg,#1428A0 0%,#1e3fd0 100%)",borderRadius:20,padding:"40px 40px 32px",boxShadow:"0 8px 40px rgba(20,40,160,.2)"}}>
        <div style={{display:"flex",gap:32,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",marginBottom:28}}>
          <div>
            <span style={{fontWeight:800,fontSize:22,color:"#fff",letterSpacing:"-.02em"}}>WekaSoko</span>
            <p style={{fontSize:13,color:"rgba(255,255,255,.65)",margin:"6px 0 0",lineHeight:1.6}}>Kenya's marketplace. Free to list.<br/>Pay KSh 250 only when a buyer locks in.</p>
          </div>
          <button className="btn" onClick={()=>setModal({type:"auth",mode:"register"})} style={{background:"#fff",color:"#1428A0",border:"none",padding:"13px 28px",fontSize:14,fontWeight:800,borderRadius:10,cursor:"pointer",fontFamily:"var(--fn)",boxShadow:"0 4px 16px rgba(0,0,0,.15)",whiteSpace:"nowrap"}}>Post an Ad for Free</button>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,paddingTop:20,borderTop:"1px solid rgba(255,255,255,.15)"}}>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            {[["Browse Listings",()=>document.getElementById("listings-section")?.scrollIntoView({behavior:"smooth"})],["Post an Ad",()=>setModal({type:"auth",mode:"register"})],["Buyer Requests",()=>{setPage("requests");if(typeof window!=="undefined")window.history.pushState({},"","/requests");}],["Sold Items",()=>{setPage("sold");if(typeof window!=="undefined")window.history.pushState({},"","/sold");}]].map(([label,fn])=>(
              <button key={label} onClick={fn} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:500,color:"rgba(255,255,255,.7)",fontFamily:"var(--fn)",padding:0,transition:"color .15s"}}
                onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,.7)"}>{label}</button>
            ))}
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.45)"}}>
            &copy; {new Date().getFullYear()} Weka Soko &nbsp;·&nbsp; Till 5673935
          </div>
        </div>
      </footer>
    </main>}

    {/* MODALS */}
    {modal?.type==="auth"&&<AuthModal defaultMode={modal.mode} onClose={closeModal} onAuth={handleAuth} notify={notify}/>}
    {modal?.type==="post"&&token&&<PostAdModal onClose={closeModal} token={token} notify={notify} linkedRequest={modal.linkedRequest||null} onSuccess={(l, isEdit)=>{
      if (isEdit) {
        setPage("dashboard");
        if(typeof window !== 'undefined') window.history.pushState({}, "", "/dashboard");
        notify("Listing updated and sent for review", "success");
      } else {
        setListings(p=>[l,...p]);
        setTotal(t=>t+1);
      }
    }}/>}

    {modal?.type==="detail"&&<DetailModal
      listing={modal.listing} user={user} token={token} onClose={closeModal} notify={notify}
      onShare={()=>setModal({type:"share",listing:modal.listing})}
      onChat={()=>{if(!user){notify("Sign in to chat","warning");setModal({type:"auth",mode:"login"});return;}setModal({type:"chat",listing:modal.listing});}}
      onLockIn={()=>handleLockIn(modal.listing)}
      onUnlock={()=>setModal({type:"pay",payType:"unlock",listing:modal.listing})}
      onEscrow={()=>{if(!user){notify("Sign in first","warning");setModal({type:"auth",mode:"login"});return;}setModal({type:"pay",payType:"escrow",listing:modal.listing});}}
      isSaved={savedIds.has(modal.listing?.id)} onSave={user?()=>handleToggleSave(modal.listing):null}
    />}
    {modal?.type==="chat"&&user&&<ChatModal listing={modal.listing} user={user} token={token} onClose={closeModal} notify={notify}/>}
    {modal?.type==="share"&&<ShareModal listing={modal.listing} onClose={closeModal}/>}
    {modal?.type==="pay"&&user&&<PayModal
      type={modal.payType}
      listingId={modal.listing.id}
      amount={modal.payType==="unlock"?250:Number(modal.listing.price)+Math.round(Number(modal.listing.price)*0.055)}
      purpose={modal.payType==="unlock"?`Unlock buyer contact: ${modal.listing.title}`:`Escrow for: ${modal.listing.title}`}
      token={token} user={user} allowVoucher={true}
      onSuccess={async(result)=>{
        if(result.listing){
          const updatedListing=result.listing;
          setListings(p=>p.map(l=>l.id===updatedListing.id?updatedListing:l));
          closeModal();
          setTimeout(()=>setModal({type:"detail",listing:updatedListing}),200);
          notify("Contact details revealed!","success");
          return;
        }
        try{
          const fresh=await apiCall(`/api/listings/${modal.listing.id}`,{},token);
          const updatedListing=fresh.listing||fresh;
          setListings(p=>p.map(l=>l.id===updatedListing.id?updatedListing:l));
          closeModal();
          setTimeout(()=>setModal({type:"detail",listing:updatedListing}),200);
        }catch{closeModal();}
        notify(modal.payType==="unlock"?"Buyer contact revealed!":"Escrow activated!","success");
      }}
      onClose={closeModal} notify={notify}
    />}
    {resetToken&&<ResetPasswordModal token={resetToken} notify={notify} onClose={()=>{setResetToken(null);setModal({type:"auth",mode:"login"});}}/>}

    {page==="sold"&&<SoldPage token={token} user={user} onBack={()=>{setPage("home");if(typeof window!=='undefined')window.history.pushState({},"","/");}}/>}
    {page==="listings"&&<AllListingsPage
      user={user} token={token} notify={notify} savedIds={savedIds}
      onBack={()=>{setPage("home");if(typeof window!=='undefined')window.history.pushState({},"","/");}}
      onOpenListing={openListing}
      onToggleSave={handleToggleSave}
      onPostAd={()=>{ if(!user){setModal({type:"auth",mode:"signup"});return;} setModal({type:"post"}); }}
      onSignIn={()=>setModal({type:"auth",mode:"login"})}
      initialFilter={filter}
    />}
    {page==="requests"&&<BuyersWantPage user={user} token={token} notify={notify}
      onBack={()=>{setPage("home");if(typeof window!=='undefined')window.history.pushState({},"","/");}}
      onIHaveThis={(request,action)=>{
        if(!user){setModal({type:"auth",mode:"login"});return;}
        if(action==="switch_to_seller"){
          if(typeof window!=='undefined'&&window.confirm("You're currently a Buyer. Switch to Seller to post ads?"))
            apiCall("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token)
              .then(d=>{const u={...user,...d.user};setUser(u);localStorage.setItem("ws_user",JSON.stringify(u));notify("Switched to Seller! Now post your ad.","success");setModal({type:"post",linkedRequest:request});})
              .catch(e=>notify(e.message,"error"));
          return;
        }
        setModal({type:"post",linkedRequest:request});
      }}
      onSignIn={()=>setModal({type:"auth",mode:"login"})}
    />}
    {user&&!user.is_verified&&page==="home"&&<div style={{position:"sticky",top:60,zIndex:99,padding:"0 16px"}}><VerificationBanner user={user} token={token} notify={notify}/></div>}
    {page==="dashboard"&&user&&<Dashboard user={user} token={token} notify={notify} onPostAd={()=>{setPage("home");if(typeof window !== 'undefined') window.history.pushState({},"","/");setModal({type:"post"});}} onClose={()=>{setPage("home");if(typeof window !== 'undefined') window.history.pushState({},"","/");}} onUserUpdate={updated=>{const m={...user,...updated};setUser(m);localStorage.setItem("ws_user",JSON.stringify(m));}} initialTab={typeof window !== 'undefined' && window.location.pathname.startsWith("/dashboard/")?window.location.pathname.split("/dashboard/")[1]:undefined}/>}
    {toast&&<Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {showPWA&&typeof window !== 'undefined' && !localStorage.getItem("pwa-dismissed")&&<PWABanner onDismiss={()=>{setShowPWA(false);localStorage.setItem("pwa-dismissed","1");}}/>}
  </>;
}
