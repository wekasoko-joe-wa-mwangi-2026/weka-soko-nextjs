'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';
import { Spin, Ic, WatermarkedImage, Lightbox } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/core';

function ChatModal({listing,user,token,onClose,notify}){
  const [messages,setMessages]=useState([]);
  const [text,setText]=useState("");
  const [loading,setLoading]=useState(true);
  const [connected,setConnected]=useState(false);
  const [typing,setTyping]=useState(false);
  const playChime=useAudioNotification();
  const [otherPresence,setOtherPresence]=useState(null);
  const [otherUserId,setOtherUserId]=useState(null);
  const socketRef=useRef(null);
  const bottomRef=useRef(null);
  const typingTimer=useRef(null);

  // Format last seen time
  const fmtPresence=p=>{
    if(!p)return null;
    if(p.is_online)return{text:"Online",color:"#111111",dot:"#22c55e"};
    if(!p.last_seen)return{text:"Offline",color:"#CCCCCC",dot:"#CCCCCC"};
    return{text:"Last seen "+ago(p.last_seen),color:"#888888",dot:"#CCCCCC"};
  };
  const presence=fmtPresence(otherPresence);

  const loadPresence=useCallback(async(msgs)=>{
    const arr=Array.isArray(msgs)?msgs:[];
    const otherId=arr.find(m=>m.sender_id!==user.id)?.sender_id;
    if(!otherId)return;
    setOtherUserId(otherId);
    try{const p=await api(`/api/chat/presence/${otherId}`,{},token);setOtherPresence(p);}catch{}
  },[user.id,token]);

  useEffect(()=>{
    // Load history
    api(`/api/chat/${listing.id}`,{},token)
      .then(msgs=>{const arr=Array.isArray(msgs)?msgs:[];setMessages(arr);loadPresence(arr);})
      .catch(()=>{})
      .finally(()=>setLoading(false));

    const socket=io(API,{auth:{token},transports:["websocket","polling"]});
    socketRef.current=socket;

    socket.on("connect",()=>{setConnected(true);socket.emit("join_listing",listing.id);});
    socket.on("disconnect",()=>setConnected(false));
    socket.on("reconnect",()=>{socket.emit("join_listing",listing.id);});

    // message_sent = server confirming OUR sent message (replace optimistic placeholder)
    socket.on("message_sent",msg=>{
      setMessages(p=>{
        const optIdx=p.map((m,i)=>({m,i})).reverse().find(({m})=>typeof m.id==="string"&&m.id.startsWith("opt-"))?.i;
        if(optIdx!=null){const next=[...p];next[optIdx]={...msg,direction:"me"};return next;}
        if(p.some(m=>m.id===msg.id))return p;
        return [...p,{...msg,direction:"me"}];
      });
    });

    // new_message = always an INCOMING message from the other party
    socket.on("new_message",msg=>{
      setMessages(p=>{
        if(p.some(m=>m.id===msg.id))return p;
        return [...p,{...msg,direction:"them"}];
      });
      setTyping(false);
      setOtherUserId(msg.sender_id);
      setOtherPresence(p=>({...p,is_online:true}));
      // Play notification sound for incoming message
      playChime('message');
    });

    socket.on("user_typing",()=>{
      setTyping(true);
      if(typingTimer.current)clearTimeout(typingTimer.current);
      typingTimer.current=setTimeout(()=>setTyping(false),3000);
    });

    socket.on("user_online",({userId})=>{
      if(userId!==user.id)setOtherPresence(p=>p?{...p,is_online:true}:p);
    });
    socket.on("user_offline",({userId,lastSeen})=>{
      if(userId!==user.id)setOtherPresence(p=>p?{...p,is_online:false,last_seen:lastSeen}:null);
    });

    socket.on("message_blocked",({reason,severity,violationCount,systemMessage})=>{
      // Show system message bubble in the chat window
      const sysMsg = {
        id:"sys-"+Date.now(),
        sender_id:"system",
        body: systemMessage || `Message blocked: ${reason}. Contact info must stay hidden until KSh 250 unlock is paid.`,
        created_at: new Date().toISOString(),
        direction: "system",
        is_system: true,
        severity,
      };
      setMessages(p=>[...p, sysMsg]);
      // Also show a toast for immediate attention
      if(severity==="suspended")notify("Your account has been suspended. Check your email.","error");
      else notify(`Message blocked (${violationCount}/3 violations)`, "warning");
    });
    socket.on("error",e=>notify(typeof e==="string"?e:"Chat error","error"));

    return()=>{socket.disconnect();if(typingTimer.current)clearTimeout(typingTimer.current);};
  },[listing.id,token]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,typing]);

  const send=()=>{
    const body=text.trim();
    if(!body||!socketRef.current||!connected)return;
    socketRef.current.emit("send_message",{listingId:listing.id,body});
    // Optimistic local message
    setMessages(p=>[...p,{id:"opt-"+Date.now(),sender_id:user.id,body,created_at:new Date().toISOString(),direction:"me"}]);
    setText("");
  };

  const onType=e=>{
    setText(e.target.value);
    if(socketRef.current&&connected)socketRef.current.emit("typing",listing.id);
  };

  return <Modal title={listing.title} onClose={onClose} large>
    {/* Presence bar */}
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,padding:"10px 14px",background:"#F5F5F5",borderRadius:6}}>
      <div style={{width:10,height:10,borderRadius:"50%",background:connected?"#111111":"#CCCCCC",flexShrink:0,boxShadow:connected?"0 0 0 3px rgba(0,0,0,.08)":"none",transition:"all .3s"}}/>
      <span style={{fontSize:12,color:"#888888"}}>{connected?"Connected":"Reconnecting..."}</span>
      {presence&&<>
        <div style={{width:1,height:14,background:"#E8E8E8"}}/>
        <div style={{width:8,height:8,borderRadius:"50%",background:presence.dot,flexShrink:0}}/>
        <span style={{fontSize:12,color:presence.color,fontWeight:500}}>{presence.text}</span>
      </>}
      <span style={{fontSize:11,color:"#CCCCCC",marginLeft:"auto"}}>Moderated</span>
    </div>

    <div className="chat-wrap">
      <div className="chat-msgs">
        {loading
          ?<div style={{textAlign:"center",padding:20}}><Spin/></div>
          :messages.length===0
            ?<div style={{textAlign:"center",padding:32,color:"#888888",fontSize:13}}>
                <div style={{marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",opacity:.3}}>{Ic.chat(40,"#DDDDDD")}</div>
                No messages yet. Start the conversation!
              </div>
            :messages.map((m,i)=>(
            <div key={m.id||i} style={{display:"flex",flexDirection:"column",alignItems:m.direction==="me"?"flex-end":"flex-start"}}>
              {m.sender_anon&&m.direction==="them"&&<div style={{fontSize:10,color:"#CCCCCC",marginBottom:3,marginLeft:4}}>{m.sender_anon}</div>}
              {m.is_system
                ?<div style={{margin:"8px auto",maxWidth:"90%",background:"#F0F0F0",border:"1px solid #CCCCCC",borderRadius:6,padding:"10px 14px",fontSize:12,lineHeight:1.6,color:"#333333",textAlign:"center"}}>{m.body}</div>
                :<div className={`chat-msg ${m.direction||"them"}${m.is_blocked?" blocked":""}`}>
                  <div>{m.is_blocked||!m.body?<em style={{opacity:.6}}>Message removed — contained contact info</em>:m.body}</div>
                  <div style={{fontSize:10,opacity:.5,marginTop:4,textAlign:m.direction==="me"?"right":"left"}}>{ago(m.created_at)}</div>
                </div>
              }
            </div>
          ))}
        {typing&&<div style={{alignSelf:"flex-start",padding:"8px 14px",background:"#FFFFFF",border:"1px solid #E8E8E8",borderRadius:"14px 14px 14px 3px",fontSize:13,color:"#888888"}}>
          <span style={{letterSpacing:2}}>•••</span>
        </div>}
        <div ref={bottomRef}/>
      </div>
      <div className="chat-input">
        <input className="inp" style={{flex:1}} placeholder={connected?"Type a message...":"Connecting..."}
          value={text} onChange={onType}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())}
          disabled={!connected}/>
        <button className="btn bp sm" onClick={send} disabled={!text.trim()||!connected}>Send </button>
      </div>
    </div>
    {!listing.is_unlocked&&<div className="alert ay" style={{marginTop:12,fontSize:12,display:"flex",alignItems:"center",gap:6}}>{Ic.lock(14,"#888")} Contact info hidden until unlocked. Phone/email in chat will be auto-blocked.</div>}
  </Modal>;
}



// ── POST AD ───────────────────────────────────────────────────────────────────


export { ChatModal };
