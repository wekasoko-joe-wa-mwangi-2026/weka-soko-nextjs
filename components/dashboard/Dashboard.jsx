'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Ic, Spin, WekaSokoLogo, api, useRipple } from '@/components/ui/primitives';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';


import { Modal, FF, ImageUploader, compressImage } from '@/components/ui/core';
import { StarPicker, ReviewsSection } from '@/components/dashboard/ReviewsSection';
import { ChatModal } from '@/components/chat/ChatModal';
import { PayModal } from '@/components/payments/PayModal';
import { PostAdModal, MarkSoldModal } from '@/components/listings/ListingComponents';
import { RoleSwitcher, PostRequestModal } from '@/components/requests/RequestComponents';
import { SoldSection } from '@/components/sold/SoldComponents';

function MyRequestsTab({token,notify,user}){
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showModal,setShowModal]=useState(false);

  const load=useCallback(()=>{
    setLoading(true);
    api("/api/requests/mine",{},token).catch(()=>[]).then(r=>{setRequests(Array.isArray(r)?r:[]);setLoading(false);});
  },[token]);

  useEffect(()=>{load();},[load]);

  const deleteRequest=async(id)=>{
    if(!window.confirm("Delete this request?"))return;
    try{
      await api(`/api/requests/${id}`,{method:"DELETE"},token);
      setRequests(p=>p.filter(r=>r.id!==id));
      notify("Request deleted","success");
    }catch(err){notify(err.message,"error");}
  };

  if(loading)return<div style={{textAlign:"center",padding:40}}><Spin s="32px"/></div>;

  return<>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div className="lbl" style={{margin:0}}>My Requests ({requests.length})</div>
      <button className="btn bp sm" onClick={()=>setShowModal(true)}>+ New Request</button>
    </div>
    {requests.length===0
      ?<div className="empty" style={{padding:"32px 0"}}>
          <div style={{marginBottom:12,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
          <p style={{fontWeight:700,marginBottom:6}}>No requests yet</p>
          <p style={{fontSize:13,color:"#888888"}}>Post a request to let sellers know what you're looking for</p>
          <button className="btn bp" style={{marginTop:14}} onClick={()=>setShowModal(true)}>Post a Request →</button>
        </div>
      :requests.map(r=>(
        <div key={r.id} style={{padding:"14px 16px",background:"#F5F5F5",borderRadius:6,marginBottom:10,border:"1px solid #E8E8E8",borderLeft:"3px solid #E0E0E0"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:6}}>
            <div style={{fontWeight:700,fontSize:14}}>{r.title}</div>
            <button onClick={()=>deleteRequest(r.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#CCCCCC",fontSize:14,padding:"0 2px",flexShrink:0}}>Close</button>
          </div>
          <div style={{fontSize:12,color:"#888888",marginBottom:8,lineHeight:1.6}}>{r.description}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
            {r.budget&&<span className="badge bg-g">Budget: {fmtKES(r.budget)}</span>}
            {r.county&&<span className="badge bg-m"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> {r.county}</span>}
            <span className={`badge ${r.status==="active"?"bg-g":"bg-m"}`}>{r.status}</span>
          </div>
          <div style={{fontSize:11,color:"#CCCCCC"}}>{ago(r.created_at)}</div>
        </div>
      ))
    }
    {showModal&&<PostRequestModal token={token} notify={notify} onClose={()=>setShowModal(false)} onSuccess={r=>{setRequests(p=>[r,...p]);}}/>}
  </>;
}

// ── PITCHES TAB — Buyer sees who pitched on their requests ──────────────────
function PitchesTab({token, notify, user}) {
  const [requests, setRequests] = useState([]);
  const [pitches, setPitches] = useState({}); // { requestId: [pitch, ...] }
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null); // pitch being paid for

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const reqs = await api("/api/requests/mine", {}, token);
      setRequests(Array.isArray(reqs) ? reqs : []);
    } catch(e) {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const loadPitches = async (requestId) => {
    if (pitches[requestId]) { setExpanded(expanded === requestId ? null : requestId); return; }
    try {
      const data = await api(`/api/pitches/for-request/${requestId}`, {}, token);
      setPitches(p => ({ ...p, [requestId]: Array.isArray(data) ? data : [] }));
      setExpanded(requestId);
    } catch(e) { notify("Failed to load pitches", "error"); }
  };

  const decline = async (pitchId, requestId) => {
    try {
      await api(`/api/pitches/${pitchId}/decline`, { method: "POST" }, token);
      setPitches(p => ({ ...p, [requestId]: p[requestId].map(x => x.id === pitchId ? { ...x, status: "declined" } : x) }));
      notify("Pitch declined.", "info");
    } catch(e) { notify(e.message, "error"); }
  };

  if (loading) return <div style={{textAlign:"center",padding:40}}><Spin s="32px"/></div>;

  if (requests.length === 0) return <div className="empty" style={{padding:"40px 0"}}>
    <div style={{marginBottom:12,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div>
    <p style={{fontWeight:700,marginBottom:6}}>No active requests</p>
    <p style={{fontSize:13,color:"var(--mut)"}}>Post a buyer request to start receiving pitches from sellers</p>
  </div>;

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    {requests.map(r => {
      const rPitches = pitches[r.id] || [];
      const pendingCount = rPitches.filter(p => p.status === "pending").length;
      return <div key={r.id} style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,overflow:"hidden"}}>
        {/* Request header */}
        <div style={{padding:"16px 18px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,cursor:"pointer",background:expanded===r.id?"#F8F9FF":"#fff",transition:"background .15s"}}
          onClick={() => loadPitches(r.id)}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:15,color:"#1A1A1A",marginBottom:4}}>{r.title}</div>
            <div style={{fontSize:13,color:"#888",lineHeight:1.5}}>{r.description?.slice(0,80)}{r.description?.length>80?"...":""}</div>
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
              {r.budget&&<span style={{background:"#EEF2FF",color:"#1428A0",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:700}}>Budget: {fmtKES(r.budget)}</span>}
              {r.county&&<span style={{background:"#F0F0F0",color:"#555",padding:"3px 10px",borderRadius:20,fontSize:12}}><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> {r.county}</span>}
              <span style={{background:"#F0F0F0",color:"#555",padding:"3px 10px",borderRadius:20,fontSize:12}}>{ago(r.created_at)}</span>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
            {pendingCount > 0
              ? <span style={{background:"#1428A0",color:"#fff",borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:700}}>{pendingCount} pitch{pendingCount !== 1 ? "es" : ""}</span>
              : <span style={{background:"#F0F0F0",color:"#888",borderRadius:20,padding:"4px 12px",fontSize:12}}>
                  {pitches[r.id] ? `${rPitches.length} pitch${rPitches.length !== 1 ? "es" : ""}` : "View pitches"}
                </span>}
            <span style={{fontSize:18,color:"#AAAAAA"}}>{expanded === r.id ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* Pitches list */}
        {expanded === r.id && <div style={{borderTop:"1px solid #EBEBEB"}}>
          {rPitches.length === 0
            ? <div style={{padding:"24px",textAlign:"center",color:"#AAAAAA",fontSize:13}}>
                <div style={{marginBottom:8,opacity:.3,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div>
                No pitches yet — sellers will appear here when they respond to your request.
              </div>
            : rPitches.map(p => (
              <div key={p.id} style={{padding:"16px 18px",borderBottom:"1px solid #F5F5F5",background:p.status==="accepted"?"#F0FFF4":p.status==="declined"?"#FAFAFA":"#fff"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#1428A0",flexShrink:0}}>
                        {p.seller_anon?.charAt(0)?.toUpperCase() || "S"}
                      </div>
                      <span style={{fontWeight:600,fontSize:13,color:"#1A1A1A"}}>{p.seller_anon || "Anonymous Seller"}</span>
                      {p.offered_price && <span style={{background:"#EEF2FF",color:"#1428A0",padding:"2px 8px",borderRadius:20,fontSize:12,fontWeight:700}}>{fmtKES(p.offered_price)}</span>}
                      <span style={{fontSize:11,color:"#AAAAAA",marginLeft:"auto"}}>{ago(p.created_at)}</span>
                    </div>
                    <p style={{fontSize:14,color:"#333",lineHeight:1.65,marginBottom:10,padding:"10px 12px",background:"#F8F8F8",borderRadius:8}}>{p.message}</p>
                    {p.status === "accepted" && <div style={{marginTop:6}}>
                      <div style={{fontSize:13,color:"#16a34a",fontWeight:600,marginBottom:8}}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg> Accepted — contact revealed</div>
                      {(p.seller_phone||p.seller_email)&&<div style={{background:"#F0FFF4",border:"1px solid #BBF7D0",borderRadius:10,padding:"10px 14px",fontSize:13,lineHeight:1.7}}>
                        <div style={{fontWeight:700,color:"#1A1A1A",marginBottom:4}}>{p.seller_name||p.seller_anon}</div>
                        {p.seller_phone&&<div style={{color:"#15803d"}}>Phone: <a href={`tel:${p.seller_phone}`} style={{color:"#15803d",fontWeight:700}}>{p.seller_phone}</a></div>}
                        {p.seller_email&&<div style={{color:"#15803d"}}>Email: <a href={`mailto:${p.seller_email}`} style={{color:"#15803d",fontWeight:700}}>{p.seller_email}</a></div>}
                      </div>}
                    </div>}
                    {p.status === "declined" && <div style={{fontSize:13,color:"#888"}}>Declined</div>}
                  </div>
                </div>
                {p.status === "pending" && <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button className="btn bp" style={{borderRadius:8,fontSize:13,padding:"8px 18px"}}
                    onClick={() => setPaying({...p, request_id: r.id})}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Accept — Pay KSh 250
                  </button>
                  <button className="btn bs" style={{borderRadius:8,fontSize:13,padding:"8px 18px"}}
                    onClick={() => decline(p.id, r.id)}>
                    Decline
                  </button>
                </div>}
              </div>
            ))}
        </div>}
      </div>;
    })}

    {/* Pay modal for accepting a pitch */}
    {paying && <PayModal
      pitchId={paying.id}
      amount={250}
      purpose={`Reveal seller contact for your request`}
      token={token} user={user} allowVoucher={true}
      onSuccess={(result) => {
        if (result?.seller_contact) {
          notify(`Contact revealed! ${result.seller_contact.name} — ${result.seller_contact.phone || result.seller_contact.email}`, "success");
        } else {
          notify("Pitch accepted! Payment confirmed.", "success");
        }
        setPaying(prev => {
          // clear pitch cache for this request so re-expansion fetches fresh data
          if (prev?.request_id) setPitches(p => { const n={...p}; delete n[prev.request_id]; return n; });
          return null;
        });
        load();
      }}
      onClose={() => setPaying(null)}
      notify={notify}
    />}
  </div>;
}

// ── PROFILE SECTION ──────────────────────────────────────────────────────────
function ProfileSection({user, token, notify, onUpdate}){
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: user.name||"",
    phone: user.phone||"",
    whatsapp_phone: user.whatsapp_phone||""
  });

  // Reset form if user prop changes
  useEffect(()=>{
    setF({name:user.name||"",phone:user.phone||"",whatsapp_phone:user.whatsapp_phone||""});
  }, [user.name, user.phone, user.whatsapp_phone]);

  const save = async()=>{
    if(!f.name.trim()){notify("Name cannot be empty","warning");return;}
    setSaving(true);
    try{
      const updated = await api("/api/auth/profile",{
        method:"PATCH",
        body:JSON.stringify({
          name: f.name.trim()||undefined,
          phone: f.phone.trim()||undefined,
          whatsapp_phone: f.whatsapp_phone.trim()||undefined,
        })
      }, token);
      onUpdate(updated);
      setEditing(false);
      notify("Profile updated!","success");
    }catch(e){notify(e.message,"error");}
    finally{setSaving(false);}
  };

  return <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"20px 22px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
      <div style={{fontWeight:700,fontSize:15,color:"#1A1A1A"}}>Profile Information</div>
      {!editing
        ?<button className="btn bs sm" style={{borderRadius:8}} onClick={()=>setEditing(true)}>Edit</button>
        :<div style={{display:"flex",gap:8}}>
          <button className="btn bs sm" style={{borderRadius:8}} onClick={()=>{setEditing(false);setF({name:user.name||"",phone:user.phone||"",whatsapp_phone:user.whatsapp_phone||""});}}>Cancel</button>
          <button className="btn bp sm" style={{borderRadius:8}} onClick={save} disabled={saving}>{saving?<Spin/>:"Save"}</button>
        </div>}
    </div>

    {/* Avatar + name row */}
    <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,paddingBottom:18,borderBottom:"1px solid #F5F5F5"}}>
      <div style={{width:56,height:56,borderRadius:"50%",background:"#1428A0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#fff",flexShrink:0}}>
        {user.name?.charAt(0)?.toUpperCase()||"?"}
      </div>
      <div>
        <div style={{fontWeight:700,fontSize:17,color:"#1A1A1A"}}>{user.name}</div>
        <div style={{fontSize:13,color:"#888",marginTop:2}}>{user.anon_tag&&<span style={{background:"#F0F4FF",color:"#1428A0",padding:"2px 8px",borderRadius:20,fontSize:12,fontWeight:600}}>@{user.anon_tag}</span>}</div>
      </div>
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Name */}
      <div>
        <div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Display Name</div>
        {editing
          ?<input className="inp" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="Your name"/>
          :<div style={{fontSize:15,color:"#1A1A1A",fontWeight:500}}>{user.name||<span style={{color:"#CCC"}}>Not set</span>}</div>}
      </div>

      {/* Email — always read-only */}
      <div>
        <div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Email</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:15,color:"#1A1A1A",fontWeight:500}}>{user.email}</div>
          {user.is_verified
            ?<span style={{background:"#DCFCE7",color:"#16a34a",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:700}}>Verified</span>
            :<span style={{background:"#FEF9C3",color:"#CA8A04",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:700}}>Unverified</span>}
        </div>
        <div style={{fontSize:12,color:"#AAAAAA",marginTop:3}}>Email cannot be changed</div>
      </div>

      {/* Phone */}
      <div>
        <div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Phone Number</div>
{editing
  ?<input className="inp" value={f.phone} onChange={e=>setF(p=>({...p,phone:e.target.value}))} placeholder="e.g. 0712345678" type="tel" autoComplete="tel"/>
  :<div style={{fontSize:15,color:"#1A1A1A",fontWeight:500}}>{user.phone||<span style={{color:"#CCC"}}>Not set</span>}</div>}
        {editing&&<div style={{fontSize:12,color:"#AAAAAA",marginTop:4}}>Used for M-Pesa payments — shared with buyers after KSh 250 unlock</div>}
      </div>

      {/* WhatsApp */}
      <div>
        <div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>WhatsApp Number</div>
{editing
  ?<input className="inp" value={f.whatsapp_phone} onChange={e=>setF(p=>({...p,whatsapp_phone:e.target.value}))} placeholder="e.g. 0712345678 (if different from phone)" type="tel" autoComplete="tel"/>
  :<div style={{fontSize:15,color:"#1A1A1A",fontWeight:500}}>{user.whatsapp_phone||<span style={{color:"#CCC",fontSize:13}}>Same as phone</span>}</div>}
      </div>

      {/* Role — read-only display */}
      <div>
        <div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Account Type</div>
        <span className={`badge ${user.role==="seller"?"bg-g":"bg-b"}`}>{user.role==="seller"?"Seller":"Buyer"}</span>
      </div>

      {/* Member since */}
      <div>
        <div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Member Since</div>
        <div style={{fontSize:14,color:"#636363"}}>{new Date(user.created_at).toLocaleDateString("en-KE",{year:"numeric",month:"long",day:"numeric"})}</div>
      </div>
    </div>
  </div>;
}

// ── PASSWORD SECTION ──────────────────────────────────────────────────────────
function PasswordSection({user, token, notify}){
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({current:"", newPwd:"", confirm:""});
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // has_native_password = user has a real password hash (not Google-only)
  const hasNativePwd = !!user.has_native_password;

  const save = async()=>{
    if(f.newPwd.length < 8){notify("New password must be at least 8 characters","warning");return;}
    if(f.newPwd !== f.confirm){notify("Passwords do not match","warning");return;}
    setSaving(true);
    try{
      await api("/api/auth/change-password",{
        method:"POST",
        body:JSON.stringify({currentPassword:f.current, newPassword:f.newPwd})
      }, token);
      notify("Password changed successfully!","success");
      setOpen(false);
      setF({current:"",newPwd:"",confirm:""});
    }catch(e){notify(e.message,"error");}
    finally{setSaving(false);}
  };

  return <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"20px 22px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div>
        <div style={{fontWeight:700,fontSize:15,color:"#1A1A1A",marginBottom:2}}>Password</div>
        <div style={{fontSize:13,color:"#888"}}>{hasNativePwd?"••••••••":"Signed in with Google"}</div>
      </div>
      <button className="btn bs sm" style={{borderRadius:8}} onClick={()=>setOpen(p=>!p)}>
        {open?"Cancel":"Change Password"}
      </button>
    </div>

    {open&&<div style={{marginTop:18,paddingTop:18,borderTop:"1px solid #F5F5F5",display:"flex",flexDirection:"column",gap:12}}>
      {/* Current password — required when user has a native password hash */}
      {hasNativePwd&&<div>
        <label style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".05em"}}>Current Password</label>
        <div style={{position:"relative"}}>
          <input className="inp" type={showCurrent?"text":"password"} value={f.current} onChange={e=>setF(p=>({...p,current:e.target.value}))} placeholder="Enter current password" style={{paddingRight:44}}/>
          <button onClick={()=>setShowCurrent(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#888"}}>{showCurrent?<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button>
        </div>
      </div>}

      <div>
        <label style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".05em"}}>New Password</label>
        <div style={{position:"relative"}}>
          <input className="inp" type={showNew?"text":"password"} value={f.newPwd} onChange={e=>setF(p=>({...p,newPwd:e.target.value}))} placeholder="Minimum 8 characters" style={{paddingRight:44}}/>
          <button onClick={()=>setShowNew(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#888"}}>{showNew?<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button>
        </div>
        {f.newPwd&&<div style={{marginTop:6,display:"flex",gap:4,alignItems:"center"}}>
          {[8,12,16].map(n=><div key={n} style={{height:3,flex:1,borderRadius:2,background:f.newPwd.length>=n?"#1428A0":"#E0E0E0",transition:"background .2s"}}/>)}
          <span style={{fontSize:11,color:"#888",marginLeft:4}}>{f.newPwd.length<8?"Weak":f.newPwd.length<12?"Fair":"Strong"}</span>
        </div>}
      </div>

      <div>
        <label style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".05em"}}>Confirm New Password</label>
        <input className="inp" type="password" value={f.confirm} onChange={e=>setF(p=>({...p,confirm:e.target.value}))} placeholder="Re-enter new password"/>
        {f.confirm&&f.newPwd&&<div style={{fontSize:12,marginTop:4,color:f.confirm===f.newPwd?"#16a34a":"#dc2626"}}>
          {f.confirm===f.newPwd?"Passwords match":"Passwords do not match"}
        </div>}
      </div>

      <button className="btn bp" style={{borderRadius:10,marginTop:4}} onClick={save} disabled={saving||!f.newPwd||(hasNativePwd&&!f.current)||f.newPwd!==f.confirm}>
        {saving?<Spin/>:"Update Password"}
      </button>
    </div>}
  </div>;
}

// ── VERIFICATION SECTION ──────────────────────────────────────────────────────
function VerificationSection({user, token, notify}){
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async()=>{
    setSending(true);
    try{
      await api("/api/auth/resend-verification",{method:"POST"}, token);
      setSent(true);
      notify("Verification email sent! Check your inbox.","success");
    }catch(e){notify(e.message,"error");}
    finally{setSending(false);}
  };

  return <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:14,padding:"20px 22px"}}>
    <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
      <span style={{flexShrink:0}}><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
      <div style={{flex:1}}>
        <div style={{fontWeight:700,fontSize:15,color:"#92400E",marginBottom:4}}>Email Not Verified</div>
        <div style={{fontSize:13,color:"#78350F",lineHeight:1.7,marginBottom:14}}>
          Your email <strong>{user.email}</strong> hasn't been verified yet. Verify it to secure your account and receive important notifications.
        </div>
        {sent
          ?<div style={{fontSize:13,color:"#16a34a",fontWeight:600}}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg> Email sent! Check your inbox (and spam folder).</div>
          :<button className="btn bp" style={{borderRadius:10,background:"#D97706",border:"none"}} onClick={resend} disabled={sending}>
            {sending?<Spin/>:"Send Verification Email"}
          </button>}
      </div>
    </div>
  </div>;
}


// ── MOBILE DASHBOARD ─────────────────────────────────────────────────────────
function MobileDashboard({
  user,token,notify,listings,buyerInterests,savedListings,myRequests,notifs,threads,
  stats,loading,unreadCount,mobSection,setMobSection,
  onPostAd,onClose,onUserUpdate,
  setSelectedListing,selectedListing,showPayModal,setShowPayModal,
  editingListing,setEditingListing,markSoldListing,setMarkSoldListing,
  setListings,setNotifs
}){
  // Bottom nav sections
  const navItems=[
    {id:"home",  label:"Overview",   icon:<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="3" y="3" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="3" y="12" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="12" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="2"/></svg>},
    {id:"ads",   label:user.role==="seller"?"My Ads":"Interests", icon:<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/></svg>},
    {id:"notif", label:"Inbox",   icon:<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, badge:unreadCount>0?unreadCount:null},
    {id:"settings",label:"Account",icon:<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>},
  ];

  const [inboxTab,setInboxTab]=useState("chat");
  const unreadMsgsMob=threads.reduce((a,t)=>a+parseInt(t.unread_count||0),0);
  const unreadNotifsMob=notifs.filter(n=>!n.is_read).length;

  const markRead=async(id)=>{
    try{
      await api(`/api/notifications/${id}/read`,{method:"PATCH"},token);
      setNotifs(p=>p.map(n=>n.id===id?{...n,is_read:true}:n));
    }catch{}
  };

  return <div style={{display:"flex",flexDirection:"column",height:"100dvh",background:"#F5F5F7",fontFamily:"var(--fn)",overflowX:"hidden"}}>

    {/* ── TOP BAR ── */}
    <div style={{background:"#1428A0",padding:"env(safe-area-inset-top,0) 0 0",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 0"}}>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,padding:"8px 12px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)",display:"flex",alignItems:"center",gap:6}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
          Back
        </button>
        <div style={{fontSize:16,fontWeight:700,color:"#fff",letterSpacing:"-.01em"}}>My Account</div>
        <button onClick={onPostAd} style={{background:"#fff",border:"none",borderRadius:8,padding:"8px 12px",color:"#1428A0",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)"}}>+ Post</button>
      </div>

      {/* Profile strip */}
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 16px 20px"}}>
        <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"2.5px solid rgba(255,255,255,.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#fff",flexShrink:0}}>
          {user.name?.charAt(0)?.toUpperCase()||"U"}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:17,fontWeight:700,color:"#fff",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.7)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
          <span style={{background:"rgba(255,255,255,.2)",color:"#fff",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{user.role==="seller"?"Seller":"Buyer"}</span>
          {user.is_verified&&<span style={{background:"rgba(34,197,94,.25)",color:"#86efac",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700}}>Verified</span>}
        </div>
      </div>

      {/* Stats strip — only on home */}
      {mobSection==="home"&&stats&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",background:"rgba(0,0,0,.2)",borderTop:"1px solid rgba(255,255,255,.1)"}}>
        {(user.role==="seller"
          ?[{l:"Ads",v:stats.totalListings||0},{l:"Active",v:stats.activeListings||0},{l:"Sold",v:stats.soldListings||0},{l:"Views",v:stats.totalViews||0}]
          :[{l:"Saved",v:(savedListings||[]).length||0},{l:"Wanted",v:myRequests.length||0},{l:"Alerts",v:unreadCount||0},{l:"Chats",v:threads.length||0}]
        ).map(s=>(
          <div key={s.l} style={{padding:"12px 4px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:"#fff",lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.6)",marginTop:3,fontWeight:500}}>{s.l}</div>
          </div>
        ))}
      </div>}
    </div>

    {/* ── CONTENT AREA ── */}
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 72px)"}}>

      {loading&&<div style={{textAlign:"center",padding:"60px 20px"}}><Spin s="36px"/></div>}

      {/* ── HOME SECTION ─────────────────────────────────────────────────── */}
      {!loading&&mobSection==="home"&&<>
        {/* Buyers waiting alert */}
        {user.role==="seller"&&stats?.buyersWaiting>0&&<div style={{margin:"16px 16px 0"}}>
          <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:14,padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontWeight:700,fontSize:14,color:"#C2410C",display:"flex",alignItems:"center",gap:6}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg> {stats.buyersWaiting} Buyer{stats.buyersWaiting!==1?"s":""} Waiting
              </div>
              <span style={{background:"#FED7AA",color:"#C2410C",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700}}>{stats.buyersWaiting} new</span>
            </div>
            {listings.filter(l=>l.locked_buyer_id&&!l.is_unlocked).slice(0,2).map(l=>(
              <div key={l.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderTop:"1px solid #FED7AA",gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,color:"#1A1A1A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
                  <div style={{fontSize:12,color:"#888",marginTop:2}}>Pay KSh 250 to reveal contact</div>
                </div>
                <button className="btn bp sm" style={{borderRadius:8,whiteSpace:"nowrap",fontSize:12}} onClick={()=>setShowPayModal(l)}>Reveal</button>
              </div>
            ))}
          </div>
        </div>}

        {/* Quick actions grid */}
        <div style={{padding:"16px 16px 0"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#AAAAAA",letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>Quick Actions</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {user.role==="seller"&&[
              {icon:"box",label:"My Ads",sub:`${stats?.activeListings||0} active`,action:()=>setMobSection("ads")},
              {icon:"fire",label:"Buyers",sub:`${stats?.buyersWaiting||0} waiting`,action:()=>setMobSection("ads")},
              {icon:"trophy",label:"Sold Items",sub:`${stats?.soldListings||0} sold`,action:()=>setMobSection("ads")},
              {icon:"cart",label:"Wanted Ads",sub:`${myRequests.length} active`,action:()=>setMobSection("requests")},
            ].map(a=>(
              <button key={a.label} onClick={a.action} style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"16px",textAlign:"left",cursor:"pointer",fontFamily:"var(--fn)"}}>
                <div style={{marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center"}}>{a.icon==="box"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>:a.icon==="fire"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg>:a.icon==="trophy"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5"/><path d="M17 4h3a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5"/><rect x="7" y="2" width="10" height="10" rx="1"/></svg>:a.icon==="cart"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>:a.icon==="heart"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>:a.icon==="chat"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>:a.icon==="bell"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>:null}</div>
                <div style={{fontWeight:700,fontSize:14,color:"#1A1A1A",marginBottom:2}}>{a.label}</div>
                <div style={{fontSize:12,color:"#888"}}>{a.sub}</div>
              </button>
            ))}
            {user.role==="buyer"&&[
              {icon:"heart",label:"Saved",sub:`${(savedListings||[]).length} items`,action:()=>setMobSection("ads")},
              {icon:"cart",label:"Wanted Ads",sub:`${myRequests.length} active`,action:()=>setMobSection("requests")},
              {icon:"chat",label:"Messages",sub:`${threads.length} chats`,action:()=>setMobSection("notif")},
              {icon:"bell",label:"Alerts",sub:`${unreadCount} unread`,action:()=>setMobSection("notif")},
            ].map(a=>(
              <button key={a.label} onClick={a.action} style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"16px",textAlign:"left",cursor:"pointer",fontFamily:"var(--fn)"}}>
                <div style={{marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center"}}>{a.icon==="box"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>:a.icon==="fire"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg>:a.icon==="trophy"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5"/><path d="M17 4h3a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5"/><rect x="7" y="2" width="10" height="10" rx="1"/></svg>:a.icon==="cart"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>:a.icon==="heart"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>:a.icon==="chat"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>:a.icon==="bell"?<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>:null}</div>
                <div style={{fontWeight:700,fontSize:14,color:"#1A1A1A",marginBottom:2}}>{a.label}</div>
                <div style={{fontSize:12,color:"#888"}}>{a.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent listings */}
        {user.role==="seller"&&listings.length>0&&<div style={{padding:"20px 16px 0"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"#AAAAAA",letterSpacing:".06em",textTransform:"uppercase"}}>Recent Ads</div>
            <button onClick={()=>setMobSection("ads")} style={{fontSize:13,color:"#1428A0",fontWeight:600,background:"none",border:"none",cursor:"pointer",fontFamily:"var(--fn)"}}>View all →</button>
          </div>
          {listings.slice(0,3).map(l=>{
            const photo=Array.isArray(l.photos)?l.photos.find(p=>typeof p==="string")||l.photos[0]?.url||null:null;
            return <div key={l.id} style={{background:"#fff",borderRadius:12,padding:"12px",marginBottom:8,display:"flex",gap:12,alignItems:"center",border:"1px solid #EBEBEB"}}>
              <div style={{width:52,height:52,borderRadius:8,background:"#F0F0F0",overflow:"hidden",flexShrink:0}}>
                {photo?<img src={photo} alt={l.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",opacity:.3}}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,color:"#1A1A1A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
                <div style={{fontSize:13,color:"#1428A0",fontWeight:700,marginTop:2}}>{fmtKES(l.price)}</div>
              </div>
              <div style={{flexShrink:0}}>
                <span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:700,background:l.status==="active"?"#DCFCE7":l.status==="sold"?"#F3F4F6":"#FEF9C3",color:l.status==="active"?"#16a34a":l.status==="sold"?"#888":"#CA8A04"}}>{l.status}</span>
              </div>
            </div>;
          })}
        </div>}
      </>}

      {/* ── ADS / INTERESTS SECTION ──────────────────────────────────────── */}
      {!loading&&mobSection==="ads"&&<div style={{padding:"16px"}}>
        <div style={{fontSize:16,fontWeight:700,color:"#1A1A1A",marginBottom:16}}>{user.role==="seller"?"My Ads":"Saved Items"}</div>
        {(user.role==="seller"?listings:(savedListings||[])).length===0
          ?<div style={{textAlign:"center",padding:"60px 20px",color:"#AAAAAA"}}>
              <div style={{marginBottom:12,opacity:.2}}>{user.role==="seller"?<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>:<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>}</div>
              <div style={{fontWeight:700,marginBottom:6}}>{user.role==="seller"?"No ads yet":"Nothing saved yet"}</div>
              <div style={{fontSize:13,marginBottom:20}}>{user.role==="seller"?"Post your first ad to get started":"Tap the bookmark icon on any listing to save it"}</div>
              {user.role==="seller"&&<button className="btn bp" style={{borderRadius:10}} onClick={onPostAd}>+ Post an Ad</button>}
            </div>
          :(user.role==="seller"?listings:(savedListings||[])).map(l=>{
            const photo=Array.isArray(l.photos)?l.photos.find(p=>typeof p==="string")||l.photos[0]?.url||null:null;
            return <div key={l.id} style={{background:"#fff",borderRadius:14,marginBottom:10,border:"1px solid #EBEBEB",overflow:"hidden"}}>
              <div style={{display:"flex",gap:12,padding:"12px"}}>
                <div style={{width:64,height:64,borderRadius:10,background:"#F0F0F0",overflow:"hidden",flexShrink:0}}>
                  {photo?<img src={photo} alt={l.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",opacity:.3}}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#1A1A1A",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
                  <div style={{fontSize:14,color:"#1428A0",fontWeight:700,marginBottom:4}}>{fmtKES(l.price)}</div>
                  <span style={{padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:700,background:l.status==="active"?"#DCFCE7":l.status==="sold"?"#F3F4F6":"#FEF3C7",color:l.status==="active"?"#16a34a":l.status==="sold"?"#888":"#D97706"}}>{l.status}</span>
                </div>
              </div>
              {user.role==="seller"&&<div style={{borderTop:"1px solid #F5F5F5",padding:"8px 12px",display:"flex",flexWrap:"wrap",gap:6}}>
                {l.is_unlocked&&<span style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"#DCFCE7",color:"#16a34a",display:"flex",alignItems:"center",gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Contact Revealed</span>}
                {!l.is_unlocked&&l.locked_buyer_id&&<button className="btn bp sm" style={{borderRadius:8,fontSize:11}} onClick={()=>setShowPayModal(l)}>Reveal Contact Info — KSh 250</button>}
                <button className="btn bs sm" style={{borderRadius:8,fontSize:11}} onClick={()=>setEditingListing(l)}>Edit</button>
                {l.status==="active"&&<button className="btn bs sm" style={{borderRadius:8,fontSize:11}} onClick={()=>setMarkSoldListing(l)}>Mark Sold</button>}
                <button className="btn br sm" style={{borderRadius:8,fontSize:11}} onClick={()=>deleteListing(l.id)}>Delete</button>
              </div>}
            </div>;
          })}
      </div>}

      {/* ── REQUESTS SECTION ─────────────────────────────────────────────── */}
      {!loading&&mobSection==="requests"&&<div style={{padding:"16px"}}>
        <div style={{fontSize:16,fontWeight:700,color:"#1A1A1A",marginBottom:16}}>What Buyers Want</div>
        <MyRequestsTab token={token} notify={notify} user={user}/>
      </div>}

      {/* ── INBOX SECTION (Chat + Notifications sub-tabs) ────────────────── */}
      {!loading&&mobSection==="notif"&&<div style={{display:"flex",flexDirection:"column",height:"100%"}}>
          {/* Sub-tab bar */}
          <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #E5E5E5",position:"sticky",top:0,zIndex:10}}>
            <button onClick={()=>setInboxTab("chat")} style={{flex:1,padding:"14px 0",border:"none",background:"transparent",cursor:"pointer",fontFamily:"var(--fn)",fontSize:13,fontWeight:700,color:inboxTab==="chat"?"#1428A0":"#AAAAAA",borderBottom:inboxTab==="chat"?"2.5px solid #1428A0":"2.5px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Chat{unreadMsgsMob>0&&<span style={{background:"#1428A0",color:"#fff",borderRadius:10,fontSize:9,fontWeight:700,padding:"1px 5px"}}>{unreadMsgsMob}</span>}
            </button>
            <button onClick={()=>setInboxTab("notifs")} style={{flex:1,padding:"14px 0",border:"none",background:"transparent",cursor:"pointer",fontFamily:"var(--fn)",fontSize:13,fontWeight:700,color:inboxTab==="notifs"?"#1428A0":"#AAAAAA",borderBottom:inboxTab==="notifs"?"2.5px solid #1428A0":"2.5px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              Alerts{unreadNotifsMob>0&&<span style={{background:"#1428A0",color:"#fff",borderRadius:10,fontSize:9,fontWeight:700,padding:"1px 5px"}}>{unreadNotifsMob}</span>}
            </button>
          </div>

          <div style={{padding:"16px",overflowY:"auto",flex:1}}>
            {inboxTab==="chat"&&<>
              {threads.length===0
                ?<div style={{textAlign:"center",padding:"60px 20px",color:"#AAAAAA"}}>
                    <div style={{marginBottom:12,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
                    <div style={{fontWeight:700}}>No conversations yet</div>
                  </div>
                :threads.map((t,i)=>(
                  <div key={i} onClick={()=>setSelectedListing({id:t.listing_id,title:t.title,seller_id:t.seller_id,is_unlocked:t.is_unlocked||false,locked_buyer_id:t.locked_buyer_id})}
                    style={{display:"flex",alignItems:"center",gap:12,background:parseInt(t.unread_count||0)>0?"#F0F4FF":"#fff",borderRadius:12,padding:"14px",marginBottom:8,border:`1px solid ${parseInt(t.unread_count||0)>0?"#C7D2FE":"#EBEBEB"}`,cursor:"pointer"}}>
                    <div style={{position:"relative",flexShrink:0}}>
                      <div style={{width:42,height:42,borderRadius:"50%",background:"#1428A0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",fontWeight:700}}>{t.other_party_anon?.charAt(0)?.toUpperCase()||"?"}</div>
                      {t.is_online&&<div style={{position:"absolute",bottom:0,right:0,width:11,height:11,background:"#22C55E",borderRadius:"50%",border:"2px solid #fff"}}/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:parseInt(t.unread_count||0)>0?700:600,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                      <div style={{fontSize:12,color:"#888888",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.last_message?.slice(0,40)||"No messages"}</div>
                    </div>
                    {parseInt(t.unread_count||0)>0&&<span style={{background:"#1428A0",color:"#fff",borderRadius:10,fontSize:10,fontWeight:700,padding:"2px 7px",flexShrink:0}}>{t.unread_count}</span>}
                  </div>
                ))}
            </>}

            {inboxTab==="notifs"&&<>
              {notifs.length===0
                ?<div style={{textAlign:"center",padding:"60px 20px",color:"#AAAAAA"}}>
                    <div style={{marginBottom:12,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
                    <div style={{fontWeight:700}}>All caught up!</div>
                  </div>
                :notifs.map(n=>(
                  <div key={n.id} onClick={()=>{
                    markRead(n.id);
                    if(n.type==="new_message"){
                      const data=typeof n.data==="string"?JSON.parse(n.data||"{}"):n.data||{};
                      const thread=threads.find(t=>String(t.listing_id)===String(data.listing_id));
                      if(thread){setMobSection("notif");setInboxTab("chat");setSelectedListing({id:thread.listing_id,title:thread.title,seller_id:thread.seller_id,is_unlocked:thread.is_unlocked||false,locked_buyer_id:thread.locked_buyer_id});}
                    }
                  }} style={{background:n.is_read?"#fff":"#F0F4FF",borderRadius:12,padding:"14px",marginBottom:8,border:`1px solid ${n.is_read?"#EBEBEB":"#C7D2FE"}`,cursor:"pointer"}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{flexShrink:0,display:"flex",alignItems:"center"}}>
                        {n.type==="buyer_locked_in"
                          ?<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                          :n.type==="escrow_released"||n.type==="payment_confirmed"
                          ?<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                          :n.type==="listing_approved"||n.type==="pitch_accepted"
                          ?<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a9e1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          :n.type==="listing_rejected"||n.type==="suspension"
                          ?<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          :<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1428A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
                      </span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:n.is_read?600:700,fontSize:14,color:"#1A1A1A",marginBottom:3}}>{n.title}</div>
                        <div style={{fontSize:13,color:"#636363",lineHeight:1.5}}>{n.body}</div>
                        <div style={{fontSize:11,color:"#AAAAAA",marginTop:6}}>{ago(n.created_at)}</div>
                      </div>
                      {!n.is_read&&<div style={{width:8,height:8,borderRadius:"50%",background:"#1428A0",flexShrink:0,marginTop:4}}/>}
                    </div>
                  </div>
                ))}
            </>}
          </div>
        </div>}

      {/* ── SETTINGS / ACCOUNT SECTION ───────────────────────────────────── */}
      {!loading&&mobSection==="settings"&&<div style={{padding:"16px",display:"flex",flexDirection:"column",gap:12}}>

        {/* Profile card */}
        <ProfileSection user={user} token={token} notify={notify} onUpdate={updated=>onUserUpdate&&onUserUpdate(updated)}/>

        {/* Password card */}
        <PasswordSection user={user} token={token} notify={notify}/>

        {/* Verification warning */}
        {!user.is_verified&&<VerificationSection user={user} token={token} notify={notify}/>}

        {/* Account actions */}
        <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"4px 0",overflow:"hidden"}}>
          <RoleSwitcher user={user} token={token} notify={notify} onSwitch={u=>{onUserUpdate&&onUserUpdate(u);}}/>
          <button style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"16px 18px",background:"none",border:"none",borderTop:"1px solid #F5F5F5",cursor:"pointer",fontFamily:"var(--fn)",fontSize:15,color:"#1A1A1A",textAlign:"left"}}
            onClick={()=>{localStorage.removeItem("ws_token");localStorage.removeItem("ws_user");onClose();window.location.reload();}}>
            <span><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
            <span style={{fontWeight:600}}>Sign Out</span>
            <svg style={{marginLeft:"auto"}} width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#CCCCCC" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <button style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"16px 18px",background:"none",border:"none",borderTop:"1px solid #F5F5F5",cursor:"pointer",fontFamily:"var(--fn)",fontSize:15,color:"#dc2626",textAlign:"left"}}
            onClick={async()=>{
              if(!window.confirm("Permanently delete your account? ALL your listings and data will be removed forever."))return;
              try{await api("/api/auth/account",{method:"DELETE",body:JSON.stringify({})},token);localStorage.removeItem("ws_token");localStorage.removeItem("ws_user");onClose();window.location.reload();}
              catch(err){notify(err.message,"error");}
            }}>
            <span><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></span>
            <span style={{fontWeight:600}}>Delete Account</span>
            <svg style={{marginLeft:"auto"}} width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#FFAAAA" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>}

    </div>

    {/* ── BOTTOM NAV ── */}
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #EBEBEB",display:"flex",paddingBottom:"env(safe-area-inset-bottom,0)",zIndex:100,boxShadow:"0 -2px 12px rgba(0,0,0,.06)"}}>
      {navItems.map(n=>(
        <button key={n.id} onClick={()=>setMobSection(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 4px 8px",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--fn)",color:mobSection===n.id?"#1428A0":"#AAAAAA",transition:"color .15s",position:"relative"}}>
          {n.icon}
          <span style={{fontSize:10,fontWeight:mobSection===n.id?700:500,whiteSpace:"nowrap"}}>{n.label}</span>
          {n.badge&&<span style={{position:"absolute",top:6,right:"calc(50% - 14px)",background:"#1428A0",color:"#fff",borderRadius:20,fontSize:9,fontWeight:700,padding:"1px 5px",minWidth:16,textAlign:"center"}}>{n.badge>9?"9+":n.badge}</span>}
          {mobSection===n.id&&<div style={{position:"absolute",bottom:0,left:"25%",right:"25%",height:2,background:"#1428A0",borderRadius:2}}/>}
        </button>
      ))}
    </div>

    {/* Modals */}
    {selectedListing&&<ChatModal listing={selectedListing} user={user} token={token} onClose={()=>setSelectedListing(null)} notify={notify}/>}
    {editingListing&&<PostAdModal listing={editingListing} token={token} notify={notify} onClose={()=>setEditingListing(null)} onSuccess={(updated)=>{setListings(p=>p.map(l=>l.id===updated.id?updated:l));setEditingListing(null);}}/>}
    {markSoldListing&&<MarkSoldModal listing={markSoldListing} token={token} notify={notify} onClose={()=>setMarkSoldListing(null)} onSuccess={(id,channel)=>setListings(p=>p.map(l=>l.id===id?{...l,status:"sold",sold_channel:channel}:l))}/>}
    {showPayModal&&<PayModal type="unlock" listingId={showPayModal.id} amount={Math.max(0,250-(showPayModal.unlock_discount||0))} purpose={`Reveal buyer: ${showPayModal.title}`} token={token} user={user} allowVoucher={true}
      onSuccess={async()=>{
        const lid=showPayModal.id;setShowPayModal(null);
        try{const fresh=await api(`/api/listings/${lid}`,{},token);setListings(p=>p.map(l=>l.id===lid?fresh:l));}
        catch{setListings(p=>p.map(l=>l.id===lid?{...l,is_unlocked:true}:l));}
        notify("Buyer contact revealed!","success");
      }}
      onClose={()=>setShowPayModal(null)} notify={notify}/>}
  </div>;
}


function Dashboard({user,token,notify,onPostAd,onClose,onUserUpdate,initialTab}){
  const [tab,setTab]=useState(()=>{
    // Restore from URL or prop
    const fromUrl = window.__initialDashTab;
    window.__initialDashTab = null;
    return fromUrl || initialTab || "overview";
  });
  // Sync dashboard tab to URL
  useEffect(()=>{
    const path = tab === "overview" ? "/dashboard" : `/dashboard/${tab}`;
    if(window.location.pathname !== path)
      window.history.pushState({},'',path);
  },[tab]);
  const [listings,setListings]=useState([]);
  const [buyerInterests,setBuyerInterests]=useState([]);
  const [savedListings,setSavedListings]=useState([]);
  const [myRequests,setMyRequests]=useState([]);
  const [notifs,setNotifs]=useState([]);
  const [threads,setThreads]=useState([]);
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true);
  const [selectedListing,setSelectedListing]=useState(null);
  const [showPayModal,setShowPayModal]=useState(null);
  const [editingListing,setEditingListing]=useState(null);
  const [markSoldListing,setMarkSoldListing]=useState(null);

  useEffect(()=>{
    const load=async(silent=false)=>{
      if(!silent)setLoading(true);
      try{
        const [ls,ns,th]=await Promise.all([
          user.role==="seller"?api("/api/listings/seller/mine",{},token).catch(()=>[]):Promise.resolve([]),
          api("/api/notifications",{},token).catch(()=>[]),
          api("/api/chat/threads/mine",{},token).catch(()=>[]),
        ]);
        if(user.role==="buyer"){
          api("/api/listings/buyer/interests",{},token).catch(()=>[]).then(r=>setBuyerInterests(Array.isArray(r)?r:[]));
          api("/api/listings/buyer/saved",{},token).catch(()=>[]).then(r=>setSavedListings(Array.isArray(r)?r:[]));
        }
        api("/api/requests/mine",{},token).catch(()=>[]).then(r=>setMyRequests(Array.isArray(r)?r:[]));
        const lArr=Array.isArray(ls)?ls:(ls.listings||[]);
        setListings(lArr);
        setNotifs(Array.isArray(ns)?ns:[]);
        setThreads(Array.isArray(th)?th:[]);
        setStats({
          totalListings:lArr.length,
          activeListings:lArr.filter(l=>l.status==="active").length,
          soldListings:lArr.filter(l=>l.status==="sold").length,
          totalViews:lArr.reduce((a,l)=>a+(l.view_count||0),0),
          buyersWaiting:lArr.filter(l=>l.locked_buyer_id&&!l.is_unlocked).length,
          totalRevenue:lArr.filter(l=>l.status==="sold").length*250,
          unreadNotifs:(Array.isArray(ns)?ns:[]).filter(n=>!n.is_read).length,
          unreadMessages:(Array.isArray(th)?th:[]).reduce((a,t)=>a+parseInt(t.unread_count||0),0),
        });
      }finally{if(!silent)setLoading(false);}
    };
    load(false);
    // Silent background refresh: listings+notifs every 45s, threads every 30s
    const iv=setInterval(()=>load(true),45000);
    return()=>clearInterval(iv);
  },[token]);

  const markRead=async id=>{
    await api(`/api/notifications/${id}/read`,{method:"PATCH"},token).catch(()=>{});
    setNotifs(p=>p.map(n=>n.id===id?{...n,is_read:true}:n));
  };

  const deleteListing=async id=>{
    if(!window.confirm("Delete this listing permanently?"))return;
    try{await api(`/api/listings/${id}`,{method:"DELETE"},token);setListings(p=>p.filter(l=>l.id!==id));notify("Listing deleted.","success");}
    catch(err){notify(err.message,"error");}
  };

  const unreadMsgs=threads.reduce((a,t)=>a+parseInt(t.unread_count||0),0);
  const unreadNotifs=notifs.filter(n=>!n.is_read).length;
  const unreadCount=unreadMsgs+unreadNotifs;

  // ── Mobile detection ────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(()=>typeof window!=='undefined'?window.innerWidth<768:false);
  useEffect(()=>{const check=()=>setIsMobile(window.innerWidth<768);window.addEventListener('resize',check);return()=>window.removeEventListener('resize',check);},[]);
  const [mobSection, setMobSection] = useState(()=>{const m=window.__initialMobSection||"home";window.__initialMobSection=null;return m;}); // home|ads|requests|notif|settings

  // ── MOBILE DASHBOARD ─────────────────────────────────────────────────────────
  if(isMobile) return <MobileDashboard
    user={user} token={token} notify={notify}
    listings={listings} buyerInterests={buyerInterests} savedListings={savedListings}
    myRequests={myRequests} notifs={notifs} threads={threads}
    stats={stats} loading={loading}
    unreadCount={unreadCount}
    mobSection={mobSection} setMobSection={setMobSection}
    onPostAd={onPostAd} onClose={onClose} onUserUpdate={onUserUpdate}
    setSelectedListing={setSelectedListing} selectedListing={selectedListing}
    showPayModal={showPayModal} setShowPayModal={setShowPayModal}
    editingListing={editingListing} setEditingListing={setEditingListing}
    markSoldListing={markSoldListing} setMarkSoldListing={setMarkSoldListing}
    setListings={setListings} setNotifs={setNotifs}
  />;

  return <>
    {/* Dashboard Hero Header */}
    <div style={{background:"linear-gradient(135deg,#1428A0 0%,#0F1F8A 100%)",padding:"clamp(24px,4vw,48px) clamp(16px,4vw,40px) 0",marginBottom:0}}>
      <div>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16,marginBottom:28}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.6)",marginBottom:10}}>My Account</div>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"3px solid rgba(255,255,255,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,color:"#fff",fontWeight:700,flexShrink:0}}>
                {user.name?.charAt(0)?.toUpperCase()||"U"}
              </div>
              <div>
                <h1 style={{fontSize:"clamp(22px,3vw,32px)",fontWeight:500,color:"#fff",fontFamily:"var(--fn)",marginBottom:4,letterSpacing:"-.02em"}}>{user.name}</h1>
                <div style={{fontSize:13,color:"rgba(255,255,255,.7)",marginBottom:8}}>{user.email}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <span style={{background:"rgba(255,255,255,.2)",color:"#fff",padding:"3px 12px",fontSize:11,fontWeight:700,letterSpacing:".04em"}}>{user.role==="seller"?"SELLER":"BUYER"}</span>
                  {user.is_verified&&<span style={{background:"rgba(255,255,255,.2)",color:"#fff",padding:"3px 12px",fontSize:11,fontWeight:700,letterSpacing:".04em"}}><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginRight:3}}><polyline points="20 6 9 17 4 12"/></svg> VERIFIED</span>}
                  {unreadCount>0&&<span style={{background:"#FF3B30",color:"#fff",padding:"3px 12px",fontSize:11,fontWeight:700,letterSpacing:".04em"}}>{unreadCount} UNREAD</span>}
                </div>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {user.role==="seller"&&<button className="btn bp sm" style={{background:"#fff",color:"#1428A0",border:"none",fontWeight:700}} onClick={()=>{onClose();onPostAd();}}>+ Post Ad</button>}
            <button className="btn bs sm" style={{border:"1px solid rgba(255,255,255,.4)",color:"#fff",background:"transparent"}} onClick={onClose}>Back to Home</button>
          </div>
        </div>

        {/* Tab row — flush to bottom of hero */}
        <div style={{display:"flex",gap:0,overflowX:"auto",borderBottom:"none",WebkitOverflowScrolling:"touch"}}>
          {(user.role==="seller"
            ?[["overview","Overview"],["messages","Messages"+(unreadMsgs>0?` (${unreadMsgs})`:"")] ,["notifications","Notifications"+(unreadNotifs>0?` (${unreadNotifs})`:"")] ,["ads","My Ads"],["sold","Sold"],["requests","What Buyers Want"],["reviews","Reviews"],["settings","Settings"]]
            :[["overview","Overview"],["messages","Messages"+(unreadMsgs>0?` (${unreadMsgs})`:"")] ,["notifications","Notifications"+(unreadNotifs>0?` (${unreadNotifs})`:"")] ,["saved","Saved"+(savedListings.length>0?` (${savedListings.length})`:"")],["interests","My Interests"],["pitches","Pitches Received"],["requests","What Buyers Want"],["reviews","Reviews"],["settings","Settings"]]
          ).map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:"14px 22px",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:700,letterSpacing:".04em",whiteSpace:"nowrap",color:tab===id?"#fff":"rgba(255,255,255,.55)",borderBottom:tab===id?"3px solid #fff":"3px solid transparent",transition:"all .15s",fontFamily:"var(--fn)"}}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>

    {/* Dashboard Content */}
    <div style={{padding:"clamp(20px,4vw,40px) clamp(16px,4vw,48px) 80px"}}>

    {loading&&<div style={{textAlign:"center",padding:80}}><Spin s="40px"/></div>}

    {!loading&&tab==="overview"&&stats&&<>
      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:28}}>
        {(user.role==="seller"
          ? [
              {icon:"box",label:"Total Ads",val:stats.totalListings,color:"#1428A0",bg:"#F4F4F4"},
              {icon:"check",label:"Active",val:stats.activeListings,color:"#16a34a",bg:"rgba(22,163,74,.06)"},
              {icon:"trophy",label:"Sold",val:stats.soldListings,color:"#1428A0",bg:"rgba(0,0,0,.04)"},
              {icon:"eye",label:"Total Views",val:stats.totalViews,color:"#1428A0",bg:"#F4F4F4"},
              {icon:"fire",label:"Buyers Waiting",val:stats.buyersWaiting,color:"#444444",bg:"rgba(0,0,0,.04)"},
              {icon:"chat",label:"Unread Msgs",val:stats.unreadMessages,color:"#1428A0",bg:"#F4F4F4"},
            ]
          : [
              {icon:"bell",label:"Unread",val:unreadCount||0,color:"#1428A0",bg:"#F4F4F4"},
            ]
        ).map(s=>(
          <div key={s.label} style={{background:s.bg,border:`1px solid ${s.color}22`,borderRadius:6,padding:"20px 22px",transition:"transform .15s",cursor:"default"}}
            onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}>
            <div style={{marginBottom:8,display:"flex",alignItems:"center"}}>{s.icon==="box"?<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>:s.icon==="check"?<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg>:s.icon==="trophy"?<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5"/><path d="M17 4h3a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5"/><rect x="7" y="2" width="10" height="10" rx="1"/></svg>:s.icon==="eye"?<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>:s.icon==="fire"?<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg>:s.icon==="chat"?<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>:s.icon==="bell"?<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>:null}</div>
            <div style={{fontSize:32,fontWeight:700,color:s.color,letterSpacing:"-.02em",lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:12,color:"#888888",marginTop:6,fontWeight:600,letterSpacing:".04em",textTransform:"uppercase"}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Buyers waiting — action items */}
      {stats.buyersWaiting>0&&<>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <h3 style={{fontSize:15,fontWeight:700,letterSpacing:"-.01em"}}>Action Required — Buyers Waiting</h3>
          <span className="badge bg-r">{stats.buyersWaiting} waiting</span>
        </div>
        {listings.filter(l=>l.locked_buyer_id&&!l.is_unlocked).map(l=>(
          <div key={l.id} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:"rgba(0,0,0,.04)",border:"1px solid rgba(0,0,0,.1)",borderLeft:"3px solid #888888",borderRadius:6,marginBottom:10}}>
            <span><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg></span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{l.title}</div>
              <div style={{fontSize:12,color:"#888888"}}>{l.linked_request_id?"A buyer requested this item!":"A buyer has locked in!"} Pay KSh 250 to reveal their contact details.</div>
            </div>
            <button className="btn bp sm" onClick={()=>setShowPayModal(l)}>
              {(l.unlock_discount||0)>=250?"Reveal Contact Info — FREE":l.unlock_discount>0?`Reveal Contact Info — KSh ${250-(l.unlock_discount||0)}`:"Reveal Contact Info — KSh 250"}
            </button>
          </div>
        ))}
        <div style={{height:8}}/>
      </>}

      {/* Recent listings */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <h3 style={{fontSize:15,fontWeight:700,letterSpacing:"-.01em"}}>Recent Ads</h3>
        {listings.length>4&&<button className="btn bgh sm" onClick={()=>setTab("ads")} style={{fontSize:12}}>View all →</button>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        {listings.slice(0,4).map(l=>{
          const photo=Array.isArray(l.photos)?l.photos.find(p=>typeof p==="string")||l.photos[0]?.url||null:null;
          return <div key={l.id} style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:6,overflow:"hidden",transition:"box-shadow .2s"}}
            onMouseOver={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.08)"}
            onMouseOut={e=>e.currentTarget.style.boxShadow="none"}>
            <div style={{height:120,background:"#F5F5F5",overflow:"hidden",position:"relative"}}>
              {photo?<img src={photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",opacity:.15}}><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>}
              <div style={{position:"absolute",top:8,right:8}}>
                <span className={`badge ${l.status==="active"||l.status==="locked"?"bg-g":l.status==="sold"?"bg-y":l.status==="pending_review"?"bg-b":l.status==="rejected"?"br2":"bg-m"}`} style={{fontSize:10}}>{l.status==="pending_review"?"Review":l.status==="rejected"?"Rejected":l.status}</span>
              </div>
            </div>
            <div style={{padding:"12px 14px"}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
              <div style={{fontSize:12,color:"#1428A0",fontWeight:700}}>{fmtKES(l.price)}</div>
              <div style={{fontSize:11,color:"#888888",marginTop:4}}><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> {l.view_count||0} views · <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg> {l.interest_count||0} interested</div>
            </div>
          </div>;
        })}
      </div>
      {listings.length===0&&<div style={{textAlign:"center",padding:"60px 20px",background:"#f9f9f9",border:"1px dashed #E5E5E5"}}>
        <div style={{marginBottom:12,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
        <p style={{fontWeight:700,marginBottom:8}}>No ads yet</p>
        {user.role==="seller"&&<button className="btn bp" style={{marginTop:8}} onClick={()=>{onClose();onPostAd();}}>Post Your First Ad →</button>}
      </div>}
    </>}

    {!loading&&tab==="messages"&&<>
      <h3 style={{fontSize:15,fontWeight:700,marginBottom:14,letterSpacing:"-.01em"}}>Chat Threads</h3>
      {threads.length===0&&<div style={{textAlign:"center",padding:"60px 20px",background:"#f9f9f9",border:"1px dashed #E5E5E5"}}>
        <div style={{marginBottom:12,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
        <p style={{fontWeight:700,marginBottom:6}}>No chat threads yet</p>
        <p style={{fontSize:13,color:"#888888"}}>When buyers message you about your listings, the conversations will appear here.</p>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
        {threads.map((t,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"#fff",border:`1px solid ${parseInt(t.unread_count||0)>0?"#1428A0":"#EBEBEB"}`,borderRadius:6,cursor:"pointer",transition:"border-color .15s"}}
            onMouseOver={e=>{if(parseInt(t.unread_count||0)===0)e.currentTarget.style.borderColor="#111111";}}
            onMouseOut={e=>{if(parseInt(t.unread_count||0)===0)e.currentTarget.style.borderColor="#EBEBEB";}}
            onClick={()=>setSelectedListing({id:t.listing_id,title:t.title,seller_id:t.seller_id,is_unlocked:t.is_unlocked||false,locked_buyer_id:t.locked_buyer_id})}>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"#1428A0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",fontWeight:700}}>
                {t.other_party_anon?.charAt(0)?.toUpperCase()||"?"}
              </div>
              {t.is_online&&<div style={{position:"absolute",bottom:1,right:1,width:11,height:11,background:"#22C55E",borderRadius:"50%",border:"2px solid #fff"}}/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:parseInt(t.unread_count||0)>0?700:600,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
              <div style={{fontSize:12,color:"#888888",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.last_message?.slice(0,50)||"No messages yet"}</div>
              <div style={{fontSize:11,color:"#CCCCCC",marginTop:3}}>{t.other_party_anon||"Anonymous"} · {ago(t.last_message_at)}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              {parseInt(t.unread_count||0)>0&&<div style={{background:"#1428A0",color:"#fff",borderRadius:10,fontSize:10,fontWeight:700,padding:"3px 8px",display:"inline-block"}}>{t.unread_count}</div>}
            </div>
          </div>
        ))}
      </div>
    </>}

    {!loading&&tab==="notifications"&&<>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <h3 style={{fontSize:15,fontWeight:700,letterSpacing:"-.01em"}}>Notifications</h3>
        {notifs.some(n=>!n.is_read)&&<button className="btn bs sm" style={{fontSize:11}} onClick={async()=>{await api("/api/notifications/read-all",{method:"PATCH"},token).catch(()=>{});setNotifs(p=>p.map(n=>({...n,is_read:true})));notify("All marked as read.","success");}}>Mark All Read</button>}
      </div>
      {notifs.length===0&&<div style={{textAlign:"center",padding:"60px 20px",background:"#f9f9f9",border:"1px dashed #E5E5E5"}}>
        <div style={{marginBottom:12,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div><p>No notifications yet</p>
      </div>}
      <div style={{maxWidth:680}}>
        {notifs.map((n,i)=>(
          <div key={i} onClick={()=>{
            markRead(n.id);
            if(n.type==="new_message"){
              const data=typeof n.data==="string"?JSON.parse(n.data||"{}"):n.data||{};
              const thread=threads.find(t=>String(t.listing_id)===String(data.listing_id));
              if(thread){setTab("messages");setSelectedListing({id:thread.listing_id,title:thread.title,seller_id:thread.seller_id,is_unlocked:thread.is_unlocked||false,locked_buyer_id:thread.locked_buyer_id});}
            }
          }} style={{display:"flex",gap:14,padding:"16px 0",borderBottom:"1px solid #F5F5F5",cursor:"pointer",opacity:n.is_read?.7:1,transition:"opacity .15s"}}
            onMouseOver={e=>e.currentTarget.style.paddingLeft="8px"}
            onMouseOut={e=>e.currentTarget.style.paddingLeft="0"}>
            <div style={{width:40,height:40,borderRadius:"50%",background:n.is_read?"#F5F5F5":"#E8E8E8",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {n.type==="new_message"||n.type==="seller_pitch"
                ?<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1428A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                :n.type==="buyer_locked_in"
                ?<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                :n.type==="escrow_released"||n.type==="payment_confirmed"
                ?<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                :n.type==="listing_approved"||n.type==="pitch_accepted"
                ?<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a9e1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                :n.type==="listing_rejected"||n.type==="suspension"
                ?<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                :<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1428A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:n.is_read?500:700,fontSize:14,marginBottom:2}}>{n.title}</div>
              <div style={{fontSize:13,color:"#888888",lineHeight:1.6}}>{n.body}</div>
              <div style={{fontSize:11,color:"#CCCCCC",marginTop:4}}>{ago(n.created_at)}</div>
            </div>
            {!n.is_read&&<div style={{width:8,height:8,background:"#1428A0",borderRadius:"50%",flexShrink:0,marginTop:6}}/>}
          </div>
        ))}
      </div>
    </>}

    {!loading&&tab==="saved"&&<>
      <h3 style={{fontSize:15,fontWeight:700,marginBottom:16,letterSpacing:"-.01em"}}>Saved Listings ({savedListings.length})</h3>
      {savedListings.length===0
        ?<div style={{textAlign:"center",padding:"60px 20px",background:"#f9f9f9",border:"1px dashed #E5E5E5"}}>
          <div style={{marginBottom:12,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div>
          <p style={{fontWeight:700,marginBottom:6}}>No saved listings yet</p>
          <p style={{fontSize:13,color:"#888888"}}>Tap the bookmark icon on any listing to save it for later</p>
          <button className="btn bp" style={{marginTop:14}} onClick={onClose}>Browse Listings →</button>
        </div>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:14}}>
          {savedListings.map(l=>{
            const photo=Array.isArray(l.photos)?l.photos.find(p=>typeof p==="string")||l.photos[0]?.url||null:null;
            return <div key={l.id} style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:6,overflow:"hidden",transition:"box-shadow .2s"}}
              onMouseOver={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.08)"}
              onMouseOut={e=>e.currentTarget.style.boxShadow="none"}>
              <div style={{height:140,background:"#F5F5F5",overflow:"hidden",position:"relative"}}>
                {photo?<img src={photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",opacity:.15}}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>}
                <span className={`badge ${l.status==="active"||l.status==="locked"?"bg-g":l.status==="sold"?"bg-y":"bg-m"}`} style={{position:"absolute",top:8,right:8,fontSize:10}}>{l.status}</span>
              </div>
              <div style={{padding:"14px 16px"}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
                <div style={{fontSize:14,fontWeight:700,color:"#111111",marginBottom:8}}>{fmtKES(l.price)}</div>
                {l.location&&<div style={{fontSize:11,color:"#888888",marginBottom:8}}><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> {l.location}</div>}
                <button className="btn bs sm" style={{width:"100%",fontSize:11}} onClick={()=>setSelectedListing(l)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
              </div>
            </div>;
          })}
        </div>}
    </>}

    {!loading&&tab==="interests"&&<>
      <h3 style={{fontSize:15,fontWeight:700,marginBottom:16,letterSpacing:"-.01em"}}>Listings You're Interested In ({buyerInterests.length})</h3>
      {buyerInterests.length===0
        ?<div style={{textAlign:"center",padding:"60px 20px",background:"#f9f9f9",border:"1px dashed #E5E5E5"}}>
          <div style={{marginBottom:12,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg></div>
          <p style={{fontWeight:700,marginBottom:6}}>No interests yet</p>
          <p style={{fontSize:13,color:"#888888"}}>Browse listings and click "I'm Interested — Lock In"</p>
          <button className="btn bp" style={{marginTop:14}} onClick={onClose}>Browse Listings →</button>
        </div>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:14}}>
          {buyerInterests.map(l=>{
            const photo=Array.isArray(l.photos)?l.photos.find(p=>typeof p==="string")||l.photos[0]?.url||null:null;
            return <div key={l.id} style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:6,overflow:"hidden",transition:"box-shadow .2s"}}
              onMouseOver={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.08)"}
              onMouseOut={e=>e.currentTarget.style.boxShadow="none"}>
              <div style={{height:140,background:"#F5F5F5",overflow:"hidden",position:"relative"}}>
                {photo?<img src={photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",opacity:.15}}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>}
                <span className={`badge ${l.status==="active"||l.status==="locked"?"bg-g":l.status==="sold"?"bg-y":"bg-m"}`} style={{position:"absolute",top:8,right:8,fontSize:10}}>{l.status}</span>
              </div>
              <div style={{padding:"14px 16px"}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
                <div style={{fontSize:14,fontWeight:700,color:"#111111",marginBottom:8}}>{fmtKES(l.price)}</div>
                {l.is_unlocked
                  ?<div style={{fontSize:11,color:"#16a34a",fontWeight:600,marginBottom:8}}>Contact revealed — {l.seller_name||"Seller"}</div>
                  :<div style={{fontSize:11,color:"#888888",marginBottom:8}}>Contact hidden</div>}
                <button className="btn bs sm" style={{width:"100%",fontSize:11}} onClick={()=>setSelectedListing(l)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Chat</button>
              </div>
            </div>;
          })}
        </div>}
    </>}

    {!loading&&tab==="ads"&&<>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <h3 style={{fontSize:15,fontWeight:700,letterSpacing:"-.01em"}}>Your Listings ({listings.length})</h3>
        {user.role==="seller"&&<button className="btn bp sm" onClick={()=>{onClose();onPostAd();}}>+ New Ad</button>}
      </div>
      {listings.length===0
        ?<div style={{textAlign:"center",padding:"60px 20px",background:"#f9f9f9",border:"1px dashed #E5E5E5"}}>
          <div style={{marginBottom:12,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div><p>No ads yet</p>
        </div>
        :<div style={{display:"flex",flexDirection:"column",gap:12}}>
          {listings.map(l=>(
            <div key={l.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:"#fff",border:"1px solid #EBEBEB",borderRadius:6,transition:"border-color .15s"}}
              onMouseOver={e=>e.currentTarget.style.borderColor="#111111"}
              onMouseOut={e=>e.currentTarget.style.borderColor="#EBEBEB"}>
              <div style={{width:56,height:46,borderRadius:6,background:"#F5F5F5",overflow:"hidden",flexShrink:0}}>
                {Array.isArray(l.photos)&&l.photos[0]&&<img src={typeof l.photos[0]==="string"?l.photos[0]:l.photos[0]?.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
                <div style={{fontSize:12,color:"#888888",marginTop:2}}>{fmtKES(l.price)} · <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> {l.view_count||0} · <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg> {l.interest_count||0}</div>
                {l.status==="rejected"&&l.moderation_note&&<div style={{fontSize:11,color:"#dc2626",marginTop:2}}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{display:"inline",verticalAlign:"middle"}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> {l.moderation_note}</div>}
                {l.status==="pending_review"&&<div style={{fontSize:11,color:"#111111",marginTop:2}}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Awaiting review</div>}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end",flexShrink:0}}>
                <span className={`badge ${l.status==="active"||l.status==="locked"?"bg-g":l.status==="sold"?"bg-y":l.status==="pending_review"?"bg-b":l.status==="rejected"?"br2":"bg-m"}`} style={{fontSize:10}}>{l.status==="pending_review"?"Review":l.status==="rejected"?"Rejected":l.status}</span>
                {!l.is_unlocked&&l.status!=="sold"&&(l.free_unlock_approved
                  ?<button className="btn bg2 sm" onClick={async()=>{try{await api(`/api/payments/unlock`,{method:"POST",body:JSON.stringify({listing_id:l.id,phone:user.phone||"0700000000",voucher_code:"ADMIN-FREE"})},token);setListings(p=>p.map(x=>x.id===l.id?{...x,is_unlocked:true}:x));notify("Unlocked!","success");}catch{setShowPayModal(l);}}}>Free</button>
                  :<button className="btn bp sm" onClick={()=>setShowPayModal(l)}>Reveal Contact Info — KSh 250</button>)}
                {(l.status==="active"||l.status==="locked")&&<button className="btn bp sm" onClick={()=>setMarkSoldListing(l)}>Sold</button>}
                {l.status!=="sold"&&<button className="btn bs sm" onClick={()=>setEditingListing(l)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>}
                {(l.status==="rejected"||l.status==="needs_changes")&&<button className="btn bg2 sm" onClick={async()=>{try{await api(`/api/listings/${l.id}/resubmit`,{method:"POST"},token);setListings(p=>p.map(x=>x.id===l.id?{...x,status:"pending_review",moderation_note:null}:x));notify("Resubmitted","success");}catch(e){notify(e.message,"error");}}}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>}
                <button className="btn br2 sm" onClick={()=>deleteListing(l.id)}>Close</button>
              </div>
            </div>
          ))}
        </div>}
    </>}

    {!loading&&tab==="sold"&&<SoldSection token={token} user={user}/>}
    {!loading&&tab==="reviews"&&<ReviewsSection token={token} user={user} notify={notify}/>}
    {!loading&&tab==="pitches"&&<PitchesTab token={token} notify={notify} user={user}/>}
    {!loading&&tab==="requests"&&<MyRequestsTab token={token} notify={notify} user={user}/>}

    {!loading&&tab==="settings"&&<>
      <div style={{maxWidth:560,display:"flex",flexDirection:"column",gap:20}}>

        {/* ── PROFILE INFO ──────────────────────────────────────────── */}
        <ProfileSection user={user} token={token} notify={notify} onUpdate={updated=>onUserUpdate&&onUserUpdate(updated)}/>

        {/* ── PASSWORD ──────────────────────────────────────────────── */}
        <PasswordSection user={user} token={token} notify={notify}/>

        {/* ── VERIFICATION BANNER (only if not verified) ────────────── */}
        {!user.is_verified&&<VerificationSection user={user} token={token} notify={notify}/>}

        {/* ── ACCOUNT ACTIONS ───────────────────────────────────────── */}
        <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:14,padding:"20px 22px"}}>
          <div style={{fontWeight:700,fontSize:15,color:"#1A1A1A",marginBottom:16}}>Account</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <RoleSwitcher user={user} token={token} notify={notify} onSwitch={newUser=>{onUserUpdate&&onUserUpdate(newUser);}}/>
            <button className="btn bs" style={{justifyContent:"flex-start",gap:10,borderRadius:10}} onClick={()=>{
              localStorage.removeItem("ws_token");
              localStorage.removeItem("ws_user");
              onClose();window.location.reload();
            }}>Sign Out</button>
            <button className="btn" style={{justifyContent:"flex-start",gap:10,borderRadius:10,background:"transparent",border:"1.5px solid #FFCCCC",color:"#dc2626",fontFamily:"var(--fn)",padding:"11px 16px",fontSize:14,cursor:"pointer",fontWeight:600}} onClick={async()=>{
              if(!window.confirm("Permanently delete your account? ALL your listings and data will be removed forever. This CANNOT be undone."))return;
              try{
                await api("/api/auth/account",{method:"DELETE",body:JSON.stringify({})},token);
                localStorage.removeItem("ws_token");localStorage.removeItem("ws_user");
                onClose();window.location.reload();
              }catch(err){notify(err.message,"error");}
            }}>Delete My Account</button>
          </div>
        </div>

      </div>
    </>}

        {/* Modals */}
    {selectedListing&&<ChatModal listing={selectedListing} user={user} token={token} onClose={()=>setSelectedListing(null)} notify={notify}/>}
    {editingListing&&<PostAdModal listing={editingListing} token={token} notify={notify} onClose={()=>setEditingListing(null)} onSuccess={(updated)=>{setListings(p=>p.map(l=>l.id===updated.id?updated:l));setEditingListing(null);}}/>}
    {markSoldListing&&<MarkSoldModal listing={markSoldListing} token={token} notify={notify} onClose={()=>setMarkSoldListing(null)} onSuccess={(id,channel)=>setListings(p=>p.map(l=>l.id===id?{...l,status:"sold",sold_channel:channel}:l))}/>}
    {showPayModal&&<PayModal type="unlock" listingId={showPayModal.id} amount={Math.max(0,250-(showPayModal.unlock_discount||0))} purpose={`Unlock buyer contact for: ${showPayModal.title}`} token={token} user={user} allowVoucher={true}
      onSuccess={async(result)=>{
        const lid=showPayModal.id;setShowPayModal(null);
        try{const fresh=await api(`/api/listings/${lid}`,{},token);const ul=fresh.listing||fresh;setListings(p=>p.map(l=>l.id===lid?ul:l));}
        catch{setListings(p=>p.map(l=>l.id===lid?{...l,is_unlocked:true}:l));}
        notify("Buyer contact unlocked!","success");
      }}
      onClose={()=>setShowPayModal(null)} notify={notify}/>}
    </div>
  </>;
}


// ── PITCH MODAL — Seller pitches to a buyer request ─────────────────────────

// ── PWA INSTALL BANNER ────────────────────────────────────────────────────────


// ── PAGER ─────────────────────────────────────────────────────────────────────

function Pager({total,perPage,page,onChange}){
  const tp=Math.ceil(total/perPage);if(tp<=1)return null;
  const pages=tp<=7?Array.from({length:tp},(_,i)=>i+1):[1,2,...(page>3?["..."]:[]),page-1,page,page+1,...(page<tp-2?["..."]:[]),(tp>2?tp-1:null),tp].filter((v,i,a)=>v&&v>0&&v<=tp&&a.indexOf(v)===i);
  return <div className="pg">
    <div className="pb" onClick={()=>page>1&&onChange(page-1)}>←</div>
    {pages.map((p,i)=>typeof p==="number"?<div key={i} className={`pb${p===page?" on":""}`} onClick={()=>onChange(p)}>{p}</div>:<div key={i} style={{color:"#CCCCCC",fontSize:13,padding:"0 4px"}}>…</div>)}
    <div className="pb" onClick={()=>page<tp&&onChange(page+1)}>→</div>
  </div>;
}

// ── MOBILE REQUESTS TAB ───────────────────────────────────────────────────────
// Fully self-contained — own state, no props dependency on WhatBuyersWant.
// Renders inline so there's no undefined-component crash.


export { MyRequestsTab, PitchesTab, ProfileSection, PasswordSection, VerificationSection, MobileDashboard, Dashboard, Pager };
