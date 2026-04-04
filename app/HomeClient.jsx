'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { apiCall, fmtKES, ago, CATS, KENYA_COUNTIES, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';
import { WekaSokoLogo, Spin, Toast, Modal, FF, Counter, ImageUploader, TermsModal, PasswordField, ForgotPasswordPanel, ResetPasswordModal, WatermarkedImage, Lightbox, AuthModal, ShareModal, PayModal, ChatModal, PostAdModal, ListingCard, LeaveReviewBtn, ReportListingBtn, VerificationBanner, DetailModal, MarkSoldModal, RoleSwitcher, PostRequestModal, WhatBuyersWant, SoldSection, StarPicker, ReviewsSection, MyRequestsTab, PitchesTab, ProfileSection, PasswordSection, VerificationSection, MobileDashboard, Dashboard, PWABanner, Pager, MobileRequestsTab, MobileLayout, BuyersWantPage, AllListingsPage, SoldPage, HotRightNow } from '@/components/all';

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
  const [notifCount,setNotifCount]=useState(0);
  const socketRef=useRef(null);
  const [resetToken,setResetToken]=useState(null);
  const [savedIds,setSavedIds]=useState(new Set());
  const [newSinceLastVisit,setNewSinceLastVisit]=useState(0);

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
      if (_s.includes('reset_token=') || _s.includes('auth_token=') || _s.includes('verify_email=')) return;
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
    setModal({type:"detail",listing:l});
    if(typeof window !== 'undefined') window.history.pushState({},'',`/?listing=${l.id}`);
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
        amount={modal.payType==="unlock"?250:modal.listing.price+Math.round(modal.listing.price*0.075)}
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
      onPostAd={()=>{
        if(user?.role==="buyer"){
          if(typeof window!=='undefined'&&window.confirm("Switch to Seller to post ads?"))
            apiCall("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token).then(d=>{const u={...user,...d.user};setUser(u);localStorage.setItem("ws_user",JSON.stringify(u));notify("Switched to Seller!","success");setModal({type:"post"});}).catch(e=>notify(e.message,"error"));
          return;
        }
        setModal({type:"post"});
      }}
      onSignIn={()=>setModal({type:"auth",mode:"login"})}
      initialFilter={filter}
    />
    {modal?.type==="auth"&&<AuthModal defaultMode={modal.mode} onClose={closeModal} onAuth={handleAuth} notify={notify}/>}
    {modal?.type==="post"&&token&&<PostAdModal onClose={closeModal} token={token} notify={notify} onSuccess={l=>{setListings(p=>[l,...p]);setTotal(t=>t+1);}}/>}
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
      amount={modal.payType==="unlock"?250:modal.listing.price+Math.round(modal.listing.price*0.075)}
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

    {/* ── HERO + CATEGORIES side by side ── */}
    {page!=="dashboard"&&page!=="sold"&&page!=="requests"&&page!=="listings"&&<div style={{background:"#FFFFFF",borderBottom:"1px solid #EBEBEB"}}>
      <div style={{display:"flex",alignItems:"stretch",minHeight:460,flexWrap:"wrap"}}>

        {/* LEFT — hero text */}
        <div style={{flex:"1 1 380px",minWidth:0,padding:"clamp(28px,5vw,60px) clamp(20px,5vw,56px)",display:"flex",flexDirection:"column",justifyContent:"center",borderRight:"1px solid #EBEBEB",background:"#fff"}}>
          <div style={{fontSize:13,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",marginBottom:18,color:"#1428A0"}}>
            Kenya's Resell Platform
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
                  if(typeof window !== 'undefined' && window.confirm("You're currently a Buyer. To post an ad, switch to a Seller account.\n\nSwitch to Seller now?")){
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
            <span style={{display:"flex",alignItems:"center",gap:7}}><span style={{color:"#1428A0",fontWeight:800,fontSize:16}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg></span>Free to post</span>
            <span style={{display:"flex",alignItems:"center",gap:7}}><span style={{color:"#1428A0",fontWeight:800,fontSize:16}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg></span>Anonymous chat</span>
            <span style={{display:"flex",alignItems:"center",gap:7}}><span style={{color:"#1428A0",fontWeight:800,fontSize:16}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg></span>M-Pesa escrow</span>
          </div>
        </div>

        {/* RIGHT — categories with circular images */}
        <div style={{flex:"1 1 320px",minWidth:0,padding:"clamp(24px,4vw,40px) clamp(16px,4vw,48px) 32px",background:"#FAFAFA"}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:6}}>Browse by Category</div>
          <h2 style={{fontSize:22,fontWeight:700,color:"#1A1A1A",marginBottom:24,letterSpacing:"-.01em",fontFamily:"var(--fn)"}}>What are you looking for?</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(72px,1fr))",gap:8}}>
            {CATS.map(c=>{
              const active=filter.cat===c.name;
              return <div key={c.name}
                onClick={()=>{setFilter(p=>({...p,cat:p.cat===c.name?"":c.name}));setPg(1);setTimeout(()=>document.getElementById("listings-section")?.scrollIntoView({behavior:"smooth"}),100);}}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"12px 4px",cursor:"pointer",borderRadius:14,background:active?"#EEF2FF":"#fff",border:`1.5px solid ${active?"#1428A0":"#EBEBEB"}`,transition:"all .15s",boxShadow:active?"0 0 0 2px rgba(20,40,160,.1)":"none"}}>
                <div style={{width:62,height:62,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:`2.5px solid ${active?"#1428A0":"#E5E5E5"}`,boxShadow:"0 2px 8px rgba(0,0,0,.1)"}}>
                  <img src={CAT_PHOTOS[c.name]||CAT_PHOTOS.Other} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
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
            <span style={{color:"#fff",display:"inline-flex",alignItems:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg></span>{t}
          </span>
        ))}
      </div>
    </div>}

    {page!=="dashboard"&&page!=="sold"&&page!=="requests"&&page!=="listings"&&newSinceLastVisit>0&&<div style={{background:"#1428A0",color:"#fff",padding:"10px 20px",textAlign:"center",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      <span>✨</span><span>{newSinceLastVisit} new listing{newSinceLastVisit!==1?"s":""} added since your last visit</span>
    </div>}
    {page!=="dashboard"&&page!=="sold"&&page!=="requests"&&page!=="listings"&&<main style={{padding:"clamp(20px,4vw,40px) clamp(16px,4vw,48px) 80px"}}>
      <div style={{display:"flex",gap:24,alignItems:"flex-start",flexWrap:"wrap"}}>

        {/* LEFT SIDEBAR */}
        <div style={{width:"min(240px,100%)",flexShrink:0,display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"20px 18px"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:12}}>Search</div>
            <div style={{display:"flex",gap:0,border:"1.5px solid #E0E0E0",borderRadius:10,overflow:"hidden",background:"#FAFAFA"}}>
              <input style={{flex:1,padding:"10px 12px",border:"none",outline:"none",fontSize:14,fontFamily:"var(--fn)",color:"#1A1A1A",background:"transparent",minWidth:0}}
                placeholder="Search listings..." value={searchInput}
                onChange={e=>setSearchInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"){setFilter(p=>({...p,q:searchInput}));setPg(1);}}}/>
              <button style={{background:"#1428A0",color:"#fff",border:"none",padding:"0 14px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"var(--fn)",flexShrink:0}}
                onClick={()=>{setFilter(p=>({...p,q:searchInput}));setPg(1);}}>Go</button>
            </div>
          </div>
          <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"20px 18px"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:12}}>Category</div>
            <select className="inp" style={{borderRadius:8,fontSize:14,marginBottom:filter.cat?10:0}} value={filter.cat} onChange={e=>{setFilter(p=>({...p,cat:e.target.value,subcat:""}));setPg(1);}}>
              <option value="">All Categories</option>
              {CATS.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            {filter.cat&&<select className="inp" style={{borderRadius:8,fontSize:14}} value={filter.subcat} onChange={e=>{setFilter(p=>({...p,subcat:e.target.value}));setPg(1);}}>
              <option value="">All Subcategories</option>
              {(CATS.find(c=>c.name===filter.cat)?.sub||[]).map(s=><option key={s} value={s}>{s}</option>)}
            </select>}
          </div>
          <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"20px 18px"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:12}}>Price Range (KSh)</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input className="inp" style={{borderRadius:8,fontSize:14}} placeholder="Min price" type="number" value={filter.minPrice} onChange={e=>{setFilter(p=>({...p,minPrice:e.target.value}));setPg(1);}}/>
              <input className="inp" style={{borderRadius:8,fontSize:14}} placeholder="Max price" type="number" value={filter.maxPrice} onChange={e=>{setFilter(p=>({...p,maxPrice:e.target.value}));setPg(1);}}/>
            </div>
          </div>
          <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"20px 18px"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:12}}>Location</div>
            <select className="inp" style={{borderRadius:8,fontSize:14}} value={filter.county} onChange={e=>{setFilter(p=>({...p,county:e.target.value}));setPg(1);}}>
              <option value="">All Counties</option>
              {counties.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {(filter.cat||filter.subcat||filter.county||filter.minPrice||filter.maxPrice||filter.q)&&
            <button className="btn bs" style={{width:"100%",borderRadius:10,fontSize:14}} onClick={()=>{setFilter({cat:"",subcat:"",q:"",county:"",minPrice:"",maxPrice:"",sort:"newest"});setSearchInput("");setPg(1);}}>Clear All Filters</button>}
          <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"20px 18px"}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:4}}>Community</div>
            <div style={{fontSize:16,fontWeight:700,color:"#1A1A1A",marginBottom:12}}>Buyers Want</div>
            <WhatBuyersWant user={user} token={token} notify={notify} onSignIn={()=>setModal({type:"auth",mode:"login"})} compact={true}
              onViewAll={()=>{setPage("requests");if(typeof window!=='undefined')window.history.pushState({},"","/requests");}}
              onIHaveThis={(request,action)=>{
                if(action==="switch_to_seller"){
                  apiCall("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token)
                    .then(d=>{const u={...user,...d.user};setUser(u);localStorage.setItem("ws_user",JSON.stringify(u));
                      notify("Switched to Seller! Now post your ad.","success");
                      setModal({type:"post",linkedRequest:request});
                    }).catch(e=>notify(e.message,"error"));
                  return;
                }
                setModal({type:"post",linkedRequest:request});
              }}/>
          </div>
        </div>

        {/* RIGHT: main content */}
        <div style={{flex:1,minWidth:0}} id="listings-section">
          <HotRightNow onOpen={openListing} savedIds={savedIds} onToggleSave={handleToggleSave} user={user}/>
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
                <button onClick={()=>setVm("grid")} style={{background:vm==="grid"?"#1428A0":"#fff",color:vm==="grid"?"#fff":"#767676",border:"1.5px solid #E0E0E0",padding:"8px 14px",cursor:"pointer",fontSize:15,fontFamily:"var(--fn)",borderRadius:"8px 0 0 8px",transition:"all .15s"}}>Grid</button>
                <button onClick={()=>setVm("list")} style={{background:vm==="list"?"#1428A0":"#fff",color:vm==="list"?"#fff":"#767676",border:"1.5px solid #E0E0E0",borderLeft:"none",padding:"8px 14px",cursor:"pointer",fontSize:15,fontFamily:"var(--fn)",borderRadius:"0 8px 8px 0",transition:"all .15s"}}>List</button>
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
            :listings.length===0?<div className="empty"><div style={{fontSize:56,marginBottom:16,opacity:.15}}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><h3 style={{fontWeight:700,fontSize:20,marginBottom:8}}>No listings found</h3><p style={{color:"#767676"}}>Try a different search or filter</p></div>
            :<div className={vm==="grid"?"g3":"lvc"}>{listings.map(l=><ListingCard key={l.id} listing={l} onClick={()=>openListing(l)} listView={vm==="list"} isSaved={savedIds.has(l.id)} onSave={user?()=>handleToggleSave(l):null}/>)}</div>}

          {!loading&&total>0&&<div style={{textAlign:"center",marginTop:24}}>
            <button style={{background:"#1428A0",color:"#fff",border:"none",padding:"13px 32px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:9,boxShadow:"0 2px 8px rgba(20,40,160,.2)"}}
              onClick={()=>{setPage("listings");if(typeof window!=='undefined')window.history.pushState({},"","/listings");}}>
              View All Listings ({total}) →
            </button>
          </div>}
        </div>
      </div>

      {/* PLATFORM STATS */}
      <div style={{background:"#1428A0",borderRadius:0,padding:"clamp(28px,4vw,40px) clamp(20px,4vw,48px)",marginBottom:64,margin:"0 clamp(-16px,-4vw,-48px)",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:0,textAlign:"center"}}>
        {[{label:"Active Listings",val:stats.activeAds||0},{label:"Items Sold",val:stats.sold||0},{label:"Registered Users",val:stats.users||0},{label:"Total Views",val:stats.views||0}].map((s,i)=>(
          <div key={s.label} style={{padding:"0 24px",borderRight:i<3?"1px solid rgba(255,255,255,.2)":"none"}}>
            <div style={{fontSize:40,fontWeight:800,color:"#fff",lineHeight:1,fontFamily:"var(--fn)"}}><Counter to={s.val}/></div>
            <div style={{fontSize:14,fontWeight:500,color:"rgba(255,255,255,.7)",marginTop:8,letterSpacing:".02em"}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* RECENTLY SOLD */}
      <div style={{marginTop:64,paddingTop:56,borderTop:"2px solid #EBEBEB"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,gap:12,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#767676",marginBottom:6}}>Marketplace Activity</div>
            <h2 style={{fontSize:22,fontWeight:700,letterSpacing:"-.02em",color:"#1A1A1A"}}>Recently Sold</h2>
          </div>
          <button style={{background:"#1D1D1D",color:"#fff",border:"none",padding:"10px 22px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8}}
            onClick={()=>{setPage("sold");if(typeof window!=='undefined')window.history.pushState({},"","/sold");}}>View All Sold Items →</button>
        </div>
        <SoldSection compact={true} onViewAll={()=>{setPage("sold");if(typeof window!=='undefined')window.history.pushState({},"","/sold");}}/>
      </div>

      {/* HOW IT WORKS */}
      <div style={{marginTop:80,paddingTop:64,borderTop:"2px solid #CCCCCC"}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#767676",marginBottom:12}}>How It Works</div>
          <h2 style={{fontSize:"clamp(24px,4vw,40px)",fontWeight:700,letterSpacing:"-.03em",color:"#111111",lineHeight:1.1}}>Simple. Safe.<br/>Built for Kenya.</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:20}}>
          {[["doc","Post for Free","No upfront cost. Photos, description, location — done in 2 minutes."],
            ["chat","Chat Safely","Anonymous, moderated chat. Contact info hidden until unlock."],
            ["fire","Buyer Locks In","Serious buyers click 'I'm Interested'. You get notified instantly."],
            ["card","Pay KSh 250","Seller pays once to see buyer contact. Till 5673935. Non-refundable."],
            ["lock","Safe Escrow","Optional 7.5% escrow. Funds held until you confirm delivery."],
            ["trophy","Deal Done","Leave a review. Build your seller reputation on the platform."]].map(([icon,title,desc])=>(
            <div key={title} style={{background:"#F4F4F4",padding:"28px 24px"}}>
              <div style={{marginBottom:14,display:"flex",alignItems:"center"}}>{icon==="doc"?<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>:icon==="chat"?<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>:icon==="fire"?<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg>:icon==="card"?<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>:icon==="lock"?<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>:icon==="trophy"?<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5"/><path d="M17 4h3a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5"/><rect x="7" y="2" width="10" height="10" rx="1"/></svg>:null}</div>
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
      isSaved={savedIds.has(modal.listing?.id)} onSave={user?()=>handleToggleSave(modal.listing):null}
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
      onPostAd={()=>{
        if(user?.role==="buyer"){
          if(typeof window!=='undefined'&&window.confirm("You're currently a Buyer. Switch to Seller to post ads?"))
            apiCall("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token).then(d=>{const u={...user,...d.user};setUser(u);localStorage.setItem("ws_user",JSON.stringify(u));notify("Switched to Seller!","success");setModal({type:"post"});}).catch(e=>notify(e.message,"error"));
          return;
        }
        setModal({type:"post"});
      }}
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
