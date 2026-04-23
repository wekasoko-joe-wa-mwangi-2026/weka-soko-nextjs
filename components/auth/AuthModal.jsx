'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';
import { api, Spin, Ic, useRipple, WekaSokoLogo } from '@/components/ui/primitives';
import { Modal, FF } from '@/components/ui/core';
import { Toast, ImageUploader } from '@/components/ui/core';

function TermsModal({onClose,onAccept}){
  const [ok,setOk]=useState(false);const r=useRef(null);
  return <Modal title="Terms & Conditions" onClose={onClose} footer={
    <><button className="btn bs" onClick={onClose}>Decline</button><button className="btn bp" onClick={onAccept} disabled={!ok}>{ok?"I Accept":"Scroll to Accept"}</button></>
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
        style={{position:"absolute",right:10,background:"none",border:"none",cursor:"pointer",color:"#888888",padding:"4px",lineHeight:1,display:"flex",alignItems:"center"}}>
        {show?Ic.eyeOff(16):Ic.eye(16)}
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
      await api("/api/auth/forgot-password",{method:"POST",body:JSON.stringify({email:email.trim()})});
      setSent(true);
    }catch(err){notify(err.message,"error");}
    finally{setLoading(false);}
  };
  if(sent)return <div style={{textAlign:"center",padding:"20px 0"}}>
    <div style={{marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.inbox(48,"#1428A0")}</div>
    <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Check your email</div>
    <div style={{fontSize:13,color:"#888888",lineHeight:1.7,marginBottom:16}}>
      We sent a reset link to <strong>{email}</strong>.<br/>Check your inbox (and spam folder).
    </div>
    <button className="btn bs" onClick={onBack}>Back to Sign In</button>
  </div>;
  return <div style={{padding:"8px 0"}}>
    <div style={{fontSize:14,color:"#888888",marginBottom:16,lineHeight:1.6}}>
      Enter the email on your account. We'll send you a link to reset your password.
    </div>
    <FF label="Email Address" required>
      <input className="inp" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
    </FF>
    <div style={{display:"flex",gap:8,marginTop:4}}>
      <button className="btn bs" onClick={onBack}>Back</button>
      <button className="btn bp" style={{flex:1}} onClick={send} disabled={loading}>{loading?<Spin/>:"Send Reset Link"}</button>
    </div>
  </div>;
}

// ── RESET PASSWORD MODAL ──────────────────────────────────────────────────────
function ResetPasswordModal({token,onClose,notify}){
  const [password,setPassword]=useState("");
  const [done,setDone]=useState(false);
  const [loading,setLoading]=useState(false);
  const submit=async()=>{
    if(password.length<8){notify("Password must be at least 8 characters","warning");return;}
    setLoading(true);
    try{
      await api("/api/auth/reset-password",{method:"POST",body:JSON.stringify({token,password})});
      setDone(true);
    }catch(err){notify(err.message,"error");}
    finally{setLoading(false);}
  };
  return <Modal title="Set New Password" onClose={onClose}>
    {done?<div style={{textAlign:"center",padding:"20px 0"}}>
      <div style={{marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.checkCircle(48,"#1428A0")}</div>
      <div style={{fontWeight:700,marginBottom:8}}>Password updated!</div>
      <div style={{color:"#888888",marginBottom:20}}>You can now sign in with your new password.</div>
      <button className="btn bp" onClick={onClose}>Sign In</button>
    </div>:<>
      <div style={{color:"#888888",fontSize:13,marginBottom:16}}>Choose a new password for your account.</div>
      <PasswordField label="New Password" hint="At least 8 characters" value={password} onChange={setPassword} onEnter={submit}/>
      <button className="btn bp" style={{width:"100%",marginTop:8}} onClick={submit} disabled={loading}>{loading?<Spin/>:"Set New Password"}</button>
    </>}
  </Modal>;
}

// ── IMAGE LIGHTBOX ────────────────────────────────────────────────────────────
// ── WATERMARKED IMAGE ─────────────────────────────────────────────────────────
// Renders an image on a <canvas> with a tiled diagonal WekaSoko watermark.
// The watermark is baked into the canvas pixel data — right-click save includes it.
function WatermarkedImage({src,alt,style={},onClick}){
  const canvasRef=useRef(null);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    if(!src){setLoaded(false);return;}
    setLoaded(false);
    const img=new Image();
    img.crossOrigin="anonymous";
    img.onload=()=>{
      const canvas=canvasRef.current;
      if(!canvas)return;
      const w=img.naturalWidth, h=img.naturalHeight;
      canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext("2d");
      ctx.drawImage(img,0,0);
      // Single centred diagonal watermark — visible on both bright and dark images
      const fontSize=Math.max(22,Math.min(w,h)*0.10);
      ctx.save();
      ctx.translate(w/2,h/2);
      ctx.rotate(-Math.PI/6);
      ctx.font=`700 ${fontSize}px var(--fn),Helvetica,Arial,sans-serif`;
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      // Dark halo pass — makes it pop on bright/white images
      ctx.shadowColor="rgba(0,0,0,0.55)";
      ctx.shadowBlur=8;
      ctx.shadowOffsetX=0;
      ctx.shadowOffsetY=0;
      ctx.fillStyle="rgba(255,255,255,0.42)";
      ctx.fillText("WekaSoko",0,0);
      // Second pass — strengthen the white fill without shadow
      ctx.shadowBlur=0;
      ctx.fillStyle="rgba(255,255,255,0.38)";
      ctx.fillText("WekaSoko",0,0);
      ctx.restore();
      setLoaded(true);
    };
    img.onerror=()=>setLoaded(false);
    img.src=src;
  },[src]);

  return <>
    <canvas ref={canvasRef} onClick={onClick}
      style={{...style,display:loaded?"block":"none",cursor:onClick?"zoom-in":"default"}}/>
    {!loaded&&<img src={src} alt={alt||""}
      style={{...style,cursor:onClick?"zoom-in":"default"}} onClick={onClick}/>}
  </>;
}

// ── LIGHTBOX ──────────────────────────────────────────────────────────────────
function Lightbox({photos,startIdx,onClose}){
  const [idx,setIdx]=useState(startIdx||0);
  const prev=()=>setIdx(i=>(i-1+photos.length)%photos.length);
  const next=()=>setIdx(i=>(i+1)%photos.length);
  useEffect(()=>{
    const h=e=>{if(e.key==="ArrowLeft")prev();if(e.key==="ArrowRight")next();if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[]);
return <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.96)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}
  onClick={onClose} role="dialog" aria-modal="true" aria-label="Image lightbox">
  <button onClick={onClose} aria-label="Close lightbox" style={{position:"absolute",top:16,right:20,background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:44,height:44,borderRadius:"50%",cursor:"pointer",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.x(20,"#fff")}</button>
  <div style={{position:"absolute",top:20,left:"50%",transform:"translateX(-50%)",color:"rgba(255,255,255,.7)",fontSize:13,zIndex:10}} aria-live="polite">{idx+1} / {photos.length}</div>
  <div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",justifyContent:"center",maxWidth:"92vw",maxHeight:"82vh"}}>
  <WatermarkedImage src={photos[idx]} alt={`Photo ${idx + 1} of ${photos.length}`}  style={{maxWidth:"92vw",maxHeight:"82vh",objectFit:"contain",borderRadius:8,boxShadow:"0 8px 40px rgba(0,0,0,.6)",display:"block"}}/>
  </div>
  {photos.length>1&&<>
  <button onClick={e=>{e.stopPropagation();prev();}} aria-label="Previous photo" style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:50,height:50,borderRadius:"50%",cursor:"pointer",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.chevronLeft(28,"#fff")}</button>
  <button onClick={e=>{e.stopPropagation();next();}} aria-label="Next photo" style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:50,height:50,borderRadius:"50%",cursor:"pointer",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.chevronRight(28,"#fff")}</button>
  </>}
  {photos.length>1&&<div style={{position:"absolute",bottom:20,display:"flex",gap:8,overflowX:"auto",maxWidth:"90vw",padding:"0 8px",zIndex:10}} role="list" aria-label="Photo thumbnails">
  {photos.map((p,i)=><img key={i} src={p} alt="" role="listitem" onClick={e=>{e.stopPropagation();setIdx(i);}}
  style={{width:56,height:44,objectFit:"cover",borderRadius:8,cursor:"pointer",opacity:i===idx?1:.45,border:i===idx?"2px solid #fff":"2px solid transparent",flexShrink:0,transition:"opacity .2s"}}/>)}
  </div>}
</div>;
}

// ── AUTH MODAL ────────────────────────────────────────────────────────────────

function AuthModal({defaultMode,onClose,onAuth,notify}){
  const [mode,setMode]=useState(defaultMode||"login");
  const [loading,setLoading]=useState(false);
  const [showTerms,setShowTerms]=useState(false);
  const [agreed,setAgreed]=useState(false);
  const [f,setF]=useState({name:"",email:"",password:"",role:"buyer",phone:""});
  const sf=(k,v)=>setF(p=>({...p,[k]:v}));
  const [verifyEmail,setVerifyEmail]=useState(null); // set when verification required
  const [resendLoading,setResendLoading]=useState(false);
  const [resendSent,setResendSent]=useState(false);
  const [unverifiedEmail,setUnverifiedEmail]=useState(null); // for login block

  const resendVerification=async(email)=>{
    setResendLoading(true);
    try{
      // Register a temp token then resend — use resend endpoint
      await api("/api/auth/resend-verification-by-email",{method:"POST",body:JSON.stringify({email})});
      setResendSent(true);
      notify("Verification email resent! Check your inbox.","success");
    }catch(e){notify(e.message,"error");}
    finally{setResendLoading(false);}
  };

  const submit=async()=>{
    if(!f.email||!f.password){notify("Please fill in all fields.","warning");return;}
    if(mode==="signup"){
      if(!f.name.trim()){notify("Please enter your name.","warning");return;}
      if(f.password.length<8){notify("Password must be at least 8 characters.","warning");return;}
      const pwStrong=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(f.password);
      if(!pwStrong){notify("Password must include uppercase, lowercase, and a number.","warning");return;}
      if(!agreed){notify("Please accept the Terms & Conditions.","warning");return;}
    }
    setLoading(true);
    try{
      const data=mode==="login"
        ?await api("/api/auth/login",{method:"POST",body:JSON.stringify({email:f.email.trim(),password:f.password})})
        :await api("/api/auth/register",{method:"POST",body:JSON.stringify({name:f.name.trim(),email:f.email.trim(),password:f.password,role:f.role,phone:f.phone||undefined})});

      localStorage.setItem("ws_token",data.token);
      localStorage.setItem("ws_user",JSON.stringify(data.user));
      onAuth(data.user,data.token);onClose();
      if(mode==="signup"){
        notify(`Welcome to Weka Soko, ${data.user.name?.split(" ")[0]||""}! Check your email to verify your account.`,"success");
      } else {
        notify(`Welcome back, ${data.user.name?.split(" ")[0]||""}!`,"success");
      }
    }catch(err){
      // Login blocked because email not verified
      if(err.message?.includes("verify your email")||err.message?.includes("requiresVerification")){
        setUnverifiedEmail(f.email.trim());
      } else {
        notify(err.message,"error");
      }
    }
    finally{setLoading(false);}
  };

  if(showTerms)return <TermsModal onClose={()=>setShowTerms(false)} onAccept={()=>{setAgreed(true);setShowTerms(false);notify("Terms accepted","success");}}/>;

  // ── Signup success: verify email screen ──────────────────────────────────
  if(verifyEmail)return <Modal title="Check Your Email" onClose={onClose}>
    <div style={{textAlign:"center",padding:"12px 0 20px"}}>
      <div style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.mail(56,"#1428A0")}</div>
      <h3 style={{fontWeight:700,fontSize:18,marginBottom:10}}>Almost there!</h3>
      <p style={{fontSize:14,color:"#888888",lineHeight:1.8,marginBottom:20}}>
        We sent a verification link to<br/>
        <strong style={{color:"var(--txt)"}}>{verifyEmail}</strong><br/><br/>
        Click the link in that email to activate your account. It expires in 24 hours.
      </p>
      <div style={{background:"#F8F8F8",border:"1px solid #E8E8E8",borderRadius:12,padding:"12px 16px",fontSize:12,color:"#111111",marginBottom:20,textAlign:"left"}}>
        <strong>Can't find the email?</strong> Check your spam or junk folder.<br/>
        Make sure you signed up with <strong>{verifyEmail}</strong>.
      </div>
      {!resendSent
        ?<button className="btn bs" style={{marginBottom:10}} onClick={()=>resendVerification(verifyEmail)} disabled={resendLoading}>
            {resendLoading?<Spin/>:"Resend verification email"}
          </button>
        :<p style={{fontSize:13,color:"#111111",fontWeight:600}}>Email resent! Check your inbox.</p>}
      <button className="btn bgh" style={{display:"block",margin:"8px auto 0"}} onClick={onClose}>Close</button>
    </div>
  </Modal>;

  // ── Login blocked: unverified email ──────────────────────────────────────
  if(unverifiedEmail)return <Modal title="Verify Your Email First" onClose={onClose}>
    <div style={{textAlign:"center",padding:"12px 0 20px"}}>
      <div style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.lock(56,"#636363")}</div>
      <h3 style={{fontWeight:700,fontSize:17,marginBottom:10}}>Email not verified</h3>
      <p style={{fontSize:14,color:"#888888",lineHeight:1.8,marginBottom:20}}>
        Your account was created but your email address hasn't been verified yet.<br/><br/>
        Check <strong style={{color:"var(--txt)"}}>{unverifiedEmail}</strong> for the verification link we sent when you signed up.
      </p>
      {!resendSent
        ?<button className="btn bp" style={{marginBottom:12}} onClick={()=>resendVerification(unverifiedEmail)} disabled={resendLoading}>
            {resendLoading?<Spin/>:"Resend verification email"}
          </button>
        :<div style={{marginBottom:12,padding:"10px 14px",background:"#F8F8F8",border:"1px solid #E8E8E8",borderRadius:12,fontSize:13,color:"#111111"}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg> Email sent! Click the link in your inbox to activate your account.
          </div>}
      <button className="btn bgh" style={{display:"block",margin:"0 auto"}} onClick={()=>setUnverifiedEmail(null)}>Back to Sign In</button>
    </div>
  </Modal>;

  return <Modal title={mode==="login"?"Sign In":"Create Account"} onClose={onClose} footer={
    <><button className="btn bs" onClick={onClose}>Cancel</button><button className="btn bp" onClick={submit} disabled={loading}>{loading?<Spin/>:mode==="login"?"Sign In":"Create Account"}</button></>
  }>
    <div style={{textAlign:"center",marginBottom:20,paddingBottom:16,borderBottom:"1px solid #E8E8E8"}}><div style={{display:"inline-flex"}}><WekaSokoLogo size={28}/></div></div>
    {/* Google OAuth placeholder */}
    <button className="btn bs" style={{width:"100%",marginBottom:16,gap:10}} onClick={()=>window.location.href=`${API}/api/auth/google`}>
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8.1 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.1 8.1 3l5.7-5.7C34.5 6.5 29.5 4 24 4c-7.8 0-14.5 4.4-17.7 10.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10.1-2 13.7-5.2l-6.3-5.3C29.5 35.5 26.9 36.5 24 36.5c-5.2 0-9.6-3.5-11.2-8.2l-6.5 5C9.4 39.5 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6.1 0 .1 0 0 0l6.3 5.3C37.5 38.7 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>
      Continue with Google
    </button>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
      <div style={{flex:1,height:1,background:"#E8E8E8"}}/>
      <span style={{fontSize:12,color:"#CCCCCC"}}>or with email</span>
      <div style={{flex:1,height:1,background:"#E8E8E8"}}/>
    </div>
{mode==="signup"&&<>
  <FF label="Full Name" required><input className="inp" placeholder="Your full name" value={f.name} onChange={e=>sf("name",e.target.value)} autoComplete="name"/></FF>
  <FF label="I am a">
  <div style={{display:"flex",gap:8}}>
  {["buyer","seller"].map(r=><button key={r} className={`btn ${f.role===r?"bp":"bs"}`} style={{flex:1}} onClick={()=>sf("role",r)}>{r==="buyer"?"Buyer":"Seller"}</button>)}
  </div>
  </FF>
  <FF label="Phone (M-Pesa)" hint="Used for payment notifications"><input className="inp" type="tel" placeholder="07XXXXXXXX" value={f.phone} onChange={e=>sf("phone",e.target.value)} autoComplete="tel"/></FF>
  </>}
  <FF label="Email" required><input className="inp" type="email" placeholder="you@example.com" value={f.email} onChange={e=>sf("email",e.target.value)} autoComplete="email"/></FF>
    <PasswordField
      label={mode==="signup"?"Password":"Password"}
      hint=""
      value={f.password}
      onChange={v=>sf("password",v)}
      onEnter={submit}
    />
    {mode==="signup"&&f.password.length>0&&(()=>{
      const s={
        hasLen:f.password.length>=8,
        hasUpper:/[A-Z]/.test(f.password),
        hasLower:/[a-z]/.test(f.password),
        hasNum:/\d/.test(f.password),
        hasSpecial:/[^A-Za-z0-9]/.test(f.password),
      };
      const score=Object.values(s).filter(Boolean).length;
      const color=score<=2?"#AAAAAA":score===3?"#888888":score===4?"#555555":"#111111";
      const label=score<=2?"Weak":score===3?"Fair":score===4?"Good":"Strong";
      return <div style={{marginTop:-10,marginBottom:12}}>
        <div style={{display:"flex",gap:4,marginBottom:6}}>
          {[1,2,3,4,5].map(i=><div key={i} style={{flex:1,height:3,borderRadius:8,background:i<=score?color:"#E8E8E8",transition:"background .2s"}}/>)}
        </div>
        <div style={{fontSize:11,color,fontWeight:600}}>{label} password</div>
        <div style={{fontSize:11,color:"#CCCCCC",marginTop:3}}>
          {!s.hasLen&&"8+ chars · "}{!s.hasUpper&&"Uppercase · "}{!s.hasLower&&"Lowercase · "}{!s.hasNum&&"Number · "}{!s.hasSpecial&&"Symbol (optional)"}
        </div>
      </div>;
    })()}
    {mode==="login"&&<div style={{textAlign:"right",marginTop:-8,marginBottom:8}}>
      <button className="btn bgh" style={{display:"inline",padding:"0 3px",color:"#111111",fontSize:12}} onClick={()=>setMode("forgot")}>Forgot password?</button>
    </div>}
    {mode==="forgot"&&<ForgotPasswordPanel onBack={()=>setMode("login")} notify={notify}/>}
    {mode==="signup"&&<div style={{background:"#F5F5F5",borderRadius:6,padding:"12px 14px"}}>
      <label style={{display:"flex",alignItems:"flex-start",gap:9,cursor:"pointer",fontSize:13,color:"#888888"}}>
        <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{marginTop:3,width:15,height:15}}/>
        <span>I have read and accept the <button className="btn bgh" style={{display:"inline",padding:"0 2px",color:"#1428A0",fontWeight:700,fontSize:13}} onClick={()=>setShowTerms(true)}>Terms & Conditions</button></span>
      </label>
    </div>}
    <p style={{textAlign:"center",marginTop:14,fontSize:13,color:"#888888"}}>
      {mode==="login"?"No account? ":"Already have one? "}
      <button className="btn bgh" style={{display:"inline",padding:"0 3px",color:"#1428A0",fontWeight:700,fontSize:13}} onClick={()=>setMode(m=>m==="login"?"signup":"login")}>{mode==="login"?"Sign up free →":"Sign in"}</button>
    </p>
  </Modal>;
}



export { TermsModal, PasswordField, ForgotPasswordPanel, ResetPasswordModal, WatermarkedImage, Lightbox, AuthModal };
