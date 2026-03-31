'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { apiCall, fmtKES, ago, CATS, KENYA_COUNTIES, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';

// ── WEKA SOKO LOGO COMPONENT ──────────────────────────────────────────────────
function WekaSokoLogo({ size = 32, iconOnly = false, light = false }) {
  const iconH = size;
  const iconW = size * (44/52);
  const textSize = size * 0.72;
  const subSize = size * 0.28;
  const gap = size * 0.32;
  const totalH = iconH;
  const totalW = iconOnly ? iconW : iconW + gap + (textSize * (iconOnly ? 0 : 4.6));
  const blue = light ? "#FFFFFF" : "#111111";
  const textColor = light ? "#FFFFFF" : "#111111";
  if (iconOnly) {
    return (
      <svg width={iconW} height={iconH} viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:"block",flexShrink:0}}>
        <rect x="0" y="17" width="44" height="35" rx="3" fill="#111111"/>
        <rect x="0" y="28" width="44" height="5" fill="#333333"/>
        <path d="M10 17 Q10 3 22 3 Q34 3 34 17" fill="none" stroke={blue} strokeWidth="3.5" strokeLinecap="round"/>
        <circle cx="22" cy="42" r="5" fill="white" opacity="0.9"/>
        <circle cx="22" cy="42" r="2.5" fill="#111111"/>
      </svg>
    );
  }
  return (
    <svg width={iconW + gap + 82} height={iconH} viewBox={`0 0 ${Math.round(iconW + gap + 82)} ${iconH}`} fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:"block"}}>
      {/* Bag body */}
      <rect x="0" y={Math.round(iconH*0.33)} width={Math.round(iconW)} height={Math.round(iconH*0.67)} rx="3" fill="#111111"/>
      {/* Bag shadow strip */}
      <rect x="0" y={Math.round(iconH*0.53)} width={Math.round(iconW)} height={Math.round(iconH*0.1)} fill="#333333"/>
      {/* Bag handle */}
      <path d={`M${Math.round(iconW*0.23)} ${Math.round(iconH*0.33)} Q${Math.round(iconW*0.23)} ${Math.round(iconH*0.06)} ${Math.round(iconW*0.5)} ${Math.round(iconH*0.06)} Q${Math.round(iconW*0.77)} ${Math.round(iconH*0.06)} ${Math.round(iconW*0.77)} ${Math.round(iconH*0.33)}`} fill="none" stroke={blue} strokeWidth={Math.round(size*0.08)} strokeLinecap="round"/>
      {/* Lock dot */}
      <circle cx={Math.round(iconW*0.5)} cy={Math.round(iconH*0.81)} r={Math.round(iconH*0.096)} fill="white" opacity="0.9"/>
      <circle cx={Math.round(iconW*0.5)} cy={Math.round(iconH*0.81)} r={Math.round(iconH*0.048)} fill="#111111"/>
      {/* Wordmark */}
      <text x={Math.round(iconW + gap)} y={Math.round(iconH*0.73)} fontFamily="var(--fn,-apple-system,'Segoe UI',Arial,sans-serif)" fontSize={Math.round(textSize)} fontWeight="700" fill={textColor} letterSpacing="-0.02em">Weka<tspan fill="#111111">Soko</tspan></text>
    </svg>
  );
}


// ── CATEGORIES ────────────────────────────────────────────────────────────────
const TERMS = `WEKA SOKO — TERMS & CONDITIONS  (February 2026)

1. ACCEPTANCE
By using Weka Soko you agree to these Terms.

2. PLATFORM ROLE
Weka Soko is a classified advertising platform only. We are NOT party to any transaction. ALL transactions are solely between buyer and seller. Weka Soko shall NOT be liable for item quality, fraud, loss, or damage. Users transact at their own risk.

3. ESCROW SERVICE
Escrow is a convenience feature. Weka Soko is not a licensed financial institution. The 7.5% platform fee is non-refundable once payment is accepted. Dispute decisions by Weka Soko are final.

4. FEES
Contact unlock fee: KSh 250 (non-refundable). Escrow fee: 7.5% of item price. All payments to Till Number 5673935.

5. PROHIBITED CONTENT
No stolen goods, counterfeit items, illegal drugs, weapons, or adult content. Violators will be permanently banned.

6. CONTENT POLICY
No contact info in chat before unlock. Photos must not contain nudity or contact details.

7. ACCOUNT RESPONSIBILITY
You are responsible for all activity on your account.

8. GOVERNING LAW
These Terms are governed by the laws of Kenya. Contact: support@wekasoko.co.ke`;

// ── HELPERS ───────────────────────────────────────────────────────────────────
// Time remaining until a future date
const timeLeft = ts => { if(!ts)return""; const d=new Date(ts).getTime()-Date.now(); if(d<=0)return"Expired"; if(d<3600000)return Math.floor(d/60000)+"m left"; if(d<86400000)return Math.floor(d/3600000)+"h left"; if(d<604800000)return Math.floor(d/86400000)+"d left"; const weeks=Math.floor(d/604800000); return weeks+(weeks===1?" week left":" weeks left"); };
const lastSeen = ts => { if(!ts)return""; const d=Date.now()-new Date(ts).getTime(); if(d<30000)return"online"; if(d<60000)return"last seen just now"; if(d<3600000)return"last seen "+Math.floor(d/60000)+"m ago"; if(d<86400000)return"last seen "+Math.floor(d/3600000)+"h ago"; if(d<172800000)return"last seen yesterday"; return"last seen "+new Date(ts).toLocaleDateString("en-KE",{day:"numeric",month:"short"}); };


// Convert VAPID base64 key to Uint8Array for PushManager.subscribe
function urlBase64ToUint8Array(base64String) {
  if (typeof window === 'undefined') return new Uint8Array();
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── CSS ───────────────────────────────────────────────────────────────────────
// ── COMPONENTS ────────────────────────────────────────────────────────────────
function Spin({s}){return <span className="spin" style={s?{width:s,height:s}:{}}/>;}

function Toast({msg,type,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,5000);return()=>clearTimeout(t);},[]);
  const c={success:"#111111",error:"#444444",warning:"#B07F10",info:"#2563EB"}[type]||"#111111";
  return <div className="toast" style={{borderLeft:`3px solid ${c}`}}><span style={{fontSize:20}}>{({success:"✅",error:"❌",warning:"⚠️",info:"ℹ️"})[type]||"ℹ️"}</span><span>{msg}</span><button className="btn bgh sm" style={{marginLeft:"auto",padding:"2px 6px"}} onClick={onClose}>✕</button></div>;
}

function Modal({title,onClose,children,footer,large,xl}){
  return <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className={`mod${large?" lg":""}${xl?" xl":""}`}>
      <div className="mh"><h3 style={{fontSize:17,fontWeight:700}}>{title}</h3><button className="btn bgh sm" style={{borderRadius:"50%",width:32,height:32,padding:0}} onClick={onClose}>✕</button></div>
      <div className="mb">{children}</div>
      {footer&&<div className="mf">{footer}</div>}
    </div>
  </div>;
}

function FF({label,hint,children,required}){
  return <div style={{marginBottom:15}}>
    {label&&<label className="lbl">{label}{required&&<span style={{color:"#AAAAAA",marginLeft:3}}>*</span>}</label>}
    {children}
    {hint&&<p style={{fontSize:11,color:"#CCCCCC",marginTop:4}}>{hint}</p>}
  </div>;
}

function Counter({to}){
  const [n,setN]=useState(0);const r=useRef(null);
  useEffect(()=>{
    if (typeof window === 'undefined') return;
    const ob=new IntersectionObserver(([e])=>{
      if(!e.isIntersecting)return;
      let v=0;const step=Math.max(1,to/70);
      const iv=setInterval(()=>{v+=step;if(v>=to){setN(to);clearInterval(iv);}else setN(Math.floor(v));},16);
      ob.disconnect();
    });
    if(r.current)ob.observe(r.current);
    return()=>ob.disconnect();
  },[to]);
  return <span ref={r}>{n.toLocaleString()}</span>;
}

// ── IMAGE UPLOADER ────────────────────────────────────────────────────────────
function ImageUploader({images,setImages}){
  const ref=useRef(null);
  const add=files=>{
    if (typeof window === 'undefined') return;
    const n=Array.from(files).slice(0,8-images.length).map(f=>({file:f,preview:URL.createObjectURL(f)}));
    setImages(p=>[...p,...n].slice(0,8));
  };
  const remove=i=>setImages(p=>{
    if (typeof window !== 'undefined') URL.revokeObjectURL(p[i].preview);
    return p.filter((_,j)=>j!==i);
  });
  return <>
    <div className="img-upload" onClick={()=>ref.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();add(e.dataTransfer.files);}}>
      <div style={{fontSize:36,marginBottom:8}}>📷</div>
      <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Tap to add photos</div>
      <div style={{fontSize:12,color:"#888888"}}>Or drag & drop · up to 8 photos · First = cover</div>
      <input ref={ref} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>add(e.target.files)}/>
    </div>
    {images.length>0&&<div className="img-grid">{images.map((img,i)=>(
      <div key={i} className="img-thumb">
        <img src={img.preview} alt=""/>
        {i===0&&<div style={{position:"absolute",bottom:4,left:4,background:"#111111",color:"#fff",fontSize:9,padding:"2px 7px",borderRadius:6,fontWeight:600}}>COVER</div>}
        <button className="img-del" onClick={e=>{e.stopPropagation();remove(i);}}>✕</button>
      </div>
    ))}</div>}
  </>;
}

// ── TERMS MODAL ───────────────────────────────────────────────────────────────
function TermsModal({onClose,onAccept}){
  const [ok,setOk]=useState(false);const r=useRef(null);
  return <Modal title="📄 Terms & Conditions" onClose={onClose} footer={
    <><button className="btn bs" onClick={onClose}>Decline</button><button className="btn bp" onClick={onAccept} disabled={!ok}>{ok?"I Accept →":"↓ Scroll to Accept"}</button></>
  }>
    {!ok&&<div className="alert ay" style={{marginBottom:14}}>Scroll to the bottom to enable the Accept button.</div>}
    <div ref={r} onScroll={()=>{const el=r.current;if(el&&el.scrollTop+el.clientHeight>=el.scrollHeight-30)setOk(true);}} style={{maxHeight:380,overflowY:"auto",background:"#F5F5F5",borderRadius:6,padding:"16px 18px",fontSize:13,lineHeight:1.9,color:"#888888",whiteSpace:"pre-wrap"}}>{TERMS}</div>
  </Modal>;
}

// ── PASSWORD FIELD with show/hide toggle ────────────────────────────────────
function PasswordField({label,hint,value,onChange,onEnter,placeholder="••••••••"}){
  const [show,setShow]=useState(false);
  return <FF label={label||"Password"} hint={hint}>
    <div style={{position:"relative",display:"flex",alignItems:"center"}}>
      <input className="inp" style={{flex:1,paddingRight:44}}
        type={show?"text":"password"}
        placeholder={placeholder}
        value={value}
        onChange={e=>onChange(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&onEnter&&onEnter()}
        autoComplete="current-password"
      />
      <button type="button" onClick={()=>setShow(s=>!s)}
        style={{position:"absolute",right:10,background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#888888",padding:"4px",lineHeight:1}}>
        {show?"🙈":"👁"}
      </button>
    </div>
  </FF>;
}

// ── FORGOT PASSWORD PANEL ────────────────────────────────────────────────────
function ForgotPasswordPanel({onBack,notify}){
  const [email,setEmail]=useState("");
  const [sent,setSent]=useState(false);
  const [loading,setLoading]=useState(false);
  const send=async()=>{
    if(!email.trim()){notify("Enter your email address","warning");return;}
    setLoading(true);
    try{
      await apiCall("/api/auth/forgot-password",{method:"POST",body:JSON.stringify({email:email.trim()})});
      setSent(true);
    }catch(err){notify(err.message,"error");}
    finally{setLoading(false);}
  };
  return <div style={{padding:"10px 0"}}>
    {sent?<div style={{textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:12}}>📧</div>
      <div style={{fontWeight:700,marginBottom:8}}>Check your email</div>
      <div style={{color:"#888888",marginBottom:20}}>We've sent a password reset link to <b>{email}</b>.</div>
      <button className="btn bgh" onClick={onBack}>← Back to Sign In</button>
    </div>:<>
      <div style={{color:"#888888",fontSize:13,marginBottom:20}}>Enter your email and we'll send you a link to reset your password.</div>
      <FF label="Email Address">
        <input className="inp" type="email" placeholder="e.g. joe@gmail.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
      </FF>
      <button className="btn bp" style={{width:"100%",marginTop:10}} onClick={send} disabled={loading}>{loading?<Spin/>:"Send Reset Link →"}</button>
      <button className="btn bgh" style={{width:"100%",marginTop:12,fontSize:13}} onClick={onBack}>← Back to Sign In</button>
    </>}
  </div>;
}

// ── RESET PASSWORD MODAL ────────────────────────────────────────────────────
function ResetPasswordModal({token,onClose,notify}){
  const [password,setPassword]=useState("");
  const [done,setDone]=useState(false);
  const [loading,setLoading]=useState(false);
  const submit=async()=>{
    if(password.length<8){notify("Password must be at least 8 characters","warning");return;}
    setLoading(true);
    try{
      await apiCall("/api/auth/reset-password",{method:"POST",body:JSON.stringify({token,password})});
      setDone(true);
    }catch(err){notify(err.message,"error");}
    finally{setLoading(false);}
  };
  return <Modal title="🔐 Set New Password" onClose={onClose}>
    {done?<div style={{textAlign:"center",padding:"20px 0"}}>
      <div style={{fontSize:48,marginBottom:12}}>✅</div>
      <div style={{fontWeight:700,marginBottom:8}}>Password updated!</div>
      <div style={{color:"#888888",marginBottom:20}}>You can now sign in with your new password.</div>
      <button className="btn bp" onClick={onClose}>Sign In →</button>
    </div>:<>
      <div style={{color:"#888888",fontSize:13,marginBottom:16}}>Choose a new password for your account.</div>
      <PasswordField label="New Password" hint="At least 8 characters" value={password} onChange={setPassword} onEnter={submit}/>
      <button className="btn bp" style={{width:"100%",marginTop:8}} onClick={submit} disabled={loading}>{loading?<Spin/>:"Set New Password →"}</button>
    </>}
  </Modal>;
}

// ── SHARE MODAL ───────────────────────────────────────────────────────────────
function ShareModal({listing,onClose}){
  // ✅ FIX: Guard window access
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url=`${origin}/?listing=${listing.id}`;
  const txt=`"${listing.title}" — ${fmtKES(listing.price)} on Weka Soko`;
  const [copied,setCopied]=useState(false);

  const ICONS={
    WhatsApp:<svg viewBox="0 0 24 24" width="28" height="28"><path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
    Facebook:<svg viewBox="0 0 24 24" width="28" height="28"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    "Twitter/X":<svg viewBox="0 0 24 24" width="28" height="28"><path fill="#000" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    Telegram:<svg viewBox="0 0 24 24" width="28" height="28"><path fill="#26A5E4" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
    TikTok:<svg viewBox="0 0 24 24" width="28" height="28"><path fill="#000" d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/></svg>,
    Copy:<svg viewBox="0 0 24 24" width="28" height="28" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="#555" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="#555" strokeWidth="2"/></svg>,
  };

  const share=[
    {key:"WhatsApp",label:"WhatsApp",bg:"#E8FFF2",href:`https://wa.me/?text=${encodeURIComponent(txt+"\n"+url)}`},
    {key:"Facebook",label:"Facebook",bg:"#EEF4FF",href:`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`},
    {key:"Twitter/X",label:"X (Twitter)",bg:"#F5F5F5",href:`https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}&url=${encodeURIComponent(url)}`},
    {key:"Telegram",label:"Telegram",bg:"#E8F6FF",href:`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(txt)}`},
    {key:"TikTok",label:"TikTok",bg:"#F5F5F5",href:`https://www.tiktok.com/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(txt)}`},
    {key:"Copy",label:copied?"Copied!":"Copy Link",bg:"#F5F5F5",action:()=>{if(typeof window !== 'undefined') navigator.clipboard?.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2500);}},
  ];

  return <Modal title="Share Listing" onClose={onClose}>
    <div style={{background:"#F8F8F8",borderRadius:12,padding:"14px 16px",marginBottom:20,display:"flex",gap:12,alignItems:"center",border:"1px solid #EBEBEB"}}>
      <div style={{width:42,height:42,borderRadius:10,background:"#E5E5E5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>🏷️</div>
      <div style={{minWidth:0}}>
        <div style={{fontWeight:700,fontSize:14,color:"#1A1A1A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{listing.title}</div>
        <div style={{fontSize:13,color:"#1428A0",fontWeight:700,marginTop:2}}>{fmtKES(listing.price)}</div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
      {share.map(s=>(
        <button key={s.key}
          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"16px 8px",border:"1px solid #EBEBEB",borderRadius:14,background:s.bg,cursor:"pointer",transition:"all .15s",fontFamily:"var(--fn)"}}
          onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"}
          onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}
          onClick={()=>{if(s.action){s.action();}else{if(typeof window !== 'undefined') window.open(s.href,"_blank","noopener,noreferrer");}}}>
          {ICONS[s.key]}
          <span style={{fontSize:12,fontWeight:600,color:"#333"}}>{s.label}</span>
        </button>
      ))}
    </div>
    <div style={{display:"flex",gap:8,background:"#F8F8F8",borderRadius:10,padding:"10px 14px",border:"1px solid #EBEBEB",alignItems:"center"}}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round"/></svg>
      <input className="inp" value={url} readOnly style={{flex:1,fontSize:12,border:"none",background:"transparent",padding:"0",outline:"none",color:"#636363"}}/>
      <button className="btn bp sm" style={{borderRadius:8,whiteSpace:"nowrap"}} onClick={()=>{if(typeof window !== 'undefined') navigator.clipboard?.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2500);}}>{copied?"✓ Copied":"Copy"}</button>
    </div>
  </Modal>;
}

// ... (Rest of the components from components/all.jsx would follow here, each with similar window checks added)
// Note: Due to size constraints, I am providing the fixed version of the components we identified as problematic.
// You should apply these patterns (typeof window !== 'undefined' checks) to any other component that uses browser APIs.
