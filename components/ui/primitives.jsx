'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';

function WekaSokoLogo({ size = 32, iconOnly = false, light = false }) {
  const blue = light ? "#FFFFFF" : "#1428A0";
  const gold = "#C49A00";
  const textColor = light ? "#FFFFFF" : "#1428A0";
  const iconW = size * (140/90);
  const iconH = size;
  const gap = size * 0.28;

  const Monogram = () => (
    <svg width={iconW} height={iconH} viewBox="0 0 140 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:"block",flexShrink:0}}>
      {/* W — right peak meets the gold bar */}
      <path d="M8 22 L26 68 L44 22 L62 68 L80 22" stroke={blue} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/>
      {/* S — interlocked, wrapping the W's right peak */}
      <path d="M130 24 C105 16 82 26 82 40 C82 55 120 53 120 68 C120 80 102 85 80 84" stroke={blue} strokeWidth="11" strokeLinecap="round" fill="none"/>
      {/* Gold bar — sits at the W/S intersection */}
      <line x1="78" y1="10" x2="78" y2="84" stroke={gold} strokeWidth="11" strokeLinecap="round"/>
    </svg>
  );

  if (iconOnly) return <Monogram />;

  return (
    <div style={{display:"flex",alignItems:"center",gap:gap,userSelect:"none"}}>
      <Monogram />
      <span style={{
        fontSize: size * 0.72,
        fontWeight: 800,
        color: textColor,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        fontFamily: "var(--fn)"
      }}>
        WEKA <span style={{fontWeight: 400}}>SOKO</span>
      </span>
    </div>
  );
}



// ── CATEGORIES ────────────────────────────────────────────────────────────────
const TERMS = `WEKA SOKO — TERMS & CONDITIONS  (February 2026)

1. ACCEPTANCE
By using Weka Soko you agree to these Terms.

2. PLATFORM ROLE
Weka Soko is a classified advertising platform only. We are NOT party to any transaction. ALL transactions are solely between buyer and seller. Weka Soko shall NOT be liable for item quality, fraud, loss, or damage. Users transact at their own risk.

3. ESCROW SERVICE
Escrow is a convenience feature. Weka Soko is not a licensed financial institution. The 5.5% platform fee is non-refundable once payment is accepted. Dispute decisions by Weka Soko are final.

4. FEES
Contact unlock fee: KSh 250 (non-refundable). Escrow fee: 5.5% of item price. All payments to Till Number 5673935.

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

// ── API HELPER ────────────────────────────────────────────────────────────────
export async function api(path, opts={}, token=null) {
  const isForm = opts.body instanceof FormData;
  const headers = {...(token?{Authorization:`Bearer ${token}`}:{}), ...(!isForm?{"Content-Type":"application/json"}:{}), ...(opts.headers||{})};
  const res = await fetch(`${API}${path}`, {...opts, headers});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error||data.message||"Request failed");
  return data;
}

// ── SVG ICON SYSTEM ──────────────────────────────────────────────────────────
export const Ic = {
  check:    (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x:        (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  checkCircle:(s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  xCircle:  (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  warning:  (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  info:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  lock:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  unlock:   (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  eye:      (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:   (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  search:   (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  grid:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  list:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  chat:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  mail:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  camera:   (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  cart:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  tag:      (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  star:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  fire:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg>,
  shield:   (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  trophy:   (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5"/><path d="M17 4h3a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5"/><rect x="7" y="2" width="10" height="10" rx="1"/></svg>,
  phone:    (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  clock:    (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  heart:    (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  box:      (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  refresh:  (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  arrowRight:(s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  arrowLeft:(s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  chevronLeft:(s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevronRight:(s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  creditCard:(s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  document: (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  bag:      (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  inbox:    (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  bell:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  ban:      (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  gift:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  mapPin:   (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  user:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  settings: (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout:   (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  trash:    (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  edit:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  share:    (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  copy:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  image:    (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  flag:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  send:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  plus:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  minus:    (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  dollarSign:(s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  percent:  (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  zoomIn:   (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  home:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  checklist:(s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><polyline points="4 6 5 7 7 5"/><polyline points="4 12 5 13 7 11"/><polyline points="4 18 5 19 7 17"/></svg>,
  card:     (s=16,c="currentColor")=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
};

async function api(path, opts={}, token=null) {
  const isForm = opts.body instanceof FormData;
  const headers = {...(token?{Authorization:`Bearer ${token}`}:{}), ...(!isForm?{"Content-Type":"application/json"}:{}), ...(opts.headers||{})};
  const res = await fetch(`${API}${path}`, {...opts, headers});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error||data.message||"Request failed");
  return data;
}

// ── CONTACT INFO DETECTION (client-side mirror of backend moderation) ─────────
function checkContactInfo(text) {
  if (!text) return false;
  const t = String(text);
  // Raw email / @ handle / URL
  if (/[a-z0-9._%+\-]+[@＠][a-z0-9.\-]+\.[a-z]{2,}/i.test(t)) return true;
  if (/\b\w{2,}\s+at\s+\w{2,}\s+dot\s+\w{2,}\b/i.test(t)) return true;
  if (/@[a-z0-9_.]{3,}/i.test(t)) return true;
  if (/https?:\/\/|www\.[a-z0-9]+\.[a-z]{2,}/i.test(t)) return true;
  // Social media / messaging / contact hints
  if (/\b(whatsapp|whats.?app|wa\.me|telegram|t\.me|signal|viber|snapchat|snap\b|instagram|insta\b|ig\b|facebook|fb\.com|twitter|x\.com|tiktok|dm me|call me|text me|reach me|my number|my phone|my email|my namba|nipa\s+call|nipigie)\b/i.test(t)) return true;
  // Add me / find me on ...
  if (/\b(add\s+me\s+(on|at)|find\s+me\s+(on|at)|follow\s+me\s+on|my\s+(ig|snap|insta|handle|username))\b/i.test(t)) return true;
  // Strip tech spec units so "256GB 8GB RAM 1080P 4K" doesn't trigger digit checks
  const techStripped = t
    .replace(/\b\d+(\.\d+)?\s*(gb|mb|tb|kb|ghz|mhz|hz|mp|fps|px|rpm|mah|wh|mm|cm|kg|nm|hp)\b/gi, '')
    .replace(/\b(4k|8k|2k|1080p|720p|480p|2160p|4320p|1440p|960p)\b/gi, '')
    .replace(/\b\d+\s*x\s*\d+\b/gi, '');  // resolution like 2560x1440
  // Digit sequence: 10 consecutive digits with only short non-space separators
  // Only flag when digits appear close together without letter/space barriers
  if (/\d[.\-•/\\]{0,2}\d[.\-•/\\]{0,2}\d[.\-•/\\]{0,2}\d[.\-•/\\]{0,2}\d[.\-•/\\]{0,2}\d[.\-•/\\]{0,2}\d[.\-•/\\]{0,2}\d[.\-•/\\]{0,2}\d[.\-•/\\]{0,2}\d/.test(techStripped)) return true;
  // Word-to-digit conversion then Kenyan phone check
  const norm = techStripped.toLowerCase()
    .replace(/\bzero\b/g,"0").replace(/\bone\b/g,"1").replace(/\btwo\b/g,"2")
    .replace(/\bthree\b/g,"3").replace(/\bfour\b/g,"4").replace(/\bfive\b/g,"5")
    .replace(/\bsix\b/g,"6").replace(/\bseven\b/g,"7").replace(/\beight\b/g,"8")
    .replace(/\bnine\b/g,"9")
    .replace(/\bsita\b/g,"6").replace(/\bsaba\b/g,"7").replace(/\bnane\b/g,"8")
    .replace(/\btisa\b/g,"9").replace(/\bmoja\b/g,"1").replace(/\bmbili\b/g,"2")
    .replace(/\btatu\b/g,"3").replace(/\btano\b/g,"5").replace(/\bne\b/g,"4");
  const digits = norm.replace(/[^0-9]/g,"");
  if (/07\d{8}|01\d{8}|2547\d{8}|2541\d{8}/.test(digits)) return true;
  if (/0\d{9,}/.test(digits)) return true;
  if (/254\d{9}/.test(digits)) return true;
  return false;
}

// Convert VAPID base64 key to Uint8Array for PushManager.subscribe
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── AUDIO NOTIFICATION HOOK ────────────────────────────────────────────────────
// Synthesizes a premium notification chime via Web Audio API.
// No external file needed — works fully offline.
// Mobile browsers require a user gesture before audio context can be started.
// We "warm up" the context on the first click anywhere so the chime is ready.
export function useAudioNotification() {
  const ctxRef = useRef(null);
  const unlockedRef = useRef(false);

  // Warm up the AudioContext on first user interaction
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (unlockedRef.current) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        // Play a silent buffer to unlock mobile audio
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        unlockedRef.current = true;
      } catch {}
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  // Returns a function you call to play the chime
  const play = useCallback((type = 'message') => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = ctxRef.current || new AudioContext();
      if (!ctxRef.current) ctxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;

      // Note frequencies for a premium three-tone chime (major chord)
      const tones = type === 'error'
        ? [523.25, 415.30, 349.23]   // descending minor — "warning"
        : type === 'success'
        ? [523.25, 659.25, 783.99]   // C-E-G ascending — "confirmed!"
        : [783.99, 880.00, 1046.50]; // G-A-C ascending — "ding!" (message)

      tones.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        // Smooth attack + quick decay — sounds premium, not jarring
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.38);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.4);
      });
    } catch (e) {
      // Fail silently — audio is a nice-to-have, not mission-critical
    }
  }, []);

  return play;
}

// ── COMPONENTS ────────────────────────────────────────────────────────────────

function Spin({s}){return <span className="spin" style={s?{width:s,height:s}:{}}/>;}

// ── SKELETON ──────────────────────────────────────────────────────────────────
function Skeleton({w,h,r,style={}}){
  return <div className="skel" style={{width:w||"100%",height:h||14,borderRadius:r||8,...style}}/>;
}
function SkeletonCard(){
  return <div className="skel-card">
    <div className="skel" style={{width:"100%",aspectRatio:"4/3",borderRadius:"12px 12px 0 0"}}/>
    <div style={{padding:"14px 16px"}}>
      <Skeleton w="40%" h={11} style={{marginBottom:8}}/>
      <Skeleton w="85%" h={18} style={{marginBottom:8}}/>
      <Skeleton w="50%" h={24} style={{marginBottom:12}}/>
      <div style={{display:"flex",gap:8}}>
        <Skeleton w="30%" h={11}/>
        <Skeleton w="20%" h={11}/>
      </div>
    </div>
  </div>;
}
function SkeletonListRow(){
  return <div style={{display:"flex",gap:14,padding:"16px 18px",borderBottom:"1px solid #F0F0F0",background:"#fff"}}>
    <Skeleton w={92} h={84} r={12} style={{flexShrink:0}}/>
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:6,paddingTop:4}}>
      <Skeleton w="30%" h={11}/>
      <Skeleton w="80%" h={16}/>
      <Skeleton w="45%" h={20}/>
      <div style={{display:"flex",gap:8,marginTop:2}}>
        <Skeleton w="25%" h={11}/>
        <Skeleton w="15%" h={11}/>
      </div>
    </div>
  </div>;
}

// ── RIPPLE — adds tactile ripple to any button ────────────────────────────────
function useRipple(){
  const trigger=useCallback((e)=>{
    const btn=e.currentTarget;
    const rect=btn.getBoundingClientRect();
    const size=Math.max(rect.width,rect.height)*2;
    const x=e.clientX-rect.left-size/2;
    const y=e.clientY-rect.top-size/2;
    const rpl=document.createElement("span");
    rpl.className="rpl";
    rpl.style.cssText=`width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    btn.appendChild(rpl);
    setTimeout(()=>rpl.remove(),600);
  },[]);
  return trigger;
}

// ── HEART BUTTON (TikTok-style, optimistic) ───────────────────────────────────
function HeartBtn({saved,onToggle,size=20,bg="rgba(255,255,255,0.95)",style={}}){
  const [optimistic,setOptimistic]=useState(saved);
  const [popping,setPopping]=useState(false);
  const [floats,setFloats]=useState([]);
  const rpl=useRipple();

  useEffect(()=>setOptimistic(saved),[saved]);

  const tap=(e)=>{
    if(e && e.preventDefault) e.preventDefault();
    if(e && e.stopPropagation) e.stopPropagation();
    rpl(e);
    const next=!optimistic;
    setOptimistic(next);
    if(next){
      setPopping(true);
      const id=Date.now();
      setFloats(f=>[...f,id]);
      setTimeout(()=>setFloats(f=>f.filter(x=>x!==id)),700);
      setTimeout(()=>setPopping(false),400);
    }
    onToggle && onToggle(e);
  };

return <button
  className={`heart-btn btn${popping?" popping":""}`}
  onClick={tap}
  aria-label={optimistic ? "Unsave listing" : "Save listing"}
  aria-pressed={optimistic}
  style={{
      width:size*2.1,height:size*2.1,background:bg,
      boxShadow: "0 2px 10px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02)",
      borderRadius: "50%", padding: 0, border: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      ...style
    }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill={optimistic?"#E8194B":"none"} stroke={optimistic?"#E8194B":"#1A1A1A"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transition:"transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)"}}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
    {floats.map(id=><span key={id} className="heart-float">❤️</span>)}
  </button>;
}

function Toast({msg,type,onClose}){

  useEffect(()=>{const t=setTimeout(onClose,5000);return()=>clearTimeout(t);},[]);
  const c={success:"#111111",error:"#444444",warning:"#B07F10",info:"#2563EB"}[type]||"#111111";
  return <div className="toast" style={{borderLeft:`3px solid ${c}`}}><span style={{display:"flex",alignItems:"center"}}>{({success:Ic.checkCircle(18,"#1428A0"),error:Ic.xCircle(18,"#C03030"),warning:Ic.warning(18,"#8B6400"),info:Ic.info(18,"#1428A0")})[type]||Ic.info(18,"#1428A0")}</span><span>{msg}</span><button className="btn bgh sm" style={{marginLeft:"auto",padding:"2px 6px"}} onClick={onClose}>{Ic.x(14)}</button></div>;
}

function Modal({title,onClose,children,footer,large,xl}){
  const [closing,setClosing]=useState(false);
  const close=()=>{setClosing(true);setTimeout(onClose,200);};
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")close();};
    document.addEventListener("keydown",h);
    return()=>document.removeEventListener("keydown",h);
  },[]);
  return <div className={`ov${closing?" closing":""}`} onClick={e=>e.target===e.currentTarget&&close()}>
    <div className={`mod${large?" lg":""}${xl?" xl":""}${closing?" closing":""}`}>
      <div className="mh">
        <h3 style={{fontSize:17,fontWeight:700,lineHeight:1.3}}>{title}</h3>
        <button className="icon-btn" onClick={close} title="Close" aria-label="Close modal">{Ic.x(18)}</button>
      </div>
      <div className="mb mod-stagger">{children}</div>
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


// Individual exports above — WekaSokoLogo, Ic, urlBase64ToUint8Array, useAudioNotification are exported inline.
// Named exports for non-inline functions:
export { WekaSokoLogo, Spin, Skeleton, SkeletonCard, SkeletonListRow, useRipple, HeartBtn };
