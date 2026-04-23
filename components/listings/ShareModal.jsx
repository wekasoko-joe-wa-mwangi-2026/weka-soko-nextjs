'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';
import { Ic } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/core';

function ShareModal({listing,onClose}){
  const url=`https://weka-soko-nextjs.vercel.app/listings/${listing.id}`;

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
    {key:"Copy",label:copied?"Copied!":"Copy Link",bg:"#F5F5F5",action:()=>{navigator.clipboard?.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2500);}},
  ];

  return <Modal title="Share Listing" onClose={onClose}>
    <div style={{background:"#F8F8F8",borderRadius:12,padding:"14px 16px",marginBottom:20,display:"flex",gap:12,alignItems:"center",border:"1px solid #EBEBEB"}}>
      <div style={{width:42,height:42,borderRadius:10,background:"#E5E5E5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{Ic.tag(20,"#636363")}</div>
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
          onClick={()=>{if(s.action){s.action();}else{window.open(s.href,"_blank","noopener,noreferrer");}}}>
          {ICONS[s.key]}
          <span style={{fontSize:12,fontWeight:600,color:"#333"}}>{s.label}</span>
        </button>
      ))}
    </div>
    <div style={{display:"flex",gap:8,background:"#F8F8F8",borderRadius:10,padding:"10px 14px",border:"1px solid #EBEBEB",alignItems:"center"}}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round"/></svg>
      <input className="inp" value={url} readOnly style={{flex:1,fontSize:12,border:"none",background:"transparent",padding:"0",outline:"none",color:"#636363"}}/>
      <button className="btn bp sm" style={{borderRadius:8,whiteSpace:"nowrap"}} onClick={()=>{navigator.clipboard?.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2500);}}>{copied?"Copied":"Copy"}</button>
    </div>
  </Modal>;
}

// ── REAL M-PESA PAYMENT MODAL ─────────────────────────────────────────────────


export { ShareModal };
