'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { fmtKES, ago, CATS, KENYA_COUNTIES, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';
import WatermarkedImage from './watermarked';

// ── WEKA SOKO LOGO COMPONENT ──────────────────────────────────────────────────
function WekaSokoLogo({ size = 32, iconOnly = false, light = false }) {
  const blue = light ? "#FFFFFF" : "#1428A0";
  const gold = "#C49A00";
  const textColor = light ? "#FFFFFF" : "#1428A0";
  const iconW = size * 1.35;
  const iconH = size;
  const gap = size * 0.25;

  const Monogram = () => (
    <svg width={iconW} height={iconH} viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display: "block", flexShrink: 0}}>
      {/* Stylized W */}
      <path d="M5 25L20 65L35 25L50 65L65 25" stroke={blue} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      {/* Stylized S */}
      <path d="M95 25C85 25 75 28 75 35C75 48 95 48 95 61C95 68 85 71 75 71C65 71 55 68 55 61" stroke={blue} strokeWidth="12" strokeLinecap="round" />
      {/* Gold accent */}
      <path d="M75 14V76" stroke={gold} strokeWidth="10" strokeLinecap="round" />
    </svg>
  );

  if (iconOnly) return <Monogram />;

  return (
    <div style={{display: "flex", alignItems: "center", gap: gap, userSelect: "none"}}>
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
Contact unlock fee: KSh 260 (non-refundable). Escrow fee: 5.5% of item price. All payments to Till Number 5673935.

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
    {floats.map(id=><span key={id} className="heart-float"><svg viewBox="0 0 24 24" width={16} height={16} fill="#E8194B"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>)}
  </button>;
}

function Toast({msg,type,onClose}){

  useEffect(()=>{const t=setTimeout(onClose,5000);return()=>clearTimeout(t);},[]);
  const c={success:"#111111",error:"#444444",warning:"#B07F10",info:"#2563EB"}[type]||"#111111";
  return <div className="toast" style={{borderLeft:`3px solid ${c}`}}><span style={{display:"flex",alignItems:"center"}}>{({success:Ic.checkCircle(18,"#1428A0"),error:Ic.xCircle(18,"#C03030"),warning:Ic.warning(18,"#8B6400"),info:Ic.info(18,"#1428A0")})[type]||Ic.info(18,"#1428A0")}</span><span>{msg}</span><button className="btn bgh sm" style={{marginLeft:"auto",padding:"2px 6px"}} onClick={onClose}>{Ic.x(14)}</button></div>;
}

function Modal({title,onClose,children,footer,large,xl}){
  const [closing,setClosing]=useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    // Lock body scroll when modal opens
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.classList.add('modal-open');
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-open');
    };
  }, []);
  
  const close=()=>{
    setClosing(true);
    setTimeout(() => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-open');
      onClose();
    }, 200);
  };
  
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")close();};
    document.addEventListener("keydown",h);
    return()=>document.removeEventListener("keydown",h);
  },[]);
  
  const modalContent = (
    <div className={`ov${closing?" closing":""}`} onClick={e=>e.target===e.currentTarget&&close()}>
      <div className={`mod${large?" lg":""}${xl?" xl":""}${closing?" closing":""}`}>
        <div className="mh">
          <h3 style={{fontSize:17,fontWeight:700,lineHeight:1.3}}>{title}</h3>
          <button className="icon-btn" onClick={close} title="Close">{Ic.x(18)}</button>
        </div>
        <div className="mb mod-stagger">{children}</div>
        {footer&&<div className="mf">{footer}</div>}
      </div>
    </div>
  );
  
  if (!mounted) return null;
  
  return createPortal(modalContent, document.body);
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
function compressImage(file){
  return new Promise(resolve=>{
    // Skip small files or non-images
    if(!file.type.startsWith("image/")||file.size<300*1024){resolve(file);return;}
    const canvas=document.createElement("canvas");
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      let{width,height}=img;
      const MAX=1280;
      if(width>MAX){height=Math.round(height*MAX/width);width=MAX;}
      canvas.width=width;canvas.height=height;
      canvas.getContext("2d").drawImage(img,0,0,width,height);
      canvas.toBlob(blob=>{
        const name=file.name.replace(/\.[^.]+$/,".jpg");
        resolve(new File([blob],name,{type:"image/jpeg"}));
      },"image/jpeg",0.82);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(file);};
    img.src=url;
  });
}

function ImageUploader({images,setImages}){
  const ref=useRef(null);
  const add=async files=>{
    const picked=Array.from(files).slice(0,8-images.length);
    const compressed=await Promise.all(picked.map(f=>compressImage(f)));
    const n=compressed.map(f=>({file:f,preview:URL.createObjectURL(f)}));
    setImages(p=>[...p,...n].slice(0,8));
  };
  const remove=i=>setImages(p=>{URL.revokeObjectURL(p[i].preview);return p.filter((_,j)=>j!==i);});
  return <>
    <div className="img-upload" onClick={()=>ref.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();add(e.dataTransfer.files);}}>
      <div style={{marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.camera(36,"#AAAAAA")}</div>
      <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Tap to add photos</div>
      <div style={{fontSize:12,color:"#888888"}}>Or drag & drop · up to 8 photos · First = cover</div>
      <input ref={ref} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>add(e.target.files)}/>
    </div>
    {images.length>0&&<div className="img-grid">{images.map((img,i)=>(
      <div key={i} className="img-thumb">
        <img src={img.preview} alt=""/>
        {i===0&&<div style={{position:"absolute",bottom:4,left:4,background:"#111111",color:"#fff",fontSize:9,padding:"2px 7px",borderRadius:6,fontWeight:600}}>COVER</div>}
        <button className="img-del" onClick={e=>{e.stopPropagation();remove(i);}} style={{display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.x(12)}</button>
      </div>
    ))}</div>}
  </>;
}

// ── TERMS MODAL ───────────────────────────────────────────────────────────────
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
// ── LIGHTBOX ──────────────────────────────────────────────────────────────────
function Lightbox({photos,startIdx,onClose}){
  const [idx,setIdx]=useState(startIdx||0);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    // Lock body scroll
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.classList.add('modal-open');
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-open');
    };
  }, []);
  
  const prev=()=>setIdx(i=>(i-1+photos.length)%photos.length);
  const next=()=>setIdx(i=>(i+1)%photos.length);
  
  useEffect(()=>{
    const h=e=>{if(e.key==="ArrowLeft")prev();if(e.key==="ArrowRight")next();if(e.key==="Escape"){document.body.style.overflow = '';document.body.style.paddingRight = '';document.body.classList.remove('modal-open');onClose();}};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[]);
  
  const content = (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.96)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}
    onClick={()=>{document.body.style.overflow = '';document.body.style.paddingRight = '';document.body.classList.remove('modal-open');onClose();}}>
      <button onClick={()=>{document.body.style.overflow = '';document.body.style.paddingRight = '';document.body.classList.remove('modal-open');onClose();}} style={{position:"absolute",top:16,right:20,background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:44,height:44,borderRadius:"50%",cursor:"pointer",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.x(20,"#fff")}</button>
      <div style={{position:"absolute",top:20,left:"50%",transform:"translateX(-50%)",color:"rgba(255,255,255,.7)",fontSize:13,zIndex:10}}>{idx+1} / {photos.length}</div>
      <div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",justifyContent:"center",maxWidth:"92vw",maxHeight:"82vh"}}>
        <WatermarkedImage src={photos[idx]} alt=""
        style={{maxWidth:"92vw",maxHeight:"82vh",objectFit:"contain",borderRadius:8,boxShadow:"0 8px 40px rgba(0,0,0,.6)",display:"block"}}/>
      </div>
      {photos.length>1&&<>
        <button onClick={e=>{e.stopPropagation();prev();}} style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:50,height:50,borderRadius:"50%",cursor:"pointer",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.chevronLeft(28,"#fff")}</button>
        <button onClick={e=>{e.stopPropagation();next();}} style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:50,height:50,borderRadius:"50%",cursor:"pointer",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.chevronRight(28,"#fff")}</button>
      </>}
      {photos.length>1&&<div style={{position:"absolute",bottom:20,display:"flex",gap:8,overflowX:"auto",maxWidth:"90vw",padding:"0 8px",zIndex:10,scrollbarWidth:'thin'}}>
        {photos.map((p,i)=><img key={i} src={p} alt="" onClick={e=>{e.stopPropagation();setIdx(i);}}
        style={{width:56,height:44,objectFit:"cover",borderRadius:8,cursor:"pointer",opacity:i===idx?1:.45,border:i===idx?"2px solid #fff":"2px solid transparent",flexShrink:0,transition:"opacity .2s"}}/>)}
      </div>}
    </div>
  );
  
  if (!mounted) return null;
  
  return createPortal(content, document.body);
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
      <FF label="Full Name" required><input className="inp" placeholder="Your full name" value={f.name} onChange={e=>sf("name",e.target.value)}/></FF>
      <FF label="I am a">
        <div style={{display:"flex",gap:8}}>
          {["buyer","seller"].map(r=><button key={r} className={`btn ${f.role===r?"bp":"bs"}`} style={{flex:1}} onClick={()=>sf("role",r)}>{r==="buyer"?"Buyer":"Seller"}</button>)}
        </div>
      </FF>
      <FF label="Phone (M-Pesa)" hint="Used for payment notifications"><input className="inp" placeholder="07XXXXXXXX" value={f.phone} onChange={e=>sf("phone",e.target.value)}/></FF>
    </>}
    <FF label="Email" required><input className="inp" type="email" placeholder="you@example.com" value={f.email} onChange={e=>sf("email",e.target.value)}/></FF>
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

// ── SHARE MODAL ───────────────────────────────────────────────────────────────
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

// ── REAL M-PESA PAYMENT MODAL (Now uses Paystack behind the scenes) ─────────────────────────────
function PayModal({type,listingId,pitchId,amount,purpose,token,user,onSuccess,onClose,notify,allowVoucher}){
  const [email,setEmail]=useState(user?.email||"");
  const [vcode,setVcode]=useState("");
  const [voucherInfo,setVoucherInfo]=useState(null);
  const [step,setStep]=useState("form");
  const [errMsg,setErrMsg]=useState("");
  const [paystackUrl,setPaystackUrl]=useState("");
  const [reference,setReference]=useState("");
  const [verifying,setVerifying]=useState(false);
  const pollRef=useRef(null);
  const discount=voucherInfo?.discount||voucherInfo?.discount_percent||0;
  const finalAmt=Math.max(0,Math.round(amount*(1-discount/100)));
  const saving=amount-finalAmt;

  const applyVoucher=async()=>{
    if(!vcode.trim()){notify("Enter a voucher code.","warning");return;}
    try{
      const v=await api(`/api/vouchers/${vcode.trim().toUpperCase()}`,{},token);
      setVoucherInfo(v);
      const pct=v.discount||v.discount_percent||0;
      const saved=Math.round(amount*pct/100);
      notify(`Voucher applied — ${pct}% off! You save ${fmtKES(saved)}`,`success`);
    }catch{notify("Invalid or expired voucher code.","error");setVoucherInfo(null);}
  };

  const startPayment=async()=>{
    if(finalAmt>0&&(!email||!email.includes("@"))){
      notify("Please enter a valid email address.","warning");
      return;
    }
    setStep("initializing");
    try{
      const endpoint=pitchId?`/api/pitches/${pitchId}/accept`:type==="unlock"?"/api/payments/unlock":"/api/payments/escrow";
      const body=pitchId?{email:email.trim()}:{listing_id:listingId,email:email.trim()};
      if(voucherInfo)body.voucher_code=vcode.trim().toUpperCase();
      const result=await api(endpoint,{method:"POST",body:JSON.stringify(body)},token);
      if(result.unlocked){setStep("done");setTimeout(()=>onSuccess(result),600);return;}
      
      // Open Paystack checkout in new window/tab
      setPaystackUrl(result.authorization_url);
      setReference(result.reference);
      setStep("checkout");
      
      // Open Paystack immediately
      window.open(result.authorization_url, '_blank');
      
      // Start polling for payment status
      let c=180; // 3 minutes polling
      pollRef.current=setInterval(async()=>{
        c--;
        if(c<=0){clearInterval(pollRef.current);setStep("timeout");return;}
        try{
          const s=await api(`/api/payments/status/${result.reference}`,{},token);
          if(s.status==="confirmed"){clearInterval(pollRef.current);setStep("done");setTimeout(()=>onSuccess(s),800);}
        }catch{}
      },3000);
    }catch(err){setStep("error");setErrMsg(err.message);}
  };

  const verifyManual=async()=>{
    if(pitchId){notify("Manual verification is not available for pitch payments. Please try again or contact support.","warning");return;}
    if(!reference){notify("No payment reference found. Please complete payment first.","warning");return;}
    setVerifying(true);
    try{
      const s=await api(`/api/payments/status/${reference}`,{},token);
      if(s.status==="confirmed"){
        setStep("done");
        setTimeout(()=>onSuccess(s),600);
      }else{
        notify("Payment not yet confirmed. Please complete payment on the checkout page.","warning");
      }
    }catch(err){notify(err.message,"error");}
    finally{setVerifying(false);}
  };

  useEffect(()=>()=>{if(pollRef.current)clearInterval(pollRef.current);},[]);

  const ManualVerify=()=><div style={{marginTop:14,borderTop:"1px solid #E8E8E8",paddingTop:14}}>
    <div className="lbl" style={{marginBottom:8}}>Already paid? Click to verify</div>
    <button className="btn bg2 sm" onClick={verifyManual} disabled={verifying} style={{width:"100%"}}>{verifying?<Spin/>:"I've Completed Payment — Verify"}</button>
    <p style={{fontSize:11,color:"#CCCCCC",marginTop:5}}>We check Paystack for your payment status.</p>
  </div>;

  return <Modal title={pitchId?"Reveal Seller Contact — KSh 260":type==="unlock"?"Reveal Your Contact Info To Potential Buyers— KSh 260":"Escrow Payment"} onClose={onClose}>
    {step==="form"&&<>
      {/* Option A — unlock contact (only option now) */}
      {type==="unlock"&&<div style={{marginBottom:20}}>
        <div className="pay-option featured">
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(20,40,160,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{Ic.shield(16,"#1428A0")}</div>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:"#1428A0",marginBottom:3}}>Reveal Your Contact</div>
              <div style={{fontSize:12,color:"#444444",lineHeight:1.65}}>Unlock your phone number to buyers, to let them contact you directly. One-time payment of <strong>KSh 260</strong> for this listing.</div>
            </div>
          </div>
        </div>
      </div>}

      {/* Seller safety tip — shown only on unlock */}
      {type==="unlock"&&<div style={{background:"#F8F9FF",border:"1px solid #C7D2FE",borderRadius:12,padding:"12px 14px",marginBottom:16,fontSize:12,color:"#1428A0",lineHeight:1.7}}>
        <strong style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>{Ic.shield(14)} Seller tip:</strong> Once you unlock, potential buyers will immediately see your contact details. <strong>Do not hand over the item until payment is confirmed.</strong>
      </div>}
      <div style={{background:type==="escrow"?"linear-gradient(135deg,rgba(20,40,160,.04) 0%,rgba(20,40,160,.08) 100%)":"#F8F8F8",border:type==="escrow"?"1.5px solid #C7D2FE":"1px solid #E8E8E8",borderRadius:14,padding:"20px 22px",marginBottom:20}}>
        <div style={{fontSize:11,color:"#888888",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>Till Number <strong style={{color:"var(--txt)"}}>5673935</strong> · Weka Soko{type==="escrow"&&<span className="badge" style={{background:"rgba(16,185,129,.1)",color:"#059669",fontSize:9}}>FUNDS HELD SECURE</span>}</div>
        <div style={{display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
          <div style={{fontSize:38,fontWeight:800,color:"#111111",letterSpacing:"-.02em"}}>{fmtKES(finalAmt)}</div>
          {discount>0&&<div style={{fontSize:16,color:"#CCCCCC",textDecoration:"line-through"}}>{fmtKES(amount)}</div>}
        </div>
        {discount>0&&<div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
          <span className="badge bg-g">{discount}% off</span>
          <span className="badge bg-g">You save {fmtKES(saving)}</span>
        </div>}
        <div style={{fontSize:13,color:"#888888",marginTop:7,lineHeight:1.6}}>{purpose}</div>
      </div>
      {allowVoucher&&<FF label="Voucher Code (optional)">
        <div style={{display:"flex",gap:8}}>
          <input className="inp" placeholder="e.g. WS-FREE50" value={vcode} onChange={e=>{setVcode(e.target.value);if(!e.target.value)setVoucherInfo(null);}} style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&applyVoucher()}/>
          <button className="btn bs sm" onClick={applyVoucher}>Apply</button>
        </div>
        {voucherInfo&&<div className="alert ag" style={{marginTop:8,fontSize:12,display:"flex",alignItems:"center",gap:6}}>{Ic.check(14,"#1428A0")} {voucherInfo.description||`${discount}% discount`} — Pay only {fmtKES(finalAmt)}{finalAmt===0?" (FREE!)":""}</div>}
      </FF>}
  {finalAmt===0
    ?<button className="btn bp lg" style={{width:"100%"}} onClick={startPayment}>Unlock for Free</button>
    :<>
      <FF label="Your Email" required error={!email?"Email is required":!email.includes("@")?"Enter a valid email":""}>
        <input className="inp" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} style={{borderRadius:6}}/>
      </FF>
      {/* Escrow breakdown */}
      {type==="escrow"&&(()=>{const itemPrice=Math.round(amount/1.055);const fee=amount-itemPrice;return<div style={{background:"#F0F4FF",border:"1px solid #C7D2FE",borderRadius:12,padding:"12px 14px",marginBottom:12,fontSize:13}}>
        <div style={{fontWeight:700,color:"#1428A0",marginBottom:8,fontSize:12,letterSpacing:".06em",textTransform:"uppercase"}}>Escrow Breakdown</div>
        <div style={{display:"flex",justifyContent:"space-between",color:"#444",marginBottom:4}}><span>Item price</span><span style={{fontWeight:600}}>{fmtKES(itemPrice)}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",color:"#444",marginBottom:8}}><span>Escrow fee (5.5%)</span><span style={{fontWeight:600}}>{fmtKES(fee)}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #C7D2FE",paddingTop:8,fontWeight:700,color:"#1428A0"}}><span>Total you pay</span><span>{fmtKES(amount)}</span></div>
        <div style={{fontSize:11,color:"#6366F1",marginTop:8}}>Funds held securely until you confirm receipt. The seller is paid once you confirm.</div>
      </div>;})}
      {/* Safety tip before payment */}
      <div style={{background:"#F8F8F8",border:"1px solid #E8E8E8",borderRadius:12,padding:"10px 13px",marginBottom:12,fontSize:12,color:"#333333",lineHeight:1.65}}>
        <strong style={{display:"flex",alignItems:"center",gap:6}}>{Ic.warning(14)} Security reminder:</strong> {type==="escrow"?<>This payment of <strong>{fmtKES(finalAmt)}</strong> goes to <strong>Weka Soko Till 5673935</strong> only. Funds are held in escrow — not paid directly to the seller.</>:<>This KSh 260 is paid to <strong>Weka Soko Till 5673935</strong> only. We will <strong>never</strong> ask you to send money to a seller's personal number before meeting.</>}
      </div>
  <button 
    className="btn bp lg" 
    style={{width:"100%", pointerEvents: 'auto', cursor: 'pointer'}}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      startPayment();
    }}
  >
    Send M-Pesa Request — {fmtKES(finalAmt)}
  </button>
      </>}
    </>}
    {step==="initializing"&&<div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{marginBottom:18}}><Spin s="48px"/></div>
      <h3 style={{fontWeight:700,marginBottom:8}}>Initializing Payment...</h3>
      <p style={{color:"#888888",fontSize:14}}>Please wait...</p>
    </div>}
    {step==="checkout"&&<div style={{textAlign:"center",padding:"24px 0"}}>
      <div style={{marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.shield(56,"#1428A0")}</div>
      <h3 style={{fontWeight:700,marginBottom:8}}>Complete Payment</h3>
      <p style={{color:"#888888",fontSize:14,marginBottom:16}}>A secure payment page has opened in a new tab. Please complete your payment there.</p>
      <div style={{background:"#F0F4FF",border:"1px solid #C7D2FE",borderRadius:12,padding:"16px",marginBottom:16}}>
        <div style={{fontSize:12,color:"#888888",marginBottom:4}}>Reference</div>
        <div style={{fontSize:16,fontWeight:700,color:"#1428A0",fontFamily:"monospace"}}>{reference}</div>
      </div>
      <button className="btn bp" style={{width:"100%",marginBottom:8}} onClick={()=>window.open(paystackUrl, '_blank')}>Re-open Payment Page</button>
      <ManualVerify/>
    </div>}
    {step==="timeout"&&<div style={{textAlign:"center",padding:"24px 0"}}>
      <div style={{marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.clock(56,"#C03030")}</div>
      <h3 style={{fontWeight:700,marginBottom:8}}>Still Waiting?</h3>
      <p style={{color:"#888888",fontSize:14,marginBottom:14}}>If you've completed payment, click verify below:</p>
      <ManualVerify/>
      <button className="btn bs" style={{width:"100%",marginTop:12}} onClick={()=>{setStep("form");if(pollRef.current)clearInterval(pollRef.current);}}>Try Again</button>
    </div>}
    {step==="done"&&<div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.checkCircle(56,"#1428A0")}</div>
      <h3 style={{color:"#1428A0",fontWeight:700,marginBottom:8}}>Unlocked!</h3>
      <p style={{color:"#888888",fontSize:14}}>Buyer contact details are now visible. Check your email for the receipt.</p>
    </div>}
    {step==="error"&&<div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.xCircle(56,"#C03030")}</div>
      <h3 style={{color:"#333333",fontWeight:600,marginBottom:8}}>Payment Failed</h3>
      <p style={{color:"#888888",fontSize:14,marginBottom:18}}>{errMsg}</p>
      <button className="btn bp" onClick={()=>{setStep("form");setErrMsg("");}}>Try Again</button>
    </div>}
  </Modal>;
}



// ── CHAT MODAL ────────────────────────────────────────────────────────────────
function ChatModal({listing,user,token,onClose,notify}){
  const [messages,setMessages]=useState([]);
  const [text,setText]=useState("");
  const [loading,setLoading]=useState(true);
  const [connected,setConnected]=useState(false);
  const [typing,setTyping]=useState(false);
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
        body: systemMessage || `Message blocked: ${reason}. Contact info must stay hidden until KSh 260 unlock is paid.`,
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
function PostAdModal({onClose,onSuccess,token,notify,listing=null,linkedRequest=null}){
  // linkedRequest = { id, title, category, subcat } when coming from "I Have This"
  const [step,setStep]=useState(1);
  const [showPayChoice,setShowPayChoice]=useState(false);
  const [loading,setLoading]=useState(false);
  const [images,setImages]=useState([]);
  const [createdListingId,setCreatedListingId]=useState(null);
  const [showPayModal,setShowPayModal]=useState(false);

  const [f,setF]=useState(()=>{
    if(listing) return {
      title:listing.title||"",category:listing.category||"",subcat:listing.subcat||"",
      price:String(listing.price||""),description:listing.description||"",
      reason:listing.reason_for_sale||"",location:listing.location||"",county:listing.county||""
    };
    // Pre-fill from linked buyer request ("I Have This" flow)
    return {
      title:linkedRequest?.title||"",
      category:linkedRequest?.category||"",
      subcat:linkedRequest?.subcat||"",
      price:"",description:"",reason:"",location:"",county:""
    };
  });

  const [existingPhotos,setExistingPhotos]=useState(()=>{
    if(!listing)return[];
    const ph=listing.photos||[];
    return ph.map((p,i)=>typeof p==="string"?{id:`ep-${i}`,url:p,existing:true}:{id:p.id||`ep-${i}`,url:p.url,public_id:p.public_id,existing:true});
  });

  const sf=(k,v)=>setF(p=>({...p,[k]:v}));
  const cat=CATS.find(c=>c.name===f.category);
  const [fieldErrors,setFieldErrors]=useState({});

  const submitListing=async(payNow)=>{
    if(!f.reason.trim()||!f.location.trim()){notify("Please fill in all required fields.","warning");return;}
    const errs={};
    [["title",f.title],["description",f.description],["reason",f.reason],["location",f.location]]
      .forEach(([k,v])=>{if(v&&checkContactInfo(v))errs[k]="Cannot contain phone numbers, emails, or social handles";});
    if(Object.keys(errs).length){setFieldErrors(errs);notify("Remove contact info from flagged fields","warning");return;}
    setFieldErrors({});
    setLoading(true);
    try{
      const isEdit=!!listing;
      const fd=new FormData();
      Object.entries({title:f.title,category:f.category,price:f.price,description:f.description,
        reason_for_sale:f.reason,location:f.location,county:f.county}).forEach(([k,v])=>v&&fd.append(k,v));
      if(f.subcat)fd.append("subcat",f.subcat);
      if(linkedRequest?.id)fd.append("linked_request_id",linkedRequest.id);
      fd.append("is_contact_public","false");
      // Always include photos in the same request (POST or PATCH) so they're
      // never silently lost if a background call fails.
      images.forEach(img=>img.file&&fd.append("photos",img.file));
      const url=isEdit?`/api/listings/${listing.id}`:"/api/listings";
      const method=isEdit?"PATCH":"POST";
      const result=await api(url,{method,body:fd},token);
      if(isEdit){onSuccess(result, true);onClose();notify("Ad updated!","success");return;}

      const lid=result.id||result.listing?.id;
      setCreatedListingId(lid);
      setShowPayChoice(true);
    }catch(err){
      if(err.violations){
        notify(`Contact info detected — ${err.violations.map(v=>`${v.field}: ${v.reason}`).join(" | ")}`, "error");
      } else {
        notify(err.message||"Failed to save ad","error");
      }
    }
    finally{setLoading(false);}
  };

  const isLinked=!!linkedRequest;
  const modalTitle=listing?`Edit Ad — Step ${step}/2`:isLinked?`Respond to Request — Step ${step}/2`:`Post Ad — Step ${step}/2`;

  return <Modal title={modalTitle} onClose={onClose} footer={
    <div style={{display:"flex",gap:8,width:"100%"}}>
      {step===2&&<button className="btn bs" onClick={()=>setStep(1)} style={{display:"flex",alignItems:"center",gap:4}}>{Ic.chevronLeft(15)} Back</button>}
      <div style={{flex:1}}/>
      {step===1&&<button className="btn bp" onClick={()=>{
        const missing=[];
        if(!f.title.trim())missing.push("title");
        if(!f.category)missing.push("category");
        if(!f.price)missing.push("price");
        if(!f.description.trim())missing.push("description");
        if(missing.length){notify(`Please fill in: ${missing.join(", ")}`, "warning");return;}
        setStep(2);
      }} style={{display:"flex",alignItems:"center",gap:4}}>Continue {Ic.chevronRight(15)}</button>}
      {step===2&&!listing&&<button className="btn bp" onClick={()=>submitListing(false)} disabled={loading}>
        {loading?<Spin/>:"Submit Ad →"}
      </button>}
      {step===2&&listing&&<button className="btn bp" onClick={()=>submitListing(false)} disabled={loading}>
        {loading?<Spin/>:"Save Changes"}
      </button>}
    </div>
  }>
    {/* Linked request banner */}
    {isLinked&&<div style={{background:"#EEF2FF",border:"1px solid #C7D2FE",borderRadius:10,padding:"12px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"flex-start"}}>
      <span><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span>
      <div>
        <div style={{fontWeight:700,fontSize:13,color:"#1428A0",marginBottom:2}}>Responding to buyer request</div>
        <div style={{fontSize:13,color:"#3730A3"}}>{linkedRequest.title}{linkedRequest.category?` · ${linkedRequest.category}`:""}</div>
      </div>
    </div>}

    <div className="alert ag" style={{marginBottom:16,fontSize:12}}>Posting is free. Your ad goes to admin review first — you'll be notified when it's live. KSh 260 to reveal buyer contact.</div>

    {step===1&&<>
      <FF label="Item Title" required>
        <input className="inp" placeholder="e.g. iPhone 14 Pro 256GB" value={f.title}
          onChange={e=>{sf("title",e.target.value);setFieldErrors(p=>({...p,title:undefined}));}}/>
        {fieldErrors.title&&<div style={{color:"#dc2626",fontSize:11,marginTop:3}}>{fieldErrors.title}</div>}
      </FF>
      <FF label="Category" required>
        <select className="inp" value={f.category} onChange={e=>{sf("category",e.target.value);sf("subcat","");}}>
          <option value="">Select category...</option>
          {CATS.map(c=><option key={c.name}>{c.name}</option>)}
        </select>
      </FF>
      {cat&&<FF label="Subcategory">
        <select className="inp" value={f.subcat} onChange={e=>sf("subcat",e.target.value)}>
          <option value="">Select subcategory...</option>
          {cat.sub.map(s=><option key={s}>{s}</option>)}
        </select>
      </FF>}
      <FF label="Price (KSh)" required>
        <input className="inp" type="number" placeholder="5000" value={f.price} onChange={e=>sf("price",e.target.value)} min={1}/>
      </FF>
      <FF label="Description" required hint="Condition, what's included, any defects...">
        <textarea className="inp" placeholder="Excellent condition, barely used..." value={f.description}
          onChange={e=>{sf("description",e.target.value);setFieldErrors(p=>({...p,description:undefined}));}}/>
        {fieldErrors.description&&<div style={{color:"#dc2626",fontSize:11,marginTop:3}}><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> {fieldErrors.description}</div>}
      </FF>
      <FF label={listing?"Photos — click × to remove, or add more below":"Photos (up to 8 — first is cover)"}>
        {existingPhotos.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
          {existingPhotos.map((p,i)=><div key={p.id||i} style={{position:"relative",width:70,height:55,borderRadius:6,overflow:"hidden",flexShrink:0}}>
            <img src={p.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <button onClick={()=>{
              if(listing&&p.id&&!p.id.startsWith("ep-"))
                api(`/api/listings/${listing.id}/photos/${p.id}`,{method:"DELETE"},token).catch(()=>{});
              setExistingPhotos(prev=>prev.filter((_,j)=>j!==i));
            }} style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,.7)",color:"#fff",border:"none",borderRadius:"50%",width:18,height:18,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>×</button>
          </div>)}
        </div>}
        <ImageUploader images={images} setImages={setImages}/>
      </FF>
    </>}

    {step===2&&<>
      <FF label="Reason for Selling" required>
        <input className="inp" placeholder="e.g. Upgrading to newer model" value={f.reason} onChange={e=>sf("reason",e.target.value)}/>
      </FF>
      <FF label="Collection Location" required hint="General area e.g. Westlands, Nairobi — exact address shared after unlock.">
        <input className="inp" placeholder="e.g. Westlands, Nairobi" value={f.location} onChange={e=>sf("location",e.target.value)}/>
      </FF>
      <FF label="County">
        <select className="inp" value={f.county} onChange={e=>sf("county",e.target.value)}>
          <option value="">Select county...</option>
          {["Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Thika","Kiambu","Machakos","Kajiado","Murang'a","Nyeri","Meru","Embu","Kirinyaga","Nyandarua","Laikipia","Baringo","Nandi","Uasin Gishu","Trans Nzoia","Elgeyo Marakwet","West Pokot","Turkana","Samburu","Isiolo","Marsabit","Mandera","Wajir","Garissa","Tana River","Lamu","Taita Taveta","Kilifi","Kwale","Vihiga","Bungoma","Busia","Kakamega","Siaya","Homabay","Migori","Kisii","Nyamira"].map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </FF>

      {/* How it works — simple, honest explanation */}
      {!listing&&<div style={{marginTop:8,padding:"16px",background:"#F0F4FF",border:"1px solid #C7D2FE",borderRadius:12}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            ["1","Your ad goes live after a quick review (usually under 1 hour)."],
            ["2","When a serious buyer locks in, you get a notification + email."],
            ["3","Pay KSh 260 via M-Pesa to reveal their contact. That's it."],
          ].map(([n,txt])=><div key={n} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:"#1428A0",color:"#fff",fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{n}</div>
            <div style={{fontSize:13,color:"#3730A3",lineHeight:1.5,paddingTop:2}}>{txt}</div>
          </div>)}
        </div>
      </div>}


    </>}

      {/* Pay Now or Pay Later choice */}
      {showPayChoice&&!listing&&<div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget)setShowPayChoice(false);}}>
        <div style={{background:"#FFFFFF",borderRadius:16,padding:32,maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 25px 50px -12px rgba(0,0,0,.5)"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1428A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{fontWeight:700,fontSize:22,marginBottom:8,color:"#111111"}}>Ad Submitted!</div>
          <div style={{color:"#636363",fontSize:15,marginBottom:28,lineHeight:1.6}}>Your ad is under review. Would you like to pay now to reveal buyer contact instantly, or pay later from your dashboard?</div>
          
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button className="btn bp" style={{padding:"16px 24px",borderRadius:12,fontSize:15,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:10}} onClick={()=>{setShowPayChoice(false);setShowPayModal(true);}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Pay Now — KSh 260
            </button>
            <button className="btn bs" style={{padding:"16px 24px",borderRadius:12,fontSize:15,fontWeight:600}} onClick={()=>{setShowPayChoice(false);onSuccess({id:createdListingId,...f});onClose();notify("Ad submitted! Pay KSh 260 from your dashboard to reveal buyer contact.","success");}}>
              Pay Later from Dashboard
            </button>
          </div>
          
          <div style={{marginTop:20,fontSize:13,color:"#888888",lineHeight:1.5}}>
            You'll be notified when your ad goes live. Unlocking now reveals buyer contact instantly.
          </div>
        </div>
      </div>}

      {/* M-Pesa payment after listing is created */}
      {showPayModal&&createdListingId&&<PayModal
        type="unlock" listingId={createdListingId} amount={260}
        purpose={`Reveal buyer contact for: ${f.title}`}
      token={token} user={{}} allowVoucher={true}
      onSuccess={async()=>{
        setShowPayModal(false);
        onSuccess({id:createdListingId,...f});
        onClose();
        notify("Ad under review — you'll be notified when it's live. Buyer contact will be revealed on approval.","info");
      }}
      onClose={()=>{
        // Payment failed/cancelled → listing stays in Pay Later state
        setShowPayModal(false);
        onSuccess({id:createdListingId,...f});
        onClose();
        notify("Ad submitted for review. Pay KSh 260 from your dashboard to reveal buyer contact once live.","info");
      }}
      notify={notify}
    />}
  </Modal>;
}

// ── SKELETONS ────────────────────────────────────────────────────────────────
function ListingCardSkeleton({listView}){
  return <div className={`skel-card ${listView?"lcard-list":""}`} style={{display:listView?"flex":"block", borderRadius:18, overflow:"hidden", background:"#fff", border:"1px solid #EBEBEB"}}>
    <div className="skel skel-img" style={{width:listView?200:"100%", height:listView?160:200, borderRadius:0}}/>
    <div style={{padding:20, flex:1, display:"flex", flexDirection:"column", gap:10}}>
      <div className="skel" style={{width:"30%", height:10, borderRadius:4}}/>
      <div className="skel" style={{width:"80%", height:20, borderRadius:6}}/>
      <div className="skel" style={{width:"50%", height:24, borderRadius:6, marginTop:4}}/>
      <div style={{marginTop:"auto", paddingTop:14, borderTop:"1px solid #F0F0F0", display:"flex", gap:12}}>
        <div className="skel" style={{width:60, height:12, borderRadius:4}}/>
        <div className="skel" style={{width:40, height:12, borderRadius:4}}/>
      </div>
    </div>
  </div>;
}

function HeroSkeleton(){
  return <div className="skel-card" style={{minHeight:420, borderRadius:24, overflow:"hidden", position:"relative", background:"#fff"}}>
    <div className="skel" style={{position:"absolute", inset:0, opacity:0.1}}/>
    <div style={{position:"relative", padding:"60px 50px", maxWidth:600}}>
      <div className="skel" style={{width:200, height:24, borderRadius:20, marginBottom:20}}/>
      <div className="skel" style={{width:"100%", height:48, borderRadius:12, marginBottom:20}}/>
      <div className="skel" style={{width:"80%", height:48, borderRadius:12, marginBottom:30}}/>
      <div className="skel" style={{width:"60%", height:60, borderRadius:12}}/>
    </div>
  </div>;
}

// ── LISTING CARD ──────────────────────────────────────────────────────────────

function ListingCard({listing:l,onClick,listView,isSaved,onSave}){
  const photos=Array.isArray(l.photos)?l.photos.map(p=>typeof p==="string"?p:p?.url).filter(Boolean):[];
  const photo=photos[0]||null;
  const photoCount=photos.length;
  const isNew=Date.now()-new Date(l.created_at)<12*3600000&&l.status!=="sold";
  const ripple=useRipple();

  return <div className={`lcard depth-float${listView?" lcard-list":""}`} 
    onClick={e=>{ripple(e);onClick&&onClick();}}
    style={{
      borderRadius: 18,
      background: "#fff",
      border: "1px solid rgba(0,0,0,0.04)",
      overflow: "hidden",
      position: "relative",
      transition: "all 0.5s cubic-bezier(0.23, 1, 0.32, 1)"
    }}>

    <div className="lthumb">
      {photo
        ?<WatermarkedImage src={photo} alt={l.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
        :CAT_PHOTOS[l.category]
          ?<div style={{width:"100%",height:"100%",position:"relative",overflow:"hidden",background:"#F0F0F0"}}>
              <img src={CAT_PHOTOS[l.category]} alt={l.category} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.22,filter:"grayscale(30%)"}}/>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span className="glass" style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#333",padding:"6px 14px",borderRadius:20}}>{l.category}</span>
              </div>
            </div>
          :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#F5F5F5"}}>
              <span style={{fontSize:11,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"#AAAAAA"}}>{l.category||"No Photo"}</span>
            </div>
      }
      {l.status==="sold"&&<div className="sold-badge">SOLD</div>}
      {isNew&&<div style={{position:"absolute",top:12,left:12,background:"#10b981",color:"#fff",fontSize:9,fontWeight:900,padding:"4px 10px",borderRadius:6,letterSpacing:".08em",textTransform:"uppercase",boxShadow:"0 4px 12px rgba(16,185,129,0.3)"}}>NEW</div>}
      {onSave&&<HeartBtn saved={isSaved} onToggle={onSave} size={16} style={{position: 'absolute', top: 10, right: 10}}/>}
    </div>
    <div style={{padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8}}>
      <div style={{fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#AEAEB2', marginBottom: 2}}>{l.category}</div>
      <h4 style={{fontSize: 16, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.015em', color: '#111', margin: 0}}>{l.title}</h4>
      <div style={{fontSize: 22, fontWeight: 900, color: 'var(--a)', letterSpacing: '-0.02em', margin: '4px 0'}}>{fmtKES(l.price)}</div>
      
      {listView&&l.description&&<p style={{fontSize: 14, color: '#6B6B7B', lineHeight: 1.75, margin: '4px 0 12px'}}>{l.description.slice(0, 140)}…</p>}
      
      <div style={{display: 'flex', gap: 12, color: '#6B6B7B', fontSize: 11, flexWrap: 'wrap', borderTop: '1px solid #F0F0F5', paddingTop: 14, marginTop: 'auto', lineHeight: 1.4, fontWeight: 600}}>
        {l.location&&<span style={{display: 'flex', alignItems: 'center', gap: 3}}>{Ic.mapPin(12, '#AEAEB2')} {l.location}</span>}
        <span style={{display: 'flex', alignItems: 'center', gap: 3}}>{Ic.eye(12, '#AEAEB2')} {l.view_count||0}</span>
        {l.interest_count>0&&<span style={{color: '#E8194B', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#E8194B" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {l.interest_count} Interested
        </span>}
        <span style={{marginLeft: 'auto', color: '#AEAEB2', fontWeight: 500}}>{ago(l.created_at)}</span>
      </div>
    </div>
  </div>;
}


// ── DETAIL MODAL ──────────────────────────────────────────────────────────────
// ── LEAVE REVIEW BUTTON ──────────────────────────────────────────────────────
function LeaveReviewBtn({listing,user,token,notify}){
  const [open,setOpen]=useState(false);
  const [rating,setRating]=useState(0);
  const [comment,setComment]=useState("");
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);

  const submit=async()=>{
    if(!rating){notify("Please select a rating","warning");return;}
    setLoading(true);
    try{
      await api(`/api/reviews/${listing.id}`,{method:"POST",body:JSON.stringify({rating,comment})},token);
      setDone(true);
      notify("Review submitted!","success");
      setTimeout(()=>setOpen(false),2000);
    }catch(e){notify(e.message||"Failed to submit","error");}
    finally{setLoading(false);}
  };

  const isSeller=listing.seller_id===user?.id;
  const label=isSeller?"Review Buyer":"Review Seller";

  if(!open)return<button className="btn bs sm" onClick={()=>setOpen(true)}>{label}</button>;

  return<div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
    <div style={{background:"#FFFFFF",borderRadius:6,padding:24,maxWidth:380,width:"100%"}}>
      <div style={{fontWeight:700,fontSize:17,marginBottom:4}}>{label}</div>
      <div style={{color:"#888888",fontSize:13,marginBottom:16}}>
        {isSeller?"How was the buyer? Did the transaction go smoothly?":"How was the seller? Was the item as described?"}
      </div>
      {done?<div style={{textAlign:"center",padding:"20px 0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
        <div style={{fontWeight:600,marginTop:8}}>Review submitted!</div>
      </div>:<>
        <div style={{display:"flex",gap:8,marginBottom:16,justifyContent:"center"}}>
          {[1,2,3,4,5].map(i=><span key={i} onClick={()=>setRating(i)} style={{cursor:"pointer",color:i<=rating?"#111111":"#E0E0E0",userSelect:"none",transition:"color .1s"}}><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>)}
        </div>
        {rating>0&&<div style={{textAlign:"center",fontSize:13,color:"#888888",marginBottom:12}}>
          {["","Poor","Fair","Good","Very Good","Excellent"][rating]}
        </div>}
        <textarea className="inp" rows={3} placeholder="Share your experience (optional)..." value={comment} onChange={e=>setComment(e.target.value)} style={{marginBottom:14,resize:"vertical"}}/>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bs" style={{flex:1}} onClick={()=>setOpen(false)}>Cancel</button>
          <button className="btn bp" style={{flex:1}} onClick={submit} disabled={loading||!rating}>{loading?<Spin/>:"Submit Review"}</button>
        </div>
      </>}
    </div>
  </div>;
}

// ── REPORT LISTING BUTTON ────────────────────────────────────────────────────
const REPORT_REASONS = [
  {value:"scam",label:"Scam / Fraud"},
  {value:"fake_item",label:"Fake or misleading item"},
  {value:"wrong_price",label:"Wrong price"},
  {value:"offensive",label:"Offensive content"},
  {value:"spam",label:"Spam"},
  {value:"wrong_category",label:"Wrong category"},
  {value:"already_sold",label:"Item already sold"},
  {value:"other",label:"Other"},
];
function ReportListingBtn({listingId,token,notify}){
  const [open,setOpen]=useState(false);
  const [reason,setReason]=useState("");
  const [details,setDetails]=useState("");
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);

  const submit=async()=>{
    if(!reason){notify("Please select a reason","warning");return;}
    setLoading(true);
    try{
      await api(`/api/listings/${listingId}/report`,{method:"POST",body:JSON.stringify({reason,details})},token);
      setDone(true);
      setTimeout(()=>setOpen(false),2000);
    }catch(e){notify(e.message||"Report failed","error");}
    finally{setLoading(false);}
  };

  if(!open)return <button className="btn" style={{fontSize:12,color:"#C03030",border:"1px solid #C03030",background:"transparent",padding:"6px 12px",borderRadius:6,fontWeight:600,display:"flex",alignItems:"center",gap:4}} onClick={()=>setOpen(true)}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 5-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-5 1-5 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Report</button>;

  const modalContent = (
    <div style={{position:"fixed",inset:0,zIndex:99999,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
      <div style={{background:"#FFFFFF",borderRadius:12,padding:28,maxWidth:420,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 25px 50px -12px rgba(0,0,0,.5)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C03030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 5-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-5 1-5 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          <div style={{fontWeight:700,fontSize:18,color:"#111111"}}>Report this listing</div>
        </div>
        <div style={{color:"#636363",fontSize:14,marginBottom:20,lineHeight:1.5}}>Help us keep Weka Soko safe. Reports are anonymous and reviewed by our team.</div>
        {done?<div style={{textAlign:"center",padding:"30px 0"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:"#22c55e",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div style={{fontWeight:700,fontSize:16,color:"#111111",marginBottom:6}}>Report submitted</div>
          <div style={{color:"#636363",fontSize:14}}>Our team will review it shortly.</div>
        </div>:<>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
          {REPORT_REASONS.map(r=><label key={r.value} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:10,border:`2px solid ${reason===r.value?"#1428A0":"#E0E0E0"}`,cursor:"pointer",background:reason===r.value?"#F0F4FF":"transparent",fontSize:14,transition:"all .15s"}}>
            <input type="radio" name="report_reason" value={r.value} checked={reason===r.value} onChange={()=>setReason(r.value)} style={{accentColor:"#1428A0",width:18,height:18}}/>
            <span style={{fontWeight:reason===r.value?600:400,color:reason===r.value?"#1428A0":"#333333"}}>{r.label}</span>
          </label>)}
        </div>
        <textarea className="inp" rows={3} placeholder="Additional details (optional)..." value={details} onChange={e=>setDetails(e.target.value)} style={{marginBottom:20,resize:"vertical",borderRadius:10,minHeight:80}}/>
        <div style={{display:"flex",gap:12}}>
          <button className="btn bs" style={{flex:1,padding:"12px 20px",borderRadius:10}} onClick={()=>setOpen(false)}>Cancel</button>
          <button className="btn bp" style={{flex:1,padding:"12px 20px",borderRadius:10,background:"#C03030",borderColor:"#C03030"}} onClick={submit} disabled={loading}>{loading?<Spin/>:"Submit Report"}</button>
        </div>
        </>}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}



function DetailModal({listing:l,user,token,onClose,onShare,onChat,onLockIn,onUnlock,onEscrow,notify,isSaved,onSave,onSignIn}){
  const isSeller=user?.id===l.seller_id;
  const isBuyer=user?.id===l.locked_buyer_id;
  const photos=Array.isArray(l.photos)?l.photos.map(p=>typeof p==="string"?p:p?.url).filter(Boolean):[];
  const [mainPhoto,setMainPhoto]=useState(photos[0]||null);
  const [lightbox,setLightbox]=useState(null); // {photos, idx}
  const escrowFee=Math.round(Number(l.price)*0.055);
  const photoIdxRef=useRef(0);
  useEffect(()=>{
    if(photos.length<=1) return;
    const id=setInterval(()=>{
      photoIdxRef.current=(photoIdxRef.current+1)%photos.length;
      setMainPhoto(photos[photoIdxRef.current]);
    },3000);
    return()=>clearInterval(id);
  },[]);

  return <Modal title={l.title} onClose={onClose} large footer={
    <div style={{width:"100%",display:"flex",gap:8,flexWrap:"wrap"}}>
      <button className="btn" style={{fontSize:13,color:"#1428A0",border:"1.5px solid #1428A0",background:"#fff",padding:"8px 16px",borderRadius:8,fontWeight:600,display:"flex",alignItems:"center",gap:6,boxShadow:"0 1px 3px rgba(0,0,0,.08)"}} onClick={onShare}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share</button>
      {user&&onSave&&<HeartBtn saved={isSaved} onToggle={onSave} size={15} bg="transparent" style={{boxShadow:"none",border:"1.5px solid #E0E0E0",borderRadius:8,width:"auto",height:"auto",padding:"6px 12px",gap:5,display:"flex",fontSize:13,fontWeight:700,color:"#636363"}}/>}
      {user&&!isSeller&&<button className="btn bs sm" onClick={onChat}>Chat with Seller</button>}
      {isSeller&&<button className="btn bs sm" onClick={onChat}>View Messages</button>}
      {!isSeller&&l.status==="active"&&!l.locked_buyer_id&&user&&<button className="btn bg2 sm" onClick={onLockIn}>I'm Interested — Lock In</button>}
      {!isSeller&&l.status==="active"&&user&&<button className="btn bs sm" onClick={onEscrow}>Buy with Escrow</button>}
      {isSeller&&l.locked_buyer_id&&!l.is_unlocked&&<button className="btn bp" style={{flex:1}} onClick={onUnlock}>Pay KSh 260 to See Buyer Contact</button>}
      {!user&&<button className="btn bp" onClick={()=>onSignIn&&onSignIn()}>Sign In to Contact Seller</button>}
    </div>
  }>
    {/* Photos */}
    <div style={{background:"#F5F5F5",borderRadius:6,aspectRatio:"16/9",overflow:"hidden",marginBottom:10,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
      {mainPhoto
        ?<WatermarkedImage src={mainPhoto} alt={l.title}
            style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
            onClick={()=>setLightbox({photos,idx:photos.indexOf(mainPhoto)<0?0:photos.indexOf(mainPhoto)})}/>
        :CAT_PHOTOS[l.category]
          ?<><img src={CAT_PHOTOS[l.category]} alt={l.category} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.2,filter:"grayscale(30%)",position:"absolute",inset:0}}/><span style={{position:"relative",fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#888888",background:"rgba(255,255,255,.85)",padding:"6px 16px",borderRadius:20}}>No photos uploaded</span></>
          :<span style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA"}}>No photos uploaded</span>}
      {/* Zoom hint */}
      {mainPhoto&&<div style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,.45)",color:"#fff",fontSize:11,padding:"4px 10px",borderRadius:80,pointerEvents:"none"}}>Click to enlarge</div>}
      {l.status==="sold"&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}><div style={{background:"#111111",color:"#fff",padding:"8px 28px",borderRadius:6,fontWeight:600,fontSize:18,letterSpacing:".08em"}}>SOLD</div></div>}
    </div>
    {photos.length>1&&<div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto"}}>
      {photos.map((p,i)=><img key={i} src={p} alt="" onClick={()=>setMainPhoto(p)} style={{width:70,height:55,objectFit:"cover",borderRadius:6,cursor:"pointer",opacity:mainPhoto===p?1:.55,border:mainPhoto===p?"2px solid #111111":"2px solid transparent",flexShrink:0}}/>)}
    </div>}
    {lightbox&&<Lightbox photos={lightbox.photos} startIdx={lightbox.idx} onClose={()=>setLightbox(null)}/>}

    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
      <div>
        <div style={{fontSize:32,fontWeight:600,color:"#1428A0",fontFamily:"var(--fn)"}}>{fmtKES(l.price)}</div>
        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
          <span className="badge bg-m">{l.category}</span>
          {l.subcat&&<span className="badge bg-m">{l.subcat}</span>}
        </div>
      </div>
      <span className={`badge ${l.status==="active"||l.status==="locked"?"bg-g":l.status==="sold"?"bg-y":l.status==="pending_review"?"bg-b":l.status==="needs_changes"?"by2":l.status==="rejected"?"br2":"bg-m"}`}>{l.status==="pending_review"?"Under Review":l.status==="needs_changes"?"Needs Changes":l.status==="rejected"?"Rejected":l.status}</span>
    </div>

    {l.description&&<div style={{marginBottom:16}}><div className="lbl">Description</div><p style={{color:"#1D1D1D",fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{l.description}</p></div>}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
      {l.reason_for_sale&&<div style={{background:"#F5F5F5",borderRadius:6,padding:"12px 14px"}}><div className="lbl">Reason for Sale</div><div style={{fontSize:13}}>{l.reason_for_sale}</div></div>}
      {(l.location||l.county)&&<div style={{background:"#F5F5F5",borderRadius:6,padding:"12px 14px"}}>
        <div className="lbl">Location</div>
        <div style={{fontSize:13}}><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> {l.location}{l.county&&l.location&&l.location!==l.county?`, ${l.county}`:l.county||""}</div>
      </div>}
    </div>

    {/* Seller contact + response rate */}
    <div style={{marginBottom:16}}>
      <div className="lbl">Seller</div>
      {l.is_unlocked
        ?<div style={{background:"#F8F8F8",border:"1px solid #E8E8E8",borderRadius:12,padding:"16px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <span><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg></span>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:"#111111"}}>Contact Revealed</div>
              <div style={{fontSize:12,color:"#888888"}}>Share responsibly — do not post publicly</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
            {l.seller_name&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
              <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
              <span style={{fontWeight:600}}>{l.seller_name}</span>
            </div>}
            {l.seller_phone&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
              <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></span>
              <span>{l.seller_phone}</span>
            </div>}
            {l.seller_email&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
              <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
              <span>{l.seller_email}</span>
            </div>}
          </div>
          {l.seller_phone&&(()=>{
            // Convert Kenyan number to WhatsApp international format
            const raw=l.seller_phone.replace(/\D/g,"");
            const wa=raw.startsWith("254")?raw:raw.startsWith("0")?`254${raw.slice(1)}`:raw;
            const msg=encodeURIComponent(`Hi, I saw your listing "${l.title}" on Weka Soko for ${fmtKES(l.price)}. Is it still available?`);
            return <a
              href={`https://wa.me/${wa}?text=${msg}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#25D366",color:"#fff",padding:"12px 20px",fontWeight:700,fontSize:14,textDecoration:"none",fontFamily:"var(--fn)",letterSpacing:".01em",transition:"background .15s"}}
              onMouseOver={e=>e.currentTarget.style.background="#1EA952"}
              onMouseOut={e=>e.currentTarget.style.background="#25D366"}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat on WhatsApp
            </a>;
          })()}
        </div>
:<div style={{background:"#F5F5F5",borderRadius:6,padding:"14px",display:"flex",alignItems:"center",gap:12}}>
      <span><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
      <div style={{flex:1}}>
        <div style={{fontWeight:600}}>{l.seller_anon||"Anonymous Seller"}</div>
        {isSeller?(
          <div style={{fontSize:12,color:"#888888"}}>Pay KSh 260 to reveal your contact to buyers</div>
        ):l.locked_buyer_id?(
          <div style={{fontSize:12,color:"#888888"}}>Seller contact will be revealed after they confirm interest</div>
        ):null}
        <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap",alignItems:"center"}}>
              {l.seller_avg_rating>0&&<span style={{fontSize:11,background:"rgba(0,0,0,.05)",color:"#1428A0",padding:"2px 8px",borderRadius:80,fontWeight:700}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginRight:2}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> {Number(l.seller_avg_rating).toFixed(1)} ({l.seller_review_count||0} review{l.seller_review_count!==1?"s":""})
              </span>}
              {(!l.seller_avg_rating||l.seller_avg_rating===0)&&<span style={{fontSize:11,color:"#CCCCCC"}}>No reviews yet</span>}
              {l.response_rate!=null&&<span style={{fontSize:11,background:"#F0F0F0",color:"#1428A0",padding:"2px 8px",borderRadius:6,fontWeight:600}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> {Math.round(l.response_rate)}% response rate
              </span>}
              {l.avg_response_hours!=null&&l.avg_response_hours<48&&<span style={{fontSize:11,color:"#888888"}}>
                Replies in ~{l.avg_response_hours<1?"under an hour":l.avg_response_hours<24?Math.round(l.avg_response_hours)+"h":Math.round(l.avg_response_hours/24)+"d"}
              </span>}
            </div>
          </div>
          {isSeller&&l.locked_buyer_id&&<button className="btn bp sm" style={{marginLeft:"auto"}} onClick={onUnlock}>Unlock → KSh 260</button>}
        </div>}
    </div>

    {/* ── Buyer safety tip ───────────────────────────────────────────── */}
    {!isSeller&&l.status==="active"&&<div style={{background:"#F8F8F8",border:"1px solid #E8E8E8",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:700,color:"#111111",marginBottom:4}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Stay Safe on Weka Soko</div>
      <div style={{fontSize:12,color:"#888888",lineHeight:1.7}}>
        • <strong>Never pay outside this platform.</strong> If a seller asks for M-Pesa directly before you've met, that's a scam.<br/>
        • <strong>Use Escrow</strong> for expensive items — your money is held safely until you confirm delivery.<br/>
        • <strong>Meet in a public place</strong> for physical item handovers. Bring someone if you can.<br/>
        • <strong>Something feel off?</strong> Use the Report button below.
      </div>
    </div>}

    {/* Escrow info */}
    {!isSeller&&l.status==="active"&&<div className="alert ay" style={{fontSize:12}}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginRight:4}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> <strong>Safe Escrow:</strong> Pay {fmtKES(Number(l.price)+escrowFee)} (item {fmtKES(Number(l.price))} + 5.5% fee). Funds held until you confirm you received the item.
    </div>}

    <div style={{display:"flex",gap:16,fontSize:12,color:"#888888",marginTop:10,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",gap:12}}>
        <span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> {l.view_count||0} views</span>
        <span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z"/><path d="M12 12c0 0-2 1.5-2 3a2 2 0 0 0 4 0c0-1.5-2-3-2-3z"/></svg> {l.interest_count||0} interested</span>
        <span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginRight:2}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {ago(l.created_at)}</span>
        {l.expires_at&&<span style={{color:new Date(l.expires_at)<new Date()?"#888888":"#CCCCCC"}}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {timeLeft(l.expires_at)}</span>}
      </div>
      {user&&!isSeller&&<ReportListingBtn listingId={l.id} token={token} notify={notify}/>}
      {user&&(isSeller||isBuyer)&&l.status==="sold"&&<LeaveReviewBtn listing={l} user={user} token={token} notify={notify}/>}
    </div>
  </Modal>;
}

// ── ROLE SWITCHER ─────────────────────────────────────────────────────────────
// ── MARK AS SOLD MODAL ────────────────────────────────────────────────────────
function MarkSoldModal({listing, token, notify, onClose, onSuccess}) {
  const [loading, setLoading] = useState(false);

  const confirm = async (channel) => {
    setLoading(true);
    try {
      await api(`/api/listings/${listing.id}/mark-sold`, {
        method: "POST",
        body: JSON.stringify({ channel })
      }, token);
      notify(
        channel === "platform"
          ? "Marked as sold via Weka Soko!"
          : "Marked as sold outside platform.",
        "success"
      );
      onSuccess(listing.id, channel);
      onClose();
    } catch(e) { notify(e.message, "error"); }
    finally { setLoading(false); }
  };

  return <Modal title="Mark as Sold" onClose={onClose}>
    <div style={{textAlign:"center", padding:"8px 0 16px"}}>
      <div style={{marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></div>
      <div style={{fontWeight:700, fontSize:16, marginBottom:6}}>{listing.title}</div>
      <div style={{fontSize:13, color:"#888888", marginBottom:24}}>
        How did this item sell? This helps us improve Weka Soko.
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:12}}>
        <button className="btn bp" style={{width:"100%", padding:"16px", flexDirection:"column", gap:4, height:"auto"}}
          onClick={()=>confirm("platform")} disabled={loading}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
          <div style={{fontWeight:700, fontSize:14}}>Sold via Weka Soko</div>
          <div style={{fontSize:12, opacity:.8, fontWeight:400}}>Buyer found me through this platform</div>
        </button>

        <button className="btn bs" style={{width:"100%", padding:"16px", flexDirection:"column", gap:4, height:"auto"}}
          onClick={()=>confirm("outside")} disabled={loading}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <div style={{fontWeight:700, fontSize:14}}>Sold Outside Platform</div>
          <div style={{fontSize:12, color:"#888888", fontWeight:400}}>I found the buyer elsewhere</div>
        </button>
      </div>

      {loading && <div style={{marginTop:16}}><Spin/></div>}
    </div>
  </Modal>;
}

function RoleSwitcher({user,token,notify,onSwitch}){
  const [loading,setLoading]=useState(false);
  const target=user.role==="seller"?"buyer":"seller";
  const switch_=async()=>{
    if(!window.confirm(`Switch to ${target} account? You can switch back anytime.`))return;
    setLoading(true);
    try{
      const data=await api("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:target})},token);
      notify(`Switched to ${target} account`,"success");
      onSwitch(data.user);
    }catch(err){notify(err.message,"error");}
    finally{setLoading(false);}
  };
  return <button className="btn bs" style={{justifyContent:"flex-start",gap:10}} onClick={switch_} disabled={loading}>
    {loading?<Spin/>:<>Switch to {target==="seller"?"Seller":"Buyer"} Account</>}
  </button>;
}

// ── SOLD ITEMS SECTION ───────────────────────────────────────────────────────
// ── POST REQUEST MODAL ─────────────────────────────────────────────────────
function PostRequestModal({onClose,token,notify,onSuccess}){
  const [f,setF]=useState({title:"",description:"",budget:"",min_price:"",county:"",category:"",subcat:""});
  const [loading,setLoading]=useState(false);
  const [fieldErrors,setFieldErrors]=useState({});
  const [photos,setPhotos]=useState([]); // array of {file, preview}
  const photoInputRef=useRef(null);
  const sf=(k,v)=>setF(p=>({...p,[k]:v}));
  const cat=CATS.find(c=>c.name===f.category);

  const addPhotos=e=>{
    const files=Array.from(e.target.files||[]);
    const valid=files.filter(f=>f.type.startsWith("image/")).slice(0,4-photos.length);
    setPhotos(p=>[...p,...valid.map(file=>({file,preview:URL.createObjectURL(file)}))].slice(0,4));
    e.target.value="";
  };
  const removePhoto=i=>setPhotos(p=>p.filter((_,pi)=>pi!==i));

  const submit=async()=>{
    if(!f.title.trim()||!f.description.trim()){notify("Title and description are required","warning");return;}
    const errs={};
    [["title",f.title],["description",f.description]].forEach(([k,v])=>{
      if(v&&checkContactInfo(v))errs[k]="Cannot contain phone numbers, emails, or social handles";
    });
    if(Object.keys(errs).length){setFieldErrors(errs);notify("Remove contact info from flagged fields","warning");return;}
    setFieldErrors({});
    setLoading(true);
    try{
      const body={title:f.title.trim(),description:f.description.trim()};
      if(f.budget)body.budget=f.budget;
      if(f.min_price)body.min_price=f.min_price;
      if(f.county)body.county=f.county;
      if(f.category)body.category=f.category;
      if(f.subcat)body.subcat=f.subcat;
      const result=await api("/api/requests",{method:"POST",body:JSON.stringify(body)},token);
      // Upload photos if any (non-blocking)
      if(photos.length>0){
        const fd=new FormData();
        photos.forEach(p=>fd.append("photos",p.file));
        await api(`/api/requests/${result.id}/photos`,{method:"POST",body:fd},token).catch(()=>{});
      }
      notify("Request posted! Sellers will be notified.","success");
      onSuccess(result);onClose();
    }catch(err){notify(err.message,"error");}
    finally{setLoading(false);}
  };

  return <Modal title="Post a Buyer Request" onClose={onClose} footer={
    <><button className="btn bs" onClick={onClose}>Cancel</button><button className="btn bp" onClick={submit} disabled={loading}>{loading?<Spin/>:"Post Request"}</button></>
  }>
    <div className="alert ag" style={{marginBottom:16,fontSize:13}}>Tell sellers what you're hunting for and we'll ping you as soon as a match hits the site. Just a heads-up: keep your contact info private and stick to our chat to stay safe from spam!</div>
    <FF label="What are you looking for?" required>
      <input className={`inp${fieldErrors.title?" err":""}`} placeholder="e.g. iPhone 13 Pro, good condition" value={f.title} onChange={e=>{sf("title",e.target.value);if(fieldErrors.title)setFieldErrors(p=>({...p,title:""}));}} maxLength={120}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
        {fieldErrors.title?<span style={{fontSize:11,color:"#dc2626"}}>{fieldErrors.title}</span>:<span/>}
        <span style={{fontSize:11,color:"#888888"}}>{f.title.length}/120</span>
      </div>
    </FF>
    <FF label="Description" required hint="Be specific — condition, colour, specs, anything important">
      <textarea className={`inp${fieldErrors.description?" err":""}`} placeholder="e.g. Looking for iPhone 13 Pro 256GB in any colour, screen must be crack-free, battery health above 80%..." value={f.description} onChange={e=>{sf("description",e.target.value);if(fieldErrors.description)setFieldErrors(p=>({...p,description:""}));}} rows={4}/>
      {fieldErrors.description&&<div style={{fontSize:11,color:"#dc2626",marginTop:3}}>{fieldErrors.description}</div>}
    </FF>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <FF label="Category" hint="Optional">
        <select className="inp" value={f.category} onChange={e=>{sf("category",e.target.value);sf("subcat","");}}>
          <option value="">Any category</option>
          {CATS.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </FF>
      <FF label="Subcategory" hint="Optional">
        <select className="inp" value={f.subcat} onChange={e=>sf("subcat",e.target.value)} disabled={!cat}>
          <option value="">Any</option>
          {cat?.sub?.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </FF>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
      <FF label="Min Budget (KSh)" hint="Optional">
        <input className="inp" type="number" placeholder="e.g. 5000" value={f.min_price} onChange={e=>sf("min_price",e.target.value)} min={0}/>
      </FF>
      <FF label="Max Budget (KSh)" hint="Optional">
        <input className="inp" type="number" placeholder="e.g. 80000" value={f.budget} onChange={e=>sf("budget",e.target.value)} min={0}/>
      </FF>
      <FF label="County" hint="Optional">
        <select className="inp" value={f.county} onChange={e=>sf("county",e.target.value)}>
          <option value="">Any county</option>
          {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </FF>
    </div>
    {/* Photo upload */}
    <div style={{marginTop:4}}>
      <div className="lbl">Photos <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"#AAAAAA"}}>Optional — up to 4 images</span></div>
      <input ref={photoInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={addPhotos}/>
      {photos.length<4&&<div onClick={()=>photoInputRef.current?.click()} className="img-upload" style={{cursor:"pointer",textAlign:"center",padding:"18px 12px"}}>
        <div style={{marginBottom:6,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1428A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
        <div style={{fontSize:13,color:"#1428A0",fontWeight:600}}>Add Photos</div>
        <div style={{fontSize:11,color:"#AAAAAA",marginTop:2}}>Help sellers see exactly what you want</div>
      </div>}
      {photos.length>0&&<div className="img-grid" style={{marginTop:8}}>
        {photos.map((p,i)=><div key={i} className="img-thumb">
          <img src={p.preview} alt=""/>
          <button className="img-del" onClick={()=>removePhoto(i)}>×</button>
        </div>)}
      </div>}
    </div>
  </Modal>;
}

// ── REQUEST DETAIL MODAL ───────────────────────────────────────────────────
function RequestDetailModal({r,user,token,notify,onClose,onIHaveThis}){
  const [lightboxIdx,setLightboxIdx]=useState(null);
  const photos=Array.isArray(r.photos)?r.photos.filter(Boolean):[];
  const [mainPhoto,setMainPhoto]=useState(photos[0]||null);
  const catPhoto=CAT_PHOTOS[r.category];

  const handleIHaveThis=()=>{onClose();onIHaveThis&&onIHaveThis(r);};

  return <Modal title={r.title} onClose={onClose} large footer={
    <div style={{width:"100%",display:"flex",gap:8,flexWrap:"wrap"}}>
      {user&&user.id!==r.user_id&&<button className="btn bp" style={{flex:1}} onClick={handleIHaveThis}>I Have This — Pitch to Buyer</button>}
      {!user&&<button className="btn bp" style={{flex:1}} onClick={onClose}>Sign In to Respond</button>}
    </div>
  }>
    {/* Photo / placeholder area */}
    <div style={{background:"#F5F5F5",borderRadius:8,aspectRatio:"16/9",overflow:"hidden",marginBottom:10,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
      {mainPhoto
        ?<img src={mainPhoto} alt={r.title} style={{width:"100%",height:"100%",objectFit:"cover",cursor:"zoom-in"}} onClick={()=>setLightboxIdx(photos.indexOf(mainPhoto))}/>
        :catPhoto
          ?<><img src={catPhoto} alt={r.category} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.18,filter:"grayscale(30%)",position:"absolute",inset:0}}/><span style={{position:"relative",fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#888888",background:"rgba(255,255,255,.85)",padding:"6px 16px",borderRadius:20}}>No photos attached</span></>
          :<span style={{fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA"}}>No photos attached</span>}
    </div>
    {photos.length>1&&<div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto"}}>
      {photos.map((p,i)=><img key={i} src={p} alt="" onClick={()=>setMainPhoto(p)} style={{width:70,height:55,objectFit:"cover",borderRadius:6,cursor:"pointer",opacity:mainPhoto===p?1:.5,border:mainPhoto===p?"2px solid #1428A0":"2px solid transparent",flexShrink:0}}/>)}
    </div>}
    {lightboxIdx!==null&&<Lightbox photos={photos} startIdx={lightboxIdx} onClose={()=>setLightboxIdx(null)}/>}

    {/* Category badges */}
    <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
      {r.category&&<span className="badge bg-g">{r.category}</span>}
      {r.subcat&&<span className="badge bg-m">{r.subcat}</span>}
      {r.county&&<span className="badge bg-m"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginRight:3}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{r.county}</span>}
    </div>

    {/* Budget */}
    {(r.min_price||r.budget)&&<div style={{background:"#F8F8F8",border:"1px solid #E8E8E8",borderRadius:10,padding:"14px 16px",marginBottom:16,display:"flex",gap:16,flexWrap:"wrap"}}>
      {r.min_price&&<div><div className="lbl">Min Budget</div><div style={{fontSize:20,fontWeight:800,color:"#1428A0"}}>{fmtKES(r.min_price)}</div></div>}
      {r.budget&&<div><div className="lbl">{r.min_price?"Max Budget":"Budget"}</div><div style={{fontSize:20,fontWeight:800,color:"#1428A0"}}>{fmtKES(r.budget)}</div></div>}
    </div>}

    {/* Description */}
    <div style={{marginBottom:16}}>
      <div className="lbl">What They're Looking For</div>
      <p style={{color:"#1D1D1D",fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{r.description}</p>
    </div>

    {/* Meta */}
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",fontSize:12,color:"#888888",borderTop:"1px solid #F0F0F0",paddingTop:12}}>
      <span>{r.requester_anon||"Anonymous Buyer"}</span>
      <span>·</span>
      <span>{ago(r.created_at)}</span>
      {parseInt(r.matching_listings)>0&&<><span>·</span><span style={{color:"#1428A0",fontWeight:700}}>{r.matching_listings} matching listing{r.matching_listings!==1?"s":""}</span></>}
    </div>
  </Modal>;
}

// ── SHARED BUYER REQUEST CARD ──────────────────────────────────────────────
function RequestCard({r,user,token,notify,onIHaveThis,onDelete,onView}){
  const [detail,setDetail]=useState(false);
  const photos=Array.isArray(r.photos)?r.photos.filter(Boolean):[];
  const thumb=photos[0]||null;
  const catPhoto=CAT_PHOTOS[r.category];
  const deleteRequest=async e=>{
    e.stopPropagation();
    if(!window.confirm("Delete this request?"))return;
    try{await api(`/api/requests/${r.id}`,{method:"DELETE"},token);onDelete&&onDelete(r.id);}
    catch(err){notify(err.message,"error");}
  };
  const openDetail=()=>{if(onView){onView(r);}else{setDetail(true);}};
  return <>
    <div onClick={openDetail} style={{background:"#fff",border:"1px solid #E5E5E5",borderRadius:12,overflow:"hidden",cursor:"pointer",transition:"border-color .2s,box-shadow .2s",boxShadow:"none"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="#1428A0";e.currentTarget.style.boxShadow="0 4px 16px rgba(20,40,160,.08)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E5E5";e.currentTarget.style.boxShadow="none";}}>
      {/* Thumbnail row */}
      <div style={{width:"100%",height:thumb||catPhoto?120:0,background:"#F5F5F5",position:"relative",overflow:"hidden",display:thumb||catPhoto?"block":"none"}}>
        {thumb
          ?<img src={thumb} alt={r.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          :catPhoto
            ?<img src={catPhoto} alt={r.category} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.22,filter:"grayscale(30%)"}}/>
            :null}
        {photos.length>1&&<div style={{position:"absolute",bottom:6,right:8,background:"rgba(0,0,0,.55)",color:"#fff",fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:10}}>+{photos.length-1}</div>}
        <div style={{position:"absolute",top:8,left:8}}><span style={{background:"#1428A0",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,letterSpacing:".04em"}}>WANTED</span></div>
      </div>
      <div style={{padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6,gap:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:15,lineHeight:1.3,letterSpacing:"-.01em",color:"#1A1A1A",marginBottom:4}}>{r.title}</div>
            {(r.category||r.subcat)&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {r.category&&<span style={{background:"#EEF2FF",color:"#1428A0",padding:"2px 8px",fontSize:11,fontWeight:600,borderRadius:4}}>{r.category}</span>}
              {r.subcat&&<span style={{background:"#F0F0F0",color:"#555",padding:"2px 8px",fontSize:11,fontWeight:600,borderRadius:4}}>{r.subcat}</span>}
            </div>}
          </div>
          {user?.id===r.user_id&&<button onClick={deleteRequest} style={{background:"none",border:"none",cursor:"pointer",color:"#AEAEB2",fontSize:12,padding:"0 2px",flexShrink:0,fontFamily:"var(--fn)"}}>Remove</button>}
        </div>
        <div style={{fontSize:13,color:"#555",lineHeight:1.65,marginBottom:10}}>
          {r.description.length<=120?r.description:<>{r.description.slice(0,120)}... <span style={{color:"#1428A0",fontWeight:600,fontSize:12}}>Read more</span></>}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          {r.min_price&&<span style={{background:"rgba(0,0,0,.05)",color:"#111",padding:"3px 10px",fontSize:11,fontWeight:700,borderRadius:4}}>From {fmtKES(r.min_price)}</span>}
          {r.budget&&<span style={{background:"rgba(0,0,0,.05)",color:"#111",padding:"3px 10px",fontSize:11,fontWeight:700,borderRadius:4}}>{r.min_price?"Up to ":"Budget: "}{fmtKES(r.budget)}</span>}
          {r.county&&<span style={{background:"#F0F0F0",color:"#1428A0",padding:"3px 10px",fontSize:11,fontWeight:600,borderRadius:4}}><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> {r.county}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,color:"#AEAEB2",borderTop:"1px solid #F0F0F0",paddingTop:10}}>
          <span>{r.requester_anon||"Anonymous"} · {ago(r.created_at)}</span>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {parseInt(r.matching_listings)>0&&<span style={{color:"#1428A0",fontWeight:700}}>{r.matching_listings} match</span>}
            <button className="btn bp sm" style={{fontSize:11,padding:"4px 10px"}} onClick={e=>{e.stopPropagation();onIHaveThis&&onIHaveThis(r);}}>I Have This</button>
          </div>
        </div>
      </div>
    </div>
    {detail&&<RequestDetailModal r={r} user={user} token={token} notify={notify} onClose={()=>setDetail(false)} onIHaveThis={r=>{setDetail(false);onIHaveThis&&onIHaveThis(r);}}/>}
  </>;
}

// ── WHAT BUYERS WANT SECTION ───────────────────────────────────────────────
function WhatBuyersWant({user,token,notify,onSignIn,compact=false,onIHaveThis,onViewAll}){
  const handleIHaveThis=(request)=>{
    if(!user){onSignIn();return;}
    if(user.role!=="seller"){
      if(window.confirm("To respond to this buyer request you need a Seller account.\n\nSwitch to Seller now?")){
        onIHaveThis&&onIHaveThis(request,"switch_to_seller");
      }
      return;
    }
    if(user.id===request.user_id){notify("This is your own request","warning");return;}
    onIHaveThis&&onIHaveThis(request,"post_ad");
  };
  const [requests,setRequests]=useState([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [showModal,setShowModal]=useState(false);
  const [searchInput,setSearchInput]=useState("");
  const [search,setSearch]=useState("");
  const [county,setCounty]=useState("");
  const [category,setCategory]=useState("");
  const [subcat,setSubcat]=useState("");
  const [minPrice,setMinPrice]=useState("");
  const [maxPrice,setMaxPrice]=useState("");
  const [sort,setSort]=useState("newest");
  const filterCat=CATS.find(c=>c.name===category);

  const load=useCallback(()=>{
    setLoading(true);
    const p=new URLSearchParams({limit:12,sort});
    if(search)p.set("search",search);
    if(county)p.set("county",county);
    if(category)p.set("category",category);
    if(subcat)p.set("subcat",subcat);
    if(minPrice)p.set("min_price",minPrice);
    if(maxPrice)p.set("max_price",maxPrice);
    api(`/api/requests?${p}`).then(d=>{
      setRequests(d.requests||[]);setTotal(d.total||0);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[search,county,category,subcat,minPrice,maxPrice,sort]);

  useEffect(()=>{load();},[load]);

  const clearFilters=()=>{setSearchInput("");setSearch("");setCounty("");setCategory("");setSubcat("");setMinPrice("");setMaxPrice("");setSort("newest");};
  const hasFilters=search||county||category||subcat||minPrice||maxPrice||sort!=="newest";

  if(compact) return <div style={{padding:"4px 0"}}>
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      {loading?<div style={{textAlign:"center",padding:20}}><Spin/></div>
        :requests.length===0?<div style={{textAlign:"center",padding:"20px 0",color:"#AAAAAA",fontSize:13}}>
          <div style={{marginBottom:8,opacity:.3,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
          No requests yet
        </div>
        :requests.slice(0,4).map(r=>(
          <div key={r.id} style={{padding:"12px 0",borderBottom:"1px solid #F0F0F0"}}>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:3}}>
              {r.category&&<span style={{background:"#EEF2FF",color:"#1428A0",padding:"1px 6px",fontSize:10,fontWeight:600,borderRadius:3}}>{r.category}</span>}
            </div>
            <div style={{fontWeight:700,fontSize:13,marginBottom:3,color:"#1A1A1A",lineHeight:1.3}}>{r.title}</div>
            <div style={{fontSize:12,color:"#777",lineHeight:1.5,marginBottom:6}}>{r.description?.slice(0,60)}{r.description?.length>60?"...":""}</div>
            <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"space-between"}}>
              {r.budget&&<span style={{fontSize:11,fontWeight:600,color:"#1428A0"}}>KSh {Number(r.budget).toLocaleString()}</span>}
              <button className="btn bp sm" style={{fontSize:11,padding:"4px 10px",borderRadius:6}} onClick={()=>handleIHaveThis(r)}>I Have This</button>
            </div>
          </div>
        ))
      }
      <div style={{display:"flex",gap:8,marginTop:12}}>
        {total>4&&<button style={{flex:1,padding:"9px",background:"transparent",color:"#1428A0",border:"1.5px solid #1428A0",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)"}}
          onClick={onViewAll}>View All ({total})</button>}
        <button style={{flex:1,padding:"9px",background:"#1428A0",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)"}}
          onClick={()=>{if(!user){onSignIn();return;}setShowModal(true);}}>+ Post Request</button>
      </div>
    </div>
    {showModal&&<PostRequestModal token={token} notify={notify} onClose={()=>setShowModal(false)} onSuccess={r=>{setRequests(p=>[r,...p]);setTotal(t=>t+1);}}/>}
  </div>;

  return <div style={{background:"#FFFFFF",padding:"48px 40px",margin:"0 -48px",borderTop:"1px solid #EBEBEB",borderBottom:"1px solid #EBEBEB"}}>
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#767676",marginBottom:8}}>Community</div>
          <h2 style={{fontSize:"clamp(24px,3vw,36px)",fontWeight:500,letterSpacing:"-.01em",color:"#1D1D1D",fontFamily:"var(--fn)",lineHeight:1.1}}>What Buyers Want</h2>
          <p style={{fontSize:13,color:"#767676",marginTop:6}}>{total} active request{total!==1?"s":""} from buyers looking for items</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {onViewAll&&total>12&&<button style={{background:"transparent",color:"#1428A0",border:"1.5px solid #1428A0",padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8}} onClick={onViewAll}>View All Requests →</button>}
          <button style={{background:"#1D1D1D",color:"#fff",border:"none",padding:"12px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8,whiteSpace:"nowrap"}}
            onClick={()=>{if(!user){onSignIn();return;}setShowModal(true);}}>+ Post a Request</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",flex:"2 1 260px",gap:0,border:"1px solid #E0E0E0",borderRadius:8,overflow:"hidden",background:"#fff",minWidth:0}}>
          <input style={{flex:1,padding:"10px 14px",border:"none",outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",color:"#1D1D1D",minWidth:0}}
            placeholder="Search requests..." value={searchInput}
            onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")setSearch(searchInput);}}/>
          <button onClick={()=>setSearch(searchInput)} style={{background:"#1428A0",color:"#fff",border:"none",padding:"0 16px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"var(--fn)",flexShrink:0}}>Search</button>
        </div>
        <select style={{padding:"10px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer",color:"#1D1D1D",flex:"1 1 140px"}}
          value={category} onChange={e=>{setCategory(e.target.value);setSubcat("");}}>
          <option value="">All Categories</option>
          {CATS.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        {filterCat&&<select style={{padding:"10px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer",color:"#1D1D1D",flex:"1 1 120px"}}
          value={subcat} onChange={e=>setSubcat(e.target.value)}>
          <option value="">All Subcategories</option>
          {filterCat.sub.map(s=><option key={s} value={s}>{s}</option>)}
        </select>}
        <select style={{padding:"10px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer",color:"#1D1D1D",flex:"1 1 130px"}}
          value={county} onChange={e=>setCounty(e.target.value)}>
          <option value="">All Counties</option>
          {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        <input style={{padding:"9px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",width:130}} type="number" placeholder="Min KSh" value={minPrice} onChange={e=>setMinPrice(e.target.value)}/>
        <input style={{padding:"9px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",width:130}} type="number" placeholder="Max KSh" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}/>
        <select style={{padding:"9px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer",color:"#1D1D1D"}}
          value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="budget_desc">Highest Budget</option>
          <option value="budget_asc">Lowest Budget</option>
        </select>
        {hasFilters&&<button style={{padding:"9px 14px",border:"1px solid #E0E0E0",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,fontFamily:"var(--fn)",color:"#636363"}} onClick={clearFilters}>Clear All</button>}
      </div>

      {/* Requests grid */}
      {loading?<div style={{textAlign:"center",padding:40}}><Spin s="32px"/></div>
        :requests.length===0?<div style={{textAlign:"center",padding:"40px 20px",color:"#767676"}}>
            <div style={{marginBottom:12,opacity:.3,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>No requests found</div>
            <div style={{fontSize:13}}>{hasFilters?"Try different filters":"Be the first to post what you're looking for"}</div>
            {hasFilters&&<button className="btn bp" style={{marginTop:14}} onClick={clearFilters}>Clear Filters</button>}
          </div>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {requests.map(r=><RequestCard key={r.id} r={r} user={user} token={token} notify={notify}
            onIHaveThis={handleIHaveThis}
            onDelete={id=>{setRequests(p=>p.filter(x=>x.id!==id));setTotal(t=>t-1);}}/>)}
        </div>
      }

      {total>12&&<div style={{textAlign:"center",marginTop:24}}>
        <button style={{background:"transparent",border:"1.5px solid #1D1D1D",color:"#1D1D1D",padding:"10px 28px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8}} onClick={onViewAll}>
          View all {total} requests →
        </button>
      </div>}
    </div>

    {showModal&&<PostRequestModal token={token} notify={notify} onClose={()=>setShowModal(false)} onSuccess={r=>{setRequests(p=>[r,...p]);setTotal(t=>t+1);}}/>}
  </div>;
}

// Shared sold item card — used in SoldSection and SoldPage
function SoldCard({l,showContact=false}){
  const photo=Array.isArray(l.photos)?l.photos.find(p=>typeof p==="string")||l.photos[0]?.url||null:null;
  const fmtDate=ts=>{if(!ts)return"";return new Date(ts).toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"});};
  const duration=(created,sold)=>{
    if(!created||!sold)return null;
    const ms=new Date(sold).getTime()-new Date(created).getTime();
    if(ms<0)return null;
    const days=Math.floor(ms/86400000);
    if(days===0)return"same day";if(days===1)return"1 day";
    if(days<7)return`${days} days`;if(days<30)return`${Math.floor(days/7)}w`;
    return`${Math.floor(days/30)}mo`;
  };
  const dur=duration(l.created_at,l.sold_at);
  return<div style={{background:"#fff",border:"1px solid #E5E5E5",overflow:"hidden",borderRadius:12,display:"flex",flexDirection:"column"}}>
    <div style={{aspectRatio:"4/3",background:"#F0F0F0",position:"relative",overflow:"hidden",flexShrink:0}}>
      {photo?<img src={photo} alt={l.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        :<span style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",opacity:.15}}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span>}
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.52)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{background:"#fff",color:"#1428A0",fontSize:11,fontWeight:700,padding:"5px 14px",letterSpacing:".08em",textTransform:"uppercase"}}>SOLD</span>
      </div>
      {l.sold_channel&&<div style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,.75)",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 8px"}}>{l.sold_channel==="platform"?"Via WekaSoko":"Elsewhere"}</div>}
      {l.avg_rating>0&&<div style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,.65)",color:"#fff",fontSize:11,fontWeight:700,padding:"3px 8px",display:"flex",alignItems:"center",gap:3}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>{Number(l.avg_rating).toFixed(1)}
      </div>}
    </div>
    <div style={{padding:"14px 16px",flex:1,display:"flex",flexDirection:"column",gap:0}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#767676",marginBottom:4}}>{l.category}</div>
      <div style={{fontWeight:700,fontSize:14,lineHeight:1.3,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
      <div style={{fontSize:18,fontWeight:700,color:"#111111",letterSpacing:"-.02em",marginBottom:10}}>{fmtKES(l.price)}</div>
      <div style={{background:"#F6F6F6",padding:"9px 11px",fontSize:11,lineHeight:1.9,borderRadius:8,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",color:"#1428A0"}}>
          <span>Listed</span><span style={{fontWeight:600}}>{fmtDate(l.created_at)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",color:"#111"}}>
          <span>Sold</span><span style={{fontWeight:600}}>{fmtDate(l.sold_at)}</span>
        </div>
        {dur&&<div style={{marginTop:3,paddingTop:5,borderTop:"1px solid #E5E5E5",color:"#636363",display:"flex",justifyContent:"space-between"}}>
          <span>Time to sell</span><span style={{fontWeight:700,color:"#111"}}>{dur}</span>
        </div>}
      </div>
      <div style={{fontSize:11,color:"#767676",marginBottom:showContact?8:0}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> {l.county||l.location||"Kenya"}
      </div>
      {showContact&&<div style={{borderTop:"1px solid #F0F0F0",paddingTop:8,display:"flex",flexDirection:"column",gap:5}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:2}}>Contacts</div>
        <div style={{fontSize:12,display:"flex",flexDirection:"column",gap:4}}>
          <div><span style={{fontWeight:600,color:"#1428A0"}}>Seller: </span><span style={{color:"#222"}}>{l.seller_name||"—"}</span>{l.seller_phone&&<span style={{color:"#636363"}}> · {l.seller_phone}</span>}{l.seller_email&&<span style={{color:"#636363",fontSize:11}}> · {l.seller_email}</span>}</div>
          {l.buyer_name&&<div><span style={{fontWeight:600,color:"#059669"}}>Buyer: </span><span style={{color:"#222"}}>{l.buyer_name}</span>{l.buyer_phone&&<span style={{color:"#636363"}}> · {l.buyer_phone}</span>}{l.buyer_email&&<span style={{color:"#636363",fontSize:11}}> · {l.buyer_email}</span>}</div>}
        </div>
      </div>}
    </div>
  </div>;
}

function SoldSection({token,user,compact=false,onViewAll}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [pg,setPg]=useState(1);
  const [total,setTotal]=useState(0);
  const [cat,setCat]=useState("");
  const PER=compact?12:20;

  useEffect(()=>{
    setLoading(true);
    const params=new URLSearchParams({page:pg,limit:PER});
    if(cat)params.set("category",cat);
    api(`/api/listings/sold?${params}`).then(d=>{
      setItems(d.listings||[]);setTotal(d.total||0);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[pg,cat,PER]);

  if(loading)return<div style={{textAlign:"center",padding:60}}><Spin s="36px"/></div>;

  if(items.length===0)return<div className="empty">
    <div style={{marginBottom:16,opacity:.15,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg></div>
    <h3 style={{fontWeight:700,fontSize:20,marginBottom:8,letterSpacing:"-.02em"}}>No sold items yet</h3>
    <p style={{color:"#767676"}}>Completed sales will appear here</p>
  </div>;

  return<>
    {!compact&&<>
      <div style={{display:"flex",gap:0,border:"1px solid #E5E5E5",marginBottom:28,background:"#fff",borderRadius:12,overflow:"hidden",flexWrap:"wrap"}}>
        {[{label:"Total Sales",val:total},{label:"Categories",val:[...new Set(items.map(i=>i.category))].length},{label:"Avg Price",val:"KSh "+Math.round(items.reduce((a,l)=>a+(parseFloat(l.price)||0),0)/Math.max(items.length,1)).toLocaleString("en-KE")}].map((s,i)=>(
          <div key={s.label} style={{flex:1,padding:"18px 20px",borderRight:i<2?"1px solid #E5E5E5":"none",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:700,letterSpacing:"-.02em",color:"#111111"}}>{s.val}</div>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"#767676",marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>
      {[...new Set(items.map(l=>l.category))].length>1&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>
        <button onClick={()=>{setCat("");setPg(1);}} style={{padding:"7px 16px",background:cat===""?"#1D1D1D":"#F4F4F4",color:cat===""?"#fff":"#535353",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",transition:"all .15s"}}>All</button>
        {[...new Set(items.map(l=>l.category))].map(c=>(
          <button key={c} onClick={()=>{setCat(c);setPg(1);}} style={{padding:"7px 16px",background:cat===c?"#1D1D1D":"#F4F4F4",color:cat===c?"#fff":"#535353",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",transition:"all .15s"}}>{c}</button>
        ))}
      </div>}
    </>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:20}}>
      {items.map(l=><SoldCard key={l.id} l={l} showContact={!compact}/>)}
    </div>

    {compact&&onViewAll&&total>PER&&<div style={{textAlign:"center",marginTop:24}}>
      <button onClick={onViewAll} style={{background:"#1D1D1D",color:"#fff",border:"none",padding:"12px 28px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8}}>View All Sold Items ({total}) →</button>
    </div>}
    {!compact&&Math.ceil(total/PER)>1&&<div style={{display:"flex",gap:6,justifyContent:"center",marginTop:32}}>
      {pg>1&&<button className="btn bs sm" onClick={()=>setPg(p=>p-1)}>Prev</button>}
      <span style={{padding:"7px 14px",fontSize:13,color:"#767676",fontWeight:500}}>Page {pg} of {Math.ceil(total/PER)}</span>
      {pg<Math.ceil(total/PER)&&<button className="btn bs sm" onClick={()=>setPg(p=>p+1)}>Next</button>}
    </div>}
  </>;
}
// ── REVIEWS SECTION ───────────────────────────────────────────────────────────
function StarPicker({value,onChange}){
  const [hover,setHover]=useState(0);
  return<div style={{display:"flex",gap:4,cursor:"pointer"}}>
    {[1,2,3,4,5].map(s=><span key={s}
      style={{color:s<=(hover||value)?"#111111":"#E0E0E0",transition:"color .1s",userSelect:"none"}}
      onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)}
      onClick={()=>onChange(s)}><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>)}
  </div>;
}

function ReviewsSection({token,user,notify}){
  const [pending,setPending]=useState([]);
  const [myReviews,setMyReviews]=useState([]);
  const [reviewsAboutMe,setReviewsAboutMe]=useState(null);
  const [loading,setLoading]=useState(true);
  const [writing,setWriting]=useState(null); // listing object
  const [rating,setRating]=useState(0);
  const [comment,setComment]=useState("");
  const [submitting,setSubmitting]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const [pend,aboutMe]=await Promise.all([
        api("/api/reviews/my-pending",{},token).catch(()=>[]),
        api(`/api/reviews/user/${user.id}`,{},token).catch(()=>({reviews:[],stats:{}})),
      ]);
      setPending(Array.isArray(pend)?pend:[]);
      setReviewsAboutMe(aboutMe);
    }finally{setLoading(false);}
  },[token,user.id]);

  useEffect(()=>{load();},[load]);

  const submit=async()=>{
    if(!rating){notify("Please select a star rating","warning");return;}
    setSubmitting(true);
    try{
      await api("/api/reviews",{method:"POST",body:JSON.stringify({listing_id:writing.id,rating,comment})},token);
      notify("Review submitted!","success");
      setWriting(null);setRating(0);setComment("");
      load();
    }catch(e){notify(e.message||"Failed to submit","error");}
    finally{setSubmitting(false);}
  };

  if(loading)return<div style={{textAlign:"center",padding:40}}><Spin s="36px"/></div>;

  const stats=reviewsAboutMe?.stats;
  const reviews=reviewsAboutMe?.reviews||[];

  return<>
    {/* My rating summary */}
    {stats&&(stats.review_count>0)&&<div style={{background:"#F5F5F5",border:"1px solid #E8E8E8",borderRadius:6,padding:"18px 20px",marginBottom:18,display:"flex",gap:16,alignItems:"center"}}>
      <div style={{textAlign:"center",flexShrink:0}}>
        <div style={{fontSize:44,fontWeight:700,color:"#111111",lineHeight:1}}>{Number(stats.avg_rating||0).toFixed(1)}</div>
        <div style={{fontSize:16,color:"#1428A0",marginTop:2,display:"flex",gap:2,justifyContent:"center"}}>{[1,2,3,4,5].map(i=><svg key={i} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={i<=Math.round(stats.avg_rating||0)?"currentColor":"none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}</div>
      </div>
      <div>
        <div style={{fontWeight:700,fontSize:16,marginBottom:2}}>Your Rating</div>
        <div style={{fontSize:13,color:"#888888"}}>{stats.review_count} review{stats.review_count!==1?"s":""} from transactions</div>
        <div style={{fontSize:12,color:"#CCCCCC",marginTop:4}}>Reviews are left by buyers and sellers after a completed sale</div>
      </div>
    </div>}

    {/* Pending reviews to write */}
    {pending.length>0&&<>
      <div className="lbl" style={{marginBottom:10}}>Leave a Review ({pending.length} pending)</div>
      <div className="alert ay" style={{fontSize:12,marginBottom:14}}>
        You can leave a review after a transaction is complete. Reviews help build trust on Weka Soko.
      </div>
      {pending.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 15px",background:"rgba(176,127,16,.06)",border:"1px solid rgba(176,127,16,.2)",borderRadius:6,marginBottom:10}}>
        <span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
          <div style={{fontSize:11,color:"#888888"}}>You were the {p.my_role} · Rate the {p.my_role==="buyer"?"seller":"buyer"}</div>
        </div>
        <button className="btn bp sm" onClick={()=>{setWriting(p);setRating(0);setComment("");}}>Write Review</button>
      </div>)}
    </>}

    {/* Review form */}
    {writing&&<div style={{background:"#F5F5F5",border:"1px solid #E8E8E8",borderRadius:6,padding:"18px 20px",marginBottom:18}}>
      <div style={{fontWeight:700,marginBottom:4}}>Review for: {writing.title}</div>
      <div style={{fontSize:12,color:"#888888",marginBottom:14}}>Rate the {writing.my_role==="buyer"?"seller":"buyer"} on this transaction</div>
      <div style={{marginBottom:14}}>
        <div className="lbl" style={{marginBottom:6}}>Rating *</div>
        <StarPicker value={rating} onChange={setRating}/>
        <div style={{fontSize:11,color:"#888888",marginTop:4}}>{["","Poor","Below average","Average","Good","Excellent"][rating]||""}</div>
      </div>
      <FF label="Comment (optional)" hint="Share your experience with this transaction">
        <textarea className="inp" rows={3} placeholder="Great seller, item exactly as described..." value={comment} onChange={e=>setComment(e.target.value)} style={{resize:"vertical"}}/>
      </FF>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bs" onClick={()=>{setWriting(null);setRating(0);setComment("");}}>Cancel</button>
        <button className="btn bp" style={{flex:1}} onClick={submit} disabled={submitting||!rating}>{submitting?<Spin/>:"Submit Review"}</button>
      </div>
    </div>}

    {/* Reviews about me */}
    <div className="lbl" style={{marginBottom:10}}>Reviews About You ({reviews.length})</div>
    {reviews.length===0?<div style={{color:"#888888",fontSize:13,padding:"20px 0",textAlign:"center"}}>
      No reviews yet. Complete a transaction to start building your reputation.
    </div>:reviews.map((r,i)=><div key={r.id||i} style={{padding:"14px 16px",background:"#F5F5F5",borderRadius:6,marginBottom:10,border:"1px solid #E8E8E8"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{color:"#1428A0",display:"inline-flex",gap:1,alignItems:"center"}}>{[1,2,3,4,5].map(i=><svg key={i} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={i<=r.rating?"currentColor":"none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}</span>
          <span style={{fontWeight:700,fontSize:14}}>{r.rating}/5</span>
          <span className={`badge ${r.reviewer_role==="buyer"?"bg-b":"bg-g"}`} style={{fontSize:10}}>{r.reviewer_role==="buyer"?"Buyer":"Seller"}</span>
        </div>
        <span style={{fontSize:11,color:"#CCCCCC"}}>{ago(r.created_at)}</span>
      </div>
      {r.comment&&<p style={{fontSize:13,color:"var(--txt)",lineHeight:1.7,marginBottom:4}}>"{r.comment}"</p>}
      <div style={{fontSize:11,color:"#CCCCCC"}}>Re: {r.listing_title} · From {r.reviewer_anon||"Anonymous"}</div>
    </div>)}
  </>;
}

// ── DASHBOARD (REVAMPED) ──────────────────────────────────────────────────────

// ── MY REQUESTS TAB ────────────────────────────────────────────────────────
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
                    onClick={() => setPaying(p)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Accept — Pay KSh 260
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
        setPaying(null);
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
          ?<input className="inp" value={f.phone} onChange={e=>setF(p=>({...p,phone:e.target.value}))} placeholder="e.g. 0712345678" type="tel"/>
          :<div style={{fontSize:15,color:"#1A1A1A",fontWeight:500}}>{user.phone||<span style={{color:"#CCC"}}>Not set</span>}</div>}
        {editing&&<div style={{fontSize:12,color:"#AAAAAA",marginTop:4}}>Used for M-Pesa payments — shared with buyers after KSh 260 unlock</div>}
      </div>

      {/* WhatsApp */}
      <div>
        <div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>WhatsApp Number</div>
        {editing
          ?<input className="inp" value={f.whatsapp_phone} onChange={e=>setF(p=>({...p,whatsapp_phone:e.target.value}))} placeholder="e.g. 0712345678 (if different from phone)" type="tel"/>
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
  const [showConfirm, setShowConfirm] = useState(false);

  // Detect Google OAuth user — backend returns is_google_user from /api/auth/me
  const isGoogleUser = !!user.is_google_user;

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
        <div style={{fontSize:13,color:"#888"}}>{isGoogleUser?"Signed in with Google":"••••••••"}</div>
      </div>
      <button className="btn bs sm" style={{borderRadius:8}} onClick={()=>setOpen(p=>!p)}>
        {open?"Cancel":"Change Password"}
      </button>
    </div>

    {open&&<div style={{marginTop:18,paddingTop:18,borderTop:"1px solid #F5F5F5",display:"flex",flexDirection:"column",gap:12}}>
      {/* Current password — hidden for Google users */}
      {!isGoogleUser&&<div>
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
<div style={{position:"relative"}}>
<input className="inp" type={showConfirm?"text":"password"} value={f.confirm} onChange={e=>setF(p=>({...p,confirm:e.target.value}))} placeholder="Re-enter new password" style={{paddingRight:44}}/>
<button onClick={()=>setShowConfirm(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#888"}}>{showConfirm?<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button>
</div>
{f.confirm&&f.newPwd&&<div style={{fontSize:12,marginTop:4,color:f.confirm===f.newPwd?"#16a34a":"#dc2626"}}>
{f.confirm===f.newPwd?"Passwords match":"Passwords do not match"}
</div>}
</div>

      <button className="btn bp" style={{borderRadius:10,marginTop:4}} onClick={save} disabled={saving||!f.newPwd||(!isGoogleUser&&!f.current)||f.newPwd!==f.confirm}>
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
    {id:"home", label:"Overview", icon:<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="3" y="3" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="3" y="12" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="12" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="2"/></svg>},
    {id:"ads", label:user.role==="seller"?"My Ads":"Saved", icon:<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/></svg>},
    {id:"myrequests", label:"My Requests", icon:<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, badge:myRequests?.filter(r=>r.status==="active").length||0},
    {id:"notif", label:"Inbox", icon:<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, badge:unreadCount>0?unreadCount:null},
    {id:"settings",label:"Account",icon:<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>},
  ];

  const [inboxTab,setInboxTab]=useState("chat");
  const [mobAdsFilter,setMobAdsFilter]=useState("all");
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
                  <div style={{fontSize:12,color:"#888",marginTop:2}}>Pay KSh 260 to reveal buyer contact</div>
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
        <div style={{fontSize:16,fontWeight:700,color:"#1A1A1A",marginBottom:12}}>{user.role==="seller"?"My Ads":"Saved Items"}</div>
        
        {/* Status filter tabs - only for sellers */}
        {user.role==="seller"&&<div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4}}>
          {[
            {id:"all",label:"All",count:listings.length},
            {id:"pending_review",label:"Pending",count:listings.filter(l=>l.status==="pending_review").length},
            {id:"active",label:"Active",count:listings.filter(l=>l.status==="active"||l.status==="locked").length},
            {id:"sold",label:"Sold",count:listings.filter(l=>l.status==="sold").length},
            {id:"rejected",label:"Rejected",count:listings.filter(l=>l.status==="rejected"||l.status==="needs_changes").length},
          ].map(tab=>{
            const isActive=mobAdsFilter===tab.id;
            return <button key={tab.id} onClick={()=>setMobAdsFilter(tab.id)} style={{flexShrink:0,padding:"8px 14px",borderRadius:20,fontSize:12,fontWeight:700,fontFamily:"var(--fn)",cursor:"pointer",border:"none",background:isActive?"#1428A0":"#F0F0F0",color:isActive?"#fff":"#666"}}>
              {tab.label}{tab.count>0&&<span style={{marginLeft:4,opacity:.8}}>({tab.count})</span>}
            </button>;
          })}
        </div>}
        
        {(()=>{
          const displayList=user.role==="seller"
            ?listings.filter(l=>mobAdsFilter==="all"||mobAdsFilter==="active"?(l.status==="active"||l.status==="locked"):mobAdsFilter==="pending_review"?l.status==="pending_review":mobAdsFilter==="sold"?l.status==="sold":mobAdsFilter==="rejected"?(l.status==="rejected"||l.status==="needs_changes"):true)
            :(savedListings||[]);
          
          if(displayList.length===0)return<div style={{textAlign:"center",padding:"60px 20px",color:"#AAAAAA"}}>
            <div style={{marginBottom:12,opacity:.2}}>{user.role==="seller"?<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>:<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>}</div>
            <div style={{fontWeight:700,marginBottom:6}}>{user.role==="seller"?"No ads yet":"Nothing saved yet"}</div>
            <div style={{fontSize:13,marginBottom:20}}>{user.role==="seller"?"Post your first ad to get started":"Tap the bookmark icon on any listing to save it"}</div>
            {user.role==="seller"&&<button className="btn bp" style={{borderRadius:10}} onClick={onPostAd}>+ Post an Ad</button>}
          </div>;
          
          return displayList.map(l=>{
            const photo=Array.isArray(l.photos)?l.photos.find(p=>typeof p==="string")||l.photos[0]?.url||null:null;
            const needsUnlock=user.role==="seller"&&!l.is_unlocked&&(l.status==="active"||l.status==="locked");
            const hasBuyerWaiting=l.locked_buyer_id&&!l.is_unlocked;
            const isRejected=l.status==="rejected"||l.status==="needs_changes";
            const canEdit=user.role==="seller"&&l.status!=="sold";
            const canDelete=user.role==="seller"&&l.status!=="sold";
            const canMarkSold=user.role==="seller"&&l.status==="active";
            const canResubmit=isRejected;
            
            return <div key={l.id} style={{background:"#fff",borderRadius:14,marginBottom:12,border:"1px solid #EBEBEB",overflow:"hidden"}}>
              <div style={{display:"flex",gap:12,padding:"12px"}}>
                <div style={{width:64,height:64,borderRadius:10,background:"#F0F0F0",overflow:"hidden",flexShrink:0}}>
                  {photo?<img src={photo} alt={l.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",opacity:.3}}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#1A1A1A",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.title}</div>
                  <div style={{fontSize:14,color:"#1428A0",fontWeight:700,marginBottom:4}}>{fmtKES(l.price)}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:700,background:l.status==="active"?"#DCFCE7":l.status==="sold"?"#F3F4F6":l.status==="rejected"?"#FEE2E2":"#FEF3C7",color:l.status==="active"?"#16a34a":l.status==="sold"?"#888":l.status==="rejected"?"#DC2626":"#D97706"}}>{l.status==="pending_review"?"Pending Review":l.status==="needs_changes"?"Needs Changes":l.status}</span>
{hasBuyerWaiting&&<span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:"#FFF7ED",color:"#C2410C"}}>High Demand</span>}
      {l.is_unlocked&&<span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:"#E0E7FF",color:"#1428A0"}}>Unlocked</span>}
                  </div>
                  {isRejected&&l.moderation_note&&<div style={{fontSize:11,color:"#DC2626",marginTop:6,background:"#FEE2E2",padding:"6px 10px",borderRadius:6}}>{l.moderation_note}</div>}
                </div>
              </div>
              
              {/* Action buttons row */}
              {user.role==="seller"&&<div style={{borderTop:"1px solid #F5F5F5",padding:"10px 12px",display:"flex",gap:8,flexWrap:"wrap"}}>
                {/* Primary: Unlock if needed and has buyer waiting */}
                {hasBuyerWaiting&&!l.is_unlocked&&<button className="btn bp sm" style={{borderRadius:8,flex:1,fontSize:12,fontWeight:700}} onClick={()=>setShowPayModal(l)}>
                  {l.free_unlock_approved?"Free Unlock":"Unlock — KSh 260"}
                </button>}
                
                {/* Unlock even without buyer (to make contact public) */}
                {needsUnlock&&!hasBuyerWaiting&&<button className="btn bg2 sm" style={{borderRadius:8,flex:1,fontSize:12}} onClick={()=>setShowPayModal(l)}>
                  Unlock Contact
                </button>}
                
                {/* Edit button */}
                {canEdit&&<button className="btn bs sm" style={{borderRadius:8,fontSize:12,minWidth:50}} onClick={()=>setEditingListing(l)}>Edit</button>}
                
                {/* Mark Sold button */}
                {canMarkSold&&<button className="btn bg2 sm" style={{borderRadius:8,fontSize:12,minWidth:70}} onClick={()=>setMarkSoldListing(l)}>Sold</button>}
                
                {/* Resubmit button for rejected */}
{canResubmit&&<button className="btn bg2 sm" style={{borderRadius:8,fontSize:12,flex:1}} onClick={async()=>{try{await api(`/api/listings/${l.id}/resubmit`,{method:"POST"},token);setListings(p=>p.map(x=>x.id===l.id?{...x,status:"pending_review",moderation_note:null}:x));notify("Resubmitted for review","success");}catch(e){notify(e.message,"error");}}}>Resubmit</button>}

      {/* Delete button */}
      {canDelete&&<button className="btn br2 sm" style={{borderRadius:8,fontSize:12,minWidth:60}} onClick={async()=>{if(!window.confirm("Delete this listing permanently?"))return;try{await api(`/api/listings/${l.id}`,{method:"DELETE"},token);setListings(p=>p.filter(x=>x.id!==l.id));notify("Listing deleted","success");}catch(err){notify(err.message,"error");}}}>Delete</button>}
              </div>}
              
              {/* Buyer view - just view button */}
              {user.role==="buyer"&&<div style={{borderTop:"1px solid #F5F5F5",padding:"10px 12px"}}>
                <button className="btn bs sm" style={{borderRadius:8,width:"100%",fontSize:12}} onClick={()=>setSelectedListing(l)}>View Listing →</button>
              </div>}
            </div>;
          });
        })()}
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
                  <div key={n.id} onClick={()=>markRead(n.id)} style={{background:n.is_read?"#fff":"#F0F4FF",borderRadius:12,padding:"14px",marginBottom:8,border:`1px solid ${n.is_read?"#EBEBEB":"#C7D2FE"}`,cursor:"pointer"}}>
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

      {/* ── MY REQUESTS SECTION ────────────────────────────────────────── */}
      {!loading&&mobSection==="myrequests"&&<div style={{padding:"16px"}}>
        <div style={{fontSize:16,fontWeight:700,color:"#1A1A1A",marginBottom:16}}>My Requests</div>
        {(myRequests||[]).length===0
        ?<div style={{textAlign:"center",padding:"60px 20px",color:"#AAAAAA"}}>
          <div style={{marginBottom:12,opacity:.2}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
          <div style={{fontWeight:700,marginBottom:6}}>No requests yet</div>
          <div style={{fontSize:13,marginBottom:20}}>Post a "What Buyers Want" ad to find sellers</div>
          <button className="btn bp" style={{borderRadius:10}} onClick={()=>setMobSection("requests")}>Find Sellers →</button>
        </div>
        :(myRequests||[]).map(r=>(
          <div key={r.id} style={{background:"#fff",borderRadius:14,marginBottom:10,border:"1px solid #EBEBEB",overflow:"hidden"}}>
            <div style={{padding:"14px"}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"#F0F4FF",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1428A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#1A1A1A",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</div>
                  <div style={{fontSize:13,color:"#1428A0",fontWeight:700}}>{fmtKES(r.budget||0)}</div>
                  <div style={{display:"flex",gap:8,marginTop:6,alignItems:"center"}}>
                    <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:r.status==="active"?"#DCFCE7":r.status==="fulfilled"?"#E0E7FF":"#F3F4F6",color:r.status==="active"?"#16a34a":r.status==="fulfilled"?"#1428A0":"#888"}}>{r.status}</span>
                    {r.pitch_count>0&&<span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:"#FFF7ED",color:"#C2410C"}}>{r.pitch_count} pitch{r.pitch_count!==1?"es":""}</span>}
                  </div>
                </div>
              </div>
              {r.description&&<div style={{fontSize:12,color:"#666",marginTop:10,paddingTop:10,borderTop:"1px solid #F5F5F5",lineHeight:1.5}}>{r.description}</div>}
            </div>
            <div style={{borderTop:"1px solid #F5F5F5",padding:"10px 14px",display:"flex",gap:8}}>
              {r.status==="active"&&<button className="btn bp sm" style={{borderRadius:8,flex:1,fontSize:12}} onClick={()=>setMobSection("requests")}>View Pitches</button>}
              {r.status==="active"&&<button className="btn br2 sm" style={{borderRadius:8,fontSize:12}} onClick={async()=>{if(!window.confirm("Close this request?"))return;try{await api(`/api/requests/${r.id}`,{method:"DELETE"},token);notify("Request closed","success");}catch(err){notify(err.message,"error");}}}>Close</button>}
            </div>
          </div>
        ))}
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
    {showPayModal&&<PayModal type="unlock" listingId={showPayModal.id} amount={Math.max(0,260-(showPayModal.unlock_discount||0))} purpose={`Reveal buyer: ${showPayModal.title}`} token={token} user={user} allowVoucher={true}
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
          totalRevenue:lArr.filter(l=>l.status==="sold").length*260,
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
  const [mobSection, setMobSection] = useState("home"); // home|ads|requests|notifications|settings

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
              <div style={{fontSize:12,color:"#888888"}}>{l.linked_request_id?"A buyer requested this item!":"A buyer has locked in!"} Pay KSh 260 to reveal the buyer's contact details.</div>
            </div>
            <button className="btn bp sm" onClick={()=>setShowPayModal(l)}>
              {(l.unlock_discount||0)>=260?"Reveal Buyer — FREE":l.unlock_discount>0?`Reveal Buyer — KSh ${260-(l.unlock_discount||0)}`:"Reveal Buyer — KSh 260"}
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
          <div key={i} onClick={()=>markRead(n.id)} style={{display:"flex",gap:14,padding:"16px 0",borderBottom:"1px solid #F5F5F5",cursor:"pointer",opacity:n.is_read?.7:1,transition:"opacity .15s"}}
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
                  :<button className="btn bp sm" onClick={()=>setShowPayModal(l)}>{l.linked_request_id?"Reveal Buyer":"Unlock"} — KSh 260</button>)}
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
    {showPayModal&&<PayModal type="unlock" listingId={showPayModal.id} amount={Math.max(0,260-(showPayModal.unlock_discount||0))} purpose={`Unlock buyer contact for: ${showPayModal.title}`} token={token} user={user} allowVoucher={true}
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
function MobileRequestsTab({user, token, notify, setModal}){
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [county, setCounty] = useState("");
  const [category, setCategory] = useState("");
  const [subcat, setSubcat] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [showPostModal, setShowPostModal] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const filterCat = CATS.find(c=>c.name===category);
  const hasFilters = search||county||category||subcat||minPrice||maxPrice||sort!=="newest";

  useEffect(()=>{
    setLoading(true);
    const p = new URLSearchParams({page:1, limit:50, sort});
    if(search) p.set("search", search);
    if(county) p.set("county", county);
    if(category) p.set("category", category);
    if(subcat) p.set("subcat", subcat);
    if(minPrice) p.set("min_price", minPrice);
    if(maxPrice) p.set("max_price", maxPrice);
    api(`/api/requests?${p}`).then(d=>{
      setRequests(d.requests||[]);
      setTotal(d.total||0);
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, [search, county, category, subcat, minPrice, maxPrice, sort]);

  const deleteReq = async (id)=>{
    if(!window.confirm("Delete this request?")) return;
    try{
      await api(`/api/requests/${id}`, {method:"DELETE"}, token);
      setRequests(p=>p.filter(r=>r.id!==id));
      setTotal(t=>t-1);
      notify("Request deleted","info");
    }catch(e){notify(e.message,"error");}
  };

  const handleIHaveThis = (request)=>{
    if(!user){setModal({type:"auth",mode:"login"});return;}
    if(user.role!=="seller"){
      if(window.confirm("You need a Seller account to respond to requests.\n\nSwitch to Seller now?")){
        api("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token)
          .then(d=>{
            const updated={...user,...d.user};
            localStorage.setItem("ws_user",JSON.stringify(updated));
            window.location.reload();
          }).catch(e=>notify(e.message,"error"));
      }
      return;
    }
    if(user.id===request.user_id){notify("This is your own request","warning");return;}
    setModal({type:"post", linkedRequest:request});
  };

  return <div style={{paddingBottom:80}}>
    {/* Sticky header */}
    <div style={{padding:"16px 16px 12px",borderBottom:"1px solid #F0F0F0",background:"#fff",position:"sticky",top:0,zIndex:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:2}}>Community</div>
          <div style={{fontSize:19,fontWeight:800,color:"#1A1A1A",letterSpacing:"-.01em"}}>What Buyers Want <span style={{fontSize:13,fontWeight:500,color:"#AAAAAA"}}>({total})</span></div>
        </div>
        <button
          style={{background:"#1428A0",color:"#fff",border:"none",padding:"10px 14px",borderRadius:10,fontSize:13,fontWeight:700,fontFamily:"var(--fn)",cursor:"pointer",whiteSpace:"nowrap"}}
          onClick={()=>{if(!user){setModal({type:"auth",mode:"login"});return;}setShowPostModal(true);}}>
          + Post
        </button>
      </div>
      {/* Search row */}
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <div style={{flex:1,display:"flex",border:"1.5px solid #E0E0E0",borderRadius:8,overflow:"hidden",background:"#FAFAFA"}}>
          <input
            style={{flex:1,padding:"9px 12px",border:"none",fontSize:13,fontFamily:"var(--fn)",outline:"none",background:"transparent"}}
            placeholder="Search requests..." value={searchInput}
            onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")setSearch(searchInput);}}/>
          <button onClick={()=>setSearch(searchInput)} style={{background:"#1428A0",color:"#fff",border:"none",padding:"0 12px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"var(--fn)"}}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2.5"/><path d="M20 20l-3-3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <button onClick={()=>setShowFilters(f=>!f)} style={{background:hasFilters?"#1428A0":"#fff",color:hasFilters?"#fff":"#555",border:"1.5px solid",borderColor:hasFilters?"#1428A0":"#E0E0E0",borderRadius:8,padding:"9px 12px",cursor:"pointer",fontFamily:"var(--fn)",fontSize:13,fontWeight:600,whiteSpace:"nowrap"}}>
          Filters{hasFilters&&<span style={{marginLeft:4,color:"#1428A0",fontWeight:700}}>- Active</span>}
        </button>
      </div>
      {/* Expanded filters */}
      {showFilters&&<div style={{display:"flex",flexDirection:"column",gap:8,paddingBottom:8}}>
        <div style={{display:"flex",gap:8}}>
          <select style={{flex:1,padding:"9px 10px",border:"1.5px solid #E0E0E0",borderRadius:8,fontSize:12,fontFamily:"var(--fn)",outline:"none",background:"#FAFAFA",color:"#555",cursor:"pointer"}}
            value={category} onChange={e=>{setCategory(e.target.value);setSubcat("");}}>
            <option value="">All Categories</option>
            {CATS.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          {filterCat&&<select style={{flex:1,padding:"9px 10px",border:"1.5px solid #E0E0E0",borderRadius:8,fontSize:12,fontFamily:"var(--fn)",outline:"none",background:"#FAFAFA",color:"#555",cursor:"pointer"}}
            value={subcat} onChange={e=>setSubcat(e.target.value)}>
            <option value="">All Subcategories</option>
            {filterCat.sub.map(s=><option key={s} value={s}>{s}</option>)}
          </select>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <select style={{flex:1,padding:"9px 10px",border:"1.5px solid #E0E0E0",borderRadius:8,fontSize:12,fontFamily:"var(--fn)",outline:"none",background:"#FAFAFA",color:"#555",cursor:"pointer"}}
            value={county} onChange={e=>setCounty(e.target.value)}>
            <option value="">All Counties</option>
            {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select style={{flex:1,padding:"9px 10px",border:"1.5px solid #E0E0E0",borderRadius:8,fontSize:12,fontFamily:"var(--fn)",outline:"none",background:"#FAFAFA",color:"#555",cursor:"pointer"}}
            value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="budget_desc">High Budget</option>
            <option value="budget_asc">Low Budget</option>
          </select>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input type="number" placeholder="Min KSh" value={minPrice} onChange={e=>setMinPrice(e.target.value)}
            style={{flex:1,padding:"9px 10px",border:"1.5px solid #E0E0E0",borderRadius:8,fontSize:12,fontFamily:"var(--fn)",outline:"none",background:"#FAFAFA"}}/>
          <input type="number" placeholder="Max KSh" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}
            style={{flex:1,padding:"9px 10px",border:"1.5px solid #E0E0E0",borderRadius:8,fontSize:12,fontFamily:"var(--fn)",outline:"none",background:"#FAFAFA"}}/>
          {hasFilters&&<button onClick={()=>{setSearchInput("");setSearch("");setCounty("");setCategory("");setSubcat("");setMinPrice("");setMaxPrice("");setSort("newest");}}
            style={{padding:"9px 12px",background:"#fff",border:"1.5px solid #E0E0E0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"var(--fn)",color:"#636363",whiteSpace:"nowrap"}}>Clear</button>}
        </div>
      </div>}
    </div>

    {/* Body */}
    <div style={{padding:"12px 12px 0"}}>
      {loading
        ? <div style={{textAlign:"center",padding:"48px 0"}}><Spin s="32px"/></div>
        : requests.length===0
          ? <div style={{textAlign:"center",padding:"48px 20px"}}>
              <div style={{marginBottom:12,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
              <div style={{fontWeight:700,fontSize:16,marginBottom:6,color:"#1A1A1A"}}>{hasFilters?"No requests match":"No requests yet"}</div>
              <div style={{fontSize:13,color:"#888",marginBottom:20}}>{hasFilters?"Try different filters":"Be the first to post what you're looking for"}</div>
              {!hasFilters&&<button
                style={{background:"#1428A0",color:"#fff",border:"none",padding:"12px 24px",borderRadius:10,fontSize:14,fontWeight:700,fontFamily:"var(--fn)",cursor:"pointer"}}
                onClick={()=>{if(!user){setModal({type:"auth",mode:"login"});return;}setShowPostModal(true);}}>
                + Post a Request
              </button>}
            </div>
          : <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {requests.map(r=><RequestCard key={r.id} r={r} user={user} token={token} notify={notify}
                onIHaveThis={handleIHaveThis}
                onDelete={id=>{setRequests(p=>p.filter(x=>x.id!==id));setTotal(t=>t-1);}}/>)}
            </div>}
    </div>

    {showPostModal&&<PostRequestModal
      token={token} notify={notify}
      onClose={()=>setShowPostModal(false)}
      onSuccess={r=>{setRequests(p=>[r,...p]);setTotal(t=>t+1);setShowPostModal(false);}}
    />}
  </div>;
}


// ── MOBILE LAYOUT ─────────────────────────────────────────────────────────────
function MobileLayout({
  user,token,notify,page,setPage,
  listings,total,loading,filter,setFilter,pg,setPg,
  stats,counties,modal,setModal,notifCount,
  mobileFiltersOpen,setMobileFiltersOpen,mobileTab,setMobileTab,
  openListing,handleLockIn,savedIds,onToggleSave,newSinceLastVisit
}){
  const photoMap={
    Electronics:"https://images.unsplash.com/photo-1498049794561-7780e7231661?w=140&h=140&fit=crop",
    Vehicles:"https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=140&h=140&fit=crop",
    Property:"https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=140&h=140&fit=crop",
    Fashion:"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=140&h=140&fit=crop",
    Furniture:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=140&h=140&fit=crop",
    "Home & Garden":"https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=140&h=140&fit=crop",
    Sports:"https://images.unsplash.com/photo-1517649763962-0c623066013b?w=140&h=140&fit=crop",
    "Baby & Kids":"https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=140&h=140&fit=crop",
    Books:"https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=140&h=140&fit=crop",
    Agriculture:"https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=140&h=140&fit=crop",
    Services:"https://images.unsplash.com/photo-1504148455328-c376907d081c?w=140&h=140&fit=crop",
    Jobs:"https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=140&h=140&fit=crop",
    Food:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=140&h=140&fit=crop",
    "Health & Beauty":"https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=140&h=140&fit=crop",
    Pets:"https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=140&h=140&fit=crop",
    Other:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=140&h=140&fit=crop",
  };

  const [swipeFeedIdx,setSwipeFeedIdx]=useState(null);
  const [ptrState,setPtrState]=useState("idle"); // idle | pulling | refreshing
  const [ptrY,setPtrY]=useState(0);
  const ptrStartY=useRef(0);
  const ptrActive=useRef(false);

  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    if (mobileTab === 'home') {
      const iv = setInterval(() => setHeroIdx(i => (i + 1) % 3), 6000);
      return () => clearInterval(iv);
    }
  }, [mobileTab]);


  // Pull-to-refresh handlers
  const onTouchStart=useCallback(e=>{
    if(window.scrollY===0&&e.touches[0]){ptrStartY.current=e.touches[0].clientY;ptrActive.current=true;}
  },[]);
  const onTouchMove=useCallback(e=>{
    if(!ptrActive.current)return;
    const dy=e.touches[0].clientY-ptrStartY.current;
    if(dy>0&&window.scrollY===0){setPtrY(Math.min(dy,80));setPtrState(dy>56?"pulling":"idle");}
    else{ptrActive.current=false;setPtrY(0);setPtrState("idle");}
  },[]);
  const onTouchEnd=useCallback(()=>{
    if(!ptrActive.current)return;
    ptrActive.current=false;
    if(ptrY>56){
      setPtrState("refreshing");setPtrY(56);
      setPg&&setPg(1);
      setTimeout(()=>{setPtrY(0);setPtrState("idle");},1200);
    }else{setPtrY(0);setPtrState("idle");}
  },[ptrY]);

  const postAd=()=>{
    if(!user){setModal({type:"auth",mode:"signup"});return;}
    setModal({type:"post"});
  };

  return <div className="mob-root" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

    {/* ── PULL TO REFRESH INDICATOR ── */}
    <div className="ptr-wrap" style={{height:ptrY,overflow:"hidden"}}>
      <div className="ptr-inner">
        {ptrState==="refreshing"
          ?<><div className="ptr-spinner"/><span>Refreshing...</span></>
          :<><svg className="ptr-arrow" style={{transform:`rotate(${Math.min(ptrY/56*180,180)}deg)`}} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg><span>{ptrY>56?"Release to refresh":"Pull to refresh"}</span></>}
      </div>
    </div>

    {/* ── TOP BAR ── */}
    <div className="mob-topbar">
      <div className="mob-logo" onClick={()=>{setPage("home");setFilter({cat:"",subcat:"",q:"",county:"",minPrice:"",maxPrice:"",sort:"newest"});setPg(1);setMobileTab("home");window.history.pushState({},"","/");}}>WekaSoko</div>
      <div className="mob-search">
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="#AAAAAA" strokeWidth="2"/><path d="M20 20l-3-3" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round"/></svg>
        <input placeholder="Search listings..." value={filter.q} onChange={e=>{setFilter(p=>({...p,q:e.target.value}));setPg(1);setMobileTab("home");}}/>
      </div>
      <div className="mob-notif" onClick={()=>{if(!user){setModal({type:"auth",mode:"login"});return;}setPage("dashboard");setMobileTab("dashboard");window.history.pushState({},"","/dashboard");}}>
        {user
          ?<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round"/></svg>
          :<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round"/></svg>}
        {notifCount>0&&<span style={{position:"absolute",top:4,right:4,width:8,height:8,background:"#1428A0",borderRadius:"50%",border:"2px solid #fff"}}/>}
      </div>
    </div>

    {/* ── CONTENT ── */}
    {(mobileTab==="home"||mobileTab==="search")&&<>

      {/* Hero banner — only on home tab, hidden in search mode */}
      {mobileTab==="home"&&!filter.q&&!filter.cat&&pg===1 && (
        loading ? <div style={{margin:"10px 12px"}}><HeroSkeleton/></div> : (
          <div className="depth-float" style={{overflow:"hidden",position:"relative",minHeight:320,margin:"10px 12px",display:"flex",flexDirection:"column", borderRadius: 24}}>
            {[
              {
                img: "https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=2070&auto=format&fit=crop",
                title: <>The Smart Way to <br/><span style={{color:"var(--a)"}}>Buy, Sell & Request</span></>,
                label: "KENYA'S LARGEST CLASSIFIEDS"
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
                zIndex: i === heroIdx ? 1 : 0,
                display: "flex", flexDirection: "column", justifyContent: "center"
              }}>
                <div style={{position:"absolute",inset:0,background:`url(${slide.img}) center/cover no-repeat`}} />
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.8) 100%), linear-gradient(to right, #fff 30%, transparent 100%)"}} />
                
                <div style={{position:"relative",zIndex:2,padding:24,display:"flex",flexDirection:"column",justifyContent:"center",height:"100%"}}>
                  <div className="glass" style={{display:"inline-flex",alignSelf:"flex-start",padding:"4px 10px",borderRadius:20,fontSize:9,fontWeight:800,color:"var(--a)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:12}}>
                    {slide.label}
                  </div>
                  <h2 style={{fontSize:24,fontWeight:900,letterSpacing:"-0.03em",lineHeight:1.1,marginBottom:12,color:"#111",fontFamily:"var(--fn)"}}>
                    {slide.title}
                  </h2>
                  <p style={{fontSize:13,color:"#4B4B5B",lineHeight:1.6,marginBottom:0,fontWeight:500,maxWidth:240}}>
                    The elite platform to flip, find, or request anything in Kenya.
                  </p>
                </div>
              </div>
            ))}

            <div style={{position:"absolute", bottom:16, left: 24, display:"flex", gap:6, zIndex: 10}}>
              {[0,1,2].map(i => (
                <div key={i} onClick={() => setHeroIdx(i)} style={{
                  width: i === heroIdx ? 16 : 6, height: 6, borderRadius: 10,
                  background: i === heroIdx ? "var(--a)" : "rgba(0,0,0,0.1)",
                  cursor: "pointer", transition: "all 0.3s ease"
                }} />
              ))}
            </div>
          </div>
        )
      )}


      {/* Hot Right Now — Premium mobile feed */}
      {mobileTab==="home"&&!filter.q&&!filter.cat&&pg===1 && (
        <div style={{margin: "24px 12px 10px"}}>
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:16, padding:"0 4px"}}>
             <div style={{width:4, height:18, background:"var(--a)", borderRadius:4}}/>
             <h3 style={{fontSize:18, fontWeight:900, letterSpacing:"-0.02em"}}>Hot Right Now</h3>
          </div>
          <div style={{display:"flex", gap:14, overflowX:"auto", padding: "4px 4px 20px", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch"}}>
             {listings.slice(0, 5).map(l => (
               <div key={l.id} className="depth-float" onClick={() => setSwipeFeedIdx(listings.indexOf(l))} style={{
                 flex: "0 0 280px", scrollSnapAlign: "start", background: "#fff", borderRadius: 24, overflow: "hidden", position: "relative"
               }}>
                 <img src={Array.isArray(l.photos)&&l.photos[0]?(typeof l.photos[0]==="string"?l.photos[0]:l.photos[0].url):CAT_PHOTOS[l.category]} alt={l.title} 
                   style={{width: "100%", height: 160, objectFit: "cover"}}/>
                 <div style={{padding:16}}>
                   <div style={{fontSize:14, fontWeight:800, color: "#111", marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{l.title}</div>
                   <div style={{fontSize:16, fontWeight:900, color: "var(--a)"}}>{fmtKES(l.price)}</div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* Categories — hidden in search mode */}
      {mobileTab==="home"&&<div className="mob-section">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 4px"}}>
          <div className="mob-section-title" style={{padding:0}}>Categories</div>
          {filter.cat&&<button onClick={()=>{setFilter(p=>({...p,cat:""}));setPg(1);}} style={{fontSize:12,color:"#1428A0",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--fn)",fontWeight:600}}>Clear</button>}
        </div>
        <div className="mob-cats">
          {CATS.map(c=>(
            <div key={c.name} className={`mob-cat${filter.cat===c.name?" active":""}`}
              onClick={()=>{setFilter(p=>({...p,cat:p.cat===c.name?"":c.name}));setPg(1);}}>
              <img src={photoMap[c.name]||photoMap.Other} alt={c.name}/>
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      </div>}

      {/* Filter row */}
      <div style={{display:"flex",gap:8,padding:"8px 12px",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <button onClick={()=>setMobileFiltersOpen(true)} style={{display:"flex",alignItems:"center",gap:6,background:"#fff",border:"1.5px solid #E0E0E0",borderRadius:20,padding:"8px 16px",fontSize:13,fontWeight:600,fontFamily:"var(--fn)",color:"#333",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M7 12h10M11 18h2" stroke="#333" strokeWidth="2.5" strokeLinecap="round"/></svg>
          Filters {(filter.county||filter.minPrice||filter.maxPrice||filter.sort!=="newest")?`(${[filter.county,filter.minPrice,filter.maxPrice].filter(Boolean).length+(filter.sort!=="newest"?1:0)})`:""}</button>
        {["newest","price_asc","price_desc","popular"].map(s=>(
          <button key={s} onClick={()=>{setFilter(p=>({...p,sort:s}));setPg(1);}} style={{background:filter.sort===s?"#1428A0":"#fff",color:filter.sort===s?"#fff":"#555",border:`1.5px solid ${filter.sort===s?"#1428A0":"#E0E0E0"}`,borderRadius:20,padding:"8px 14px",fontSize:12,fontWeight:600,fontFamily:"var(--fn)",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
            {s==="newest"?"Latest":s==="price_asc"?"Price: Low":s==="price_desc"?"Price: High":"Popular"}
          </button>
        ))}
      </div>

      {/* Listings */}
      <div className="mob-section" style={{marginTop:4}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px 10px"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1A1A1A",lineHeight:1.3}}>{filter.cat||"All Listings"} <span style={{color:"#AAAAAA",fontWeight:400,fontSize:13}}>({total})</span></div>
          {total>0&&listings.length>0&&<div style={{display:"flex",alignItems:"center",gap:6}}>
            <div className="live-dot"/>
            <span style={{fontSize:11,color:"#22c55e",fontWeight:600}}>Live</span>
          </div>}
        </div>
        {/* Zeigarnik progress — how many listings seen out of total */}
        {total>PER_PAGE&&listings.length>0&&<div style={{padding:"0 18px 10px"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#AAAAAA",marginBottom:5}}>
            <span>Showing {listings.length} of {total}</span>
            <span style={{fontWeight:600,color:"#1428A0"}}>{Math.round(listings.length/total*100)}%</span>
          </div>
          <div className="zeigarnik-track"><div className="zeigarnik-fill" style={{width:`${Math.round(listings.length/total*100)}%`}}/></div>
        </div>}
        {loading
          ? <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {Array.from({length: 8}).map((_, i) => <div key={i} style={{padding:"6px 1px"}}><ListingCardSkeleton listView={true}/></div>)}
            </div>
          : listings.length===0

            ?<div style={{textAlign:"center",padding:"48px 20px",color:"#AAAAAA"}}>
                <div style={{marginBottom:14,opacity:.25,display:"flex",justifyContent:"center"}}>{Ic.search(44,"currentColor")}</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:6,color:"#1A1A1A"}}>No listings found</div>
                <div style={{fontSize:13,lineHeight:1.65,marginBottom:20}}>{filter.cat||filter.q?"Try different filters or clear your search":"Be the first to post something here"}</div>
                {filter.cat||filter.q
                  ?<button onClick={()=>{setFilter(p=>({...p,cat:"",q:""}));setPg(1);}} className="btn bs sm" style={{borderRadius:8,marginBottom:12}}>Clear Filters</button>
                  :null}
                <div><button onClick={postAd} className="btn bp sm" style={{borderRadius:8}}>+ Post an Ad for Free</button></div>
              </div>
            :<div className="mob-cards">
              {listings.map(l=>{
                const photo=Array.isArray(l.photos)?l.photos.find(p=>typeof p==="string")||l.photos[0]?.url||null:null;
                const isNew=Date.now()-new Date(l.created_at)<12*3600000;
                return <div key={l.id} className="mob-lcard" onClick={()=>openListing(l)} style={{position:"relative"}}>
                  <div className="mob-lcard-img" style={{position:"relative"}}>
                    {photo?<img src={photo} alt={l.title}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#F2F2F7",opacity:.6}}>{Ic.image(24,"#CCCCCC")}</div>}
{isNew&&<div style={{position:"absolute",bottom:4,left:4,background:"#10b981",color:"#fff",fontSize:8,fontWeight:800,padding:"2px 6px",borderRadius:4,letterSpacing:".04em"}}>NEW</div>}
                  </div>
                  <div className="mob-lcard-body">
                    <div className="mob-lcard-cat">{l.category}</div>
                    <div className="mob-lcard-title">{l.title}</div>
                    <div className="mob-lcard-price">{fmtKES(l.price)}</div>
                    <div className="mob-lcard-meta">
                      {l.location&&<span style={{display:"flex",alignItems:"center",gap:3}}>{Ic.mapPin(10,"currentColor")} {l.location}</span>}
                      {l.interest_count>0&&<span style={{color:"#E8194B",fontWeight:700,display:"flex",alignItems:"center",gap:3}}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#E8194B" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {l.interest_count}
                      </span>}
                      <span style={{marginLeft:"auto"}}>{ago(l.created_at)}</span>
                    </div>
                  </div>
                  {onToggleSave&&<HeartBtn saved={savedIds?.has(l.id)} onToggle={e=>{if(e&&e.stopPropagation)e.stopPropagation();onToggleSave&&onToggleSave(l);}} size={14} style={{position:"absolute",top:12,right:12,width:32,height:32,boxShadow:"0 1px 4px rgba(0,0,0,.15)"}}/>}
                  {l.locked_buyer_id&&!l.is_unlocked&&<div style={{position:"absolute",top:12,right:12,width:8,height:8,background:"#1428A0",borderRadius:"50%"}}/>}
                </div>;
              })}
            </div>}
        {/* Pagination */}
        {Math.ceil(total/PER_PAGE)>1&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderTop:"1px solid #F0F0F0"}}>
          <button onClick={()=>{if(pg>1){setPg(p=>p-1);window.scrollTo(0,0);}}} disabled={pg<=1} className="btn bs sm" style={{borderRadius:8,opacity:pg<=1?.4:1}}>Prev</button>
          <span style={{fontSize:13,color:"#AAAAAA",fontWeight:500}}>Page {pg} of {Math.ceil(total/PER_PAGE)}</span>
          <button onClick={()=>{if(pg<Math.ceil(total/PER_PAGE)){setPg(p=>p+1);window.scrollTo(0,0);}}} disabled={pg>=Math.ceil(total/PER_PAGE)} className="btn bp sm" style={{borderRadius:8,opacity:pg>=Math.ceil(total/PER_PAGE)?.4:1}}>Next</button>
        </div>}
      </div>

      {/* Trust strip */}
      <div className="mob-trust">
        {[["check","Free to post"],["check","Anonymous chat"],["check","M-Pesa escrow"]].map(([icon,txt])=>(
          <span key={txt}><span style={{color:"#1428A0",display:"inline-flex",alignItems:"center"}}>{icon==="check"?<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><polyline points="20 6 9 17 4 12"/></svg>:icon}</span>{txt}</span>
        ))}
      </div>

    </>}

    {/* ── SWIPE OVERLAY — opened when user taps a listing card ── */}
    {swipeFeedIdx!==null&&<div style={{position:"fixed",inset:0,zIndex:1000}}>
      <SwipeFeed
        user={user} token={token}
        onOpen={(l)=>{setSwipeFeedIdx(null);openListing(l);}}
        onLockIn={handleLockIn}
        onMessage={(l)=>{if(!user){setModal({type:"auth",mode:"login"});return;}setModal({type:"chat",listing:l});}}
        savedIds={savedIds} onToggleSave={onToggleSave}
        onSignIn={()=>setModal({type:"auth",mode:"login"})}
        onPostAd={()=>{setSwipeFeedIdx(null);postAd();}}
        initialListings={listings}
        startIndex={swipeFeedIdx}
        onClose={()=>setSwipeFeedIdx(null)}
        filter={filter}
      />
    </div>}

    {/* ── DISCOVER TAB — fixed full-screen so SwipeFeed touch events aren't blocked by mob-root ── */}
    {mobileTab==="discover"&&<div style={{position:"fixed",inset:0,zIndex:1000}}>
      <SwipeFeed
        user={user} token={token}
        onOpen={openListing} onLockIn={handleLockIn}
        onMessage={(l)=>{if(!user){setModal({type:"auth",mode:"login"});return;}setModal({type:"chat",listing:l});}}
        savedIds={savedIds} onToggleSave={onToggleSave}
        onSignIn={()=>setModal({type:"auth",mode:"login"})}
        onPostAd={()=>{
          if(!user){setModal({type:"auth",mode:"signup"});return;}
          if(user.role==="buyer"){
            if(typeof window!=="undefined"&&window.confirm("Switch to Seller to post ads?"))
              api("/api/auth/role",{method:"PATCH",body:JSON.stringify({role:"seller"})},token)
                .then(()=>window.location.reload())
                .catch(e=>notify(e.message,"error"));
            return;
          }
          setModal({type:"post"});
        }}
      />
    </div>}
    {/* ── REQUESTS TAB ── */}
    {mobileTab==="requests"&&<MobileRequestsTab
      user={user} token={token} notify={notify}
      setModal={setModal}
    />}


    {/* ── BOTTOM TAB BAR ── */}
    <div className="mob-bottombar">
      {[
        {id:"home", icon:Ic.home, label:"Home"},
        {id:"discover", icon:Ic.search, label:"Browse"},
        {id:"post", icon:Ic.plus, label:"Post Ad", isPost:true},
        {id:"dashboard", icon:Ic.user, label:"Account"},
        {id:"requests", icon:Ic.checklist, label:"Requests"},
      ].map((t) => {
        const isActive = t.isPost ? false : mobileTab === t.id;
        return (
          <button key={t.id}
            className={`mob-tab${isActive ? " on" : ""}${t.isPost ? " post-btn" : ""}`}
            onClick={() => {
              if(t.isPost){ postAd(); return; }
              if(t.id==="dashboard"){ if(!user){setModal({type:"auth",mode:"login"});return;} setPage("dashboard"); window.history.pushState({},"","/dashboard"); }
              else if(t.id==="requests"){ setPage("home"); window.history.pushState({},"","/requests"); }
              else { setPage("home"); }
              setMobileTab(t.id);
            }}>
            {t.isPost
              ? <><div className="post-circle">{t.icon(20,"#fff")}</div><span>{t.label}</span></>
              : <>{t.icon(22,"currentColor")}<span>{t.label}</span></>
            }
          </button>
        );
      })}
    </div>

    {/* ── FILTERS DRAWER ── */}
    {mobileFiltersOpen&&<div className="mob-drawer" onClick={e=>{if(e.target===e.currentTarget)setMobileFiltersOpen(false);}}>
      <div className="mob-drawer-bg" onClick={()=>setMobileFiltersOpen(false)}/>
      <div className="mob-drawer-panel">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:17,fontWeight:700,color:"#1A1A1A"}}>Filters</div>
          <button onClick={()=>setMobileFiltersOpen(false)} style={{background:"#F5F5F5",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>Close</button>
        </div>
        <div className="mob-filter-row">
          <div className="mob-filter-label">County</div>
          <select className="inp" style={{borderRadius:10}} value={filter.county} onChange={e=>{setFilter(p=>({...p,county:e.target.value}));setPg(1);}}>
            <option value="">All Counties</option>
            {counties.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="mob-filter-row">
          <div className="mob-filter-label">Price Range (KSh)</div>
          <div style={{display:"flex",gap:10}}>
            <input className="inp" style={{borderRadius:10}} placeholder="Min" type="number" value={filter.minPrice} onChange={e=>{setFilter(p=>({...p,minPrice:e.target.value}));setPg(1);}}/>
            <input className="inp" style={{borderRadius:10}} placeholder="Max" type="number" value={filter.maxPrice} onChange={e=>{setFilter(p=>({...p,maxPrice:e.target.value}));setPg(1);}}/>
          </div>
        </div>
        <div className="mob-filter-row">
          <div className="mob-filter-label">Sort By</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["newest","Latest"],["oldest","Oldest"],["price_asc","Price: Low"],["price_desc","Price: High"],["popular","Most Viewed"],["expiring","Expiring Soon"]].map(([val,lbl])=>(
              <button key={val} onClick={()=>{setFilter(p=>({...p,sort:val}));setPg(1);}} style={{padding:"10px",border:`1.5px solid ${filter.sort===val?"#1428A0":"#E0E0E0"}`,borderRadius:8,background:filter.sort===val?"#EEF2FF":"#fff",color:filter.sort===val?"#1428A0":"#555",fontSize:13,fontWeight:filter.sort===val?700:500,fontFamily:"var(--fn)",cursor:"pointer"}}>{lbl}</button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button onClick={()=>{setFilter({cat:"",q:"",county:"",minPrice:"",maxPrice:"",sort:"newest"});setPg(1);setMobileFiltersOpen(false);}} className="btn bs" style={{flex:1,borderRadius:10}}>Clear All</button>
          <button onClick={()=>setMobileFiltersOpen(false)} className="btn bp" style={{flex:1,borderRadius:10}}>Show Results ({total})</button>
        </div>
      </div>
    </div>}

  </div>;
}


// ── SWIPE FEED — vertical scroll between ads, tap edges to browse photos ──────
function SwipeFeed({user,token,onOpen,onLockIn,onMessage,savedIds,onToggleSave,onSignIn,onPostAd,initialListings,startIndex,onClose,filter}){
  const [listings,setListings]=useState(initialListings&&initialListings.length?[...initialListings]:[]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(!(initialListings&&initialListings.length));
  const [idx,setIdx]=useState(typeof startIndex==="number"?startIndex:0);
  const [panelIdx,setPanelIdx]=useState(0); // horizontal panel index (photos + info panel)
  const [dragY,setDragY]=useState(0);
  const [dragX,setDragX]=useState(0);
  const [animating,setAnimating]=useState(false);
  const [animatingH,setAnimatingH]=useState(false);
  const [autoScroll,setAutoScroll]=useState(false);
  const [shareModal,setShareModal]=useState(null);
  const animatingH_=useRef(false);
  const containerRef=useRef(null);
  const fetching=useRef(false);
  const animating_=useRef(false);
  const startYRef=useRef(null);
  const startXRef=useRef(null);
  const swipeDir=useRef(null);
  const autoScrollRef=useRef(null);
  const panelIdxRef=useRef(0);
  const PER=20;

  // Keep panelIdxRef in sync so autoscroll interval always reads fresh value
  useEffect(()=>{panelIdxRef.current=panelIdx;},[panelIdx]);

  // Autoscroll: cycle through each photo of current ad, then move to next ad
  useEffect(()=>{
    if(autoScroll){
      autoScrollRef.current=setInterval(()=>{
        if(animating_.current||animatingH_.current)return;
        const l=listings[idx];
        const photos=Array.isArray(l?.photos)?l.photos.map(p=>typeof p==="string"?p:p?.url).filter(Boolean):[];
        const photoSrcs=photos.length>0?photos:[null];
        const totalPanels=photoSrcs.length+1;
        if(panelIdxRef.current<totalPanels-1){
          // advance to next photo panel
          animatingH_.current=true;setAnimatingH(true);
          setPanelIdx(p=>p+1);
          setTimeout(()=>{setAnimatingH(false);animatingH_.current=false;},320);
        } else {
          // all photos shown — go to next listing
          snapTo(idx+1);
        }
      },3000);
    } else {
      clearInterval(autoScrollRef.current);
    }
    return()=>clearInterval(autoScrollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[autoScroll,idx]);

  // Reset panel index whenever the active ad changes
  useEffect(()=>{setPanelIdx(0);setDragX(0);},[idx]);

  // Build filter query params (respects active category/search/county)
  const filterQuery=useMemo(()=>{
    if(!filter)return'';
    const p=new URLSearchParams();
    if(filter.cat)p.set('category',filter.cat);
    if(filter.subcat)p.set('subcat',filter.subcat);
    if(filter.q)p.set('search',filter.q);
    if(filter.county)p.set('county',filter.county);
    if(filter.minPrice)p.set('minPrice',filter.minPrice);
    if(filter.maxPrice)p.set('maxPrice',filter.maxPrice);
    const qs=p.toString();
    return qs?'&'+qs:'';
  },[filter]);

  // Initial data fetch
  useEffect(()=>{
    if(initialListings&&initialListings.length){
      api(`/api/listings?sort=newest&limit=1&page=1${filterQuery}`).then(d=>setTotal(d.total||0)).catch(()=>{});
    } else {
      api(`/api/listings?sort=newest&limit=${PER}&page=1${filterQuery}`)
        .then(d=>{setListings(d.listings||[]);setTotal(d.total||0);})
        .catch(()=>{}).finally(()=>setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Non-passive touchmove — direction-locked: vertical = track drag, horizontal = ignore
  useEffect(()=>{
    const el=containerRef.current;
    if(!el)return;
    const onMove=e=>{
      if(startYRef.current===null||animating_.current)return;
      const dx=e.touches[0].clientX-startXRef.current;
      const dy=e.touches[0].clientY-startYRef.current;
      // Lock direction on first 8px of movement
      if(swipeDir.current===null){
        if(Math.abs(dx)>8||Math.abs(dy)>8){
          swipeDir.current=Math.abs(dy)>=Math.abs(dx)?'vertical':'horizontal';
        }
        return; // wait until direction is decided
      }
      if(swipeDir.current==='horizontal'){
        e.preventDefault();
        setDragX(dx); // positive = swiping right (towards prev panel)
        return;
      }
      if(swipeDir.current!=='vertical')return;
      e.preventDefault();
      // Elastic resistance beyond ±120px
      const clamped=dy>0?Math.min(dy,120+Math.max(0,dy-120)*0.2):Math.max(dy,-120+Math.min(0,dy+120)*0.2);
      setDragY(clamped);
    };
    el.addEventListener('touchmove',onMove,{passive:false});
    return()=>el.removeEventListener('touchmove',onMove);
  },[]);

  const fetchMore=()=>{
    if(fetching.current)return;
    fetching.current=true;
    const pg=Math.ceil(listings.length/PER)+1;
    api(`/api/listings?sort=newest&limit=${PER}&page=${pg}${filterQuery}`)
      .then(d=>{
        setTotal(d.total||0);
        setListings(prev=>{const ids=new Set(prev.map(l=>l.id));return[...prev,...(d.listings||[]).filter(l=>!ids.has(l.id))];});
      }).catch(()=>{}).finally(()=>{fetching.current=false;});
  };

  const snapTo=(newIdx)=>{
    if(animating_.current||newIdx<0||newIdx>=listings.length)return false;
    animating_.current=true;
    setAnimating(true);
    setDragY(newIdx>idx?-window.innerHeight:window.innerHeight);
    setTimeout(()=>{
      setIdx(newIdx);
      setDragY(0);
      setAnimating(false);
      animating_.current=false;
      if(newIdx>=listings.length-5&&listings.length<total)fetchMore();
    },300);
    return true;
  };

  const onTouchStart=e=>{
    if(animating_.current)return;
    // Pause autoscroll while user is manually swiping
    clearInterval(autoScrollRef.current);
    startYRef.current=e.touches[0].clientY;
    startXRef.current=e.touches[0].clientX;
    swipeDir.current=null;
  };
  const onTouchEnd=e=>{
    if(startYRef.current===null||animating_.current)return;
    const dy=startYRef.current-e.changedTouches[0].clientY;
    const dx=e.changedTouches[0].clientX-startXRef.current; // positive = swiped right (prev panel)
    const wasVertical=swipeDir.current==='vertical';
    const wasHorizontal=swipeDir.current==='horizontal';
    startYRef.current=null;
    swipeDir.current=null;
    if(wasHorizontal){
      setDragX(0);
      const l=listings[idx];
      const photos=Array.isArray(l?.photos)?l.photos.map(p=>typeof p==="string"?p:p?.url).filter(Boolean):[];
      const photoSrcs=photos.length>0?photos:[null];
      const totalPanels=photoSrcs.length+1; // photos + info panel
      if(!animatingH_.current){
        if(dx<-55&&panelIdx<totalPanels-1){ // swiped left → advance to next panel
          animatingH_.current=true;setAnimatingH(true);setPanelIdx(p=>p+1);
          setTimeout(()=>{setAnimatingH(false);animatingH_.current=false;},320);
        } else if(dx>55&&panelIdx>0){ // swiped right → go back to prev panel
          animatingH_.current=true;setAnimatingH(true);setPanelIdx(p=>p-1);
          setTimeout(()=>{setAnimatingH(false);animatingH_.current=false;},320);
        }
      }
      return;
    }
    if(!wasVertical){setDragY(0);return;}
    if(dy>55&&idx<listings.length-1){snapTo(idx+1);}
    else if(dy<-55&&idx>0){snapTo(idx-1);}
    else{setAnimating(true);setDragY(0);setTimeout(()=>setAnimating(false),280);}
  };

  // Render a single card slide (offset: -1=above, 0=current, +1=below)
  const renderSlide=(offset)=>{
    const cardIdx=idx+offset;
    if(cardIdx<0||cardIdx>=listings.length)return null;
    const l=listings[cardIdx];
    // Build ordered photo array
    const photos=Array.isArray(l.photos)
      ?l.photos.map(p=>typeof p==="string"?p:p?.url).filter(Boolean)
      :[];
    const photoSrcs=photos.length>0?photos:[null]; // at least one panel (placeholder)
    const totalPanels=photoSrcs.length+1; // photo panels + 1 info panel
    const isNew=Date.now()-new Date(l.created_at)<12*3600000;
    const isExpiring=l.expires_at&&new Date(l.expires_at)-Date.now()<3*86400000&&new Date(l.expires_at)>Date.now();
    const isSaved=savedIds?.has(l.id);
    const baseY=offset*100;
    const ty=`calc(${baseY}vh + ${dragY}px)`;
    // Horizontal drag — only applied to the current slide
    const hDrag=offset===0?dragX:0;
    const activePanelIdx=offset===0?panelIdx:0;
    return(
      <div key={l.id} style={{position:"absolute",inset:0,transform:`translateY(${ty})`,transition:animating?"transform .3s cubic-bezier(.25,.46,.45,.94)":"none",willChange:"transform",background:"#000",overflow:"hidden"}}>
        {/* Horizontal panel strip */}
        {photoSrcs.map((src,panelI)=>{
          const isCurrentPanel=panelI===activePanelIdx;
          const tx=`calc(${(panelI-activePanelIdx)*100}% + ${hDrag}px)`;
          const isLastPhoto=panelI===photoSrcs.length-1;
          const hasNoPhoto=!src;
          // Progressive info content per panel
          const infoLayer=panelI===0
            ?{// Panel 0: title + price
              top:<><div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.7)",marginBottom:4}}>{l.category}{l.subcat?` · ${l.subcat}`:""}</div><div style={{fontSize:20,fontWeight:800,color:"#fff",lineHeight:1.2,marginBottom:6,textShadow:"0 1px 8px rgba(0,0,0,.8)"}}>{l.title}</div><div style={{fontSize:28,fontWeight:800,color:"#fff",letterSpacing:"-.01em",textShadow:"0 1px 8px rgba(0,0,0,.8)"}}>KSh {Number(l.price).toLocaleString("en-KE")}</div></>,
              btns:null}
            :panelI===1&&l.description
            ?{// Panel 1: full description in scrollable frosted card
              top:null,
              card:<div style={{position:"absolute",bottom:80,left:0,right:0,maxHeight:"58vh",overflowY:"auto",WebkitOverflowScrolling:"touch",background:"rgba(10,10,10,.82)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRadius:"20px 20px 0 0",padding:"18px 18px 14px"}}>
                <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,.3)",margin:"0 auto 16px"}}/>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.45)",marginBottom:10}}>About this item</div>
                <p style={{fontSize:15,color:"rgba(255,255,255,.95)",lineHeight:1.75,margin:"0 0 14px",whiteSpace:"pre-wrap"}}>{l.description}</p>
                {l.county&&<div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginBottom:10,display:"flex",alignItems:"center",gap:5}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{l.county}</div>}
              </div>,
              btns:null}
            :{// Panel 2+ / last: seller & why selling
              top:<>{l.reason_for_sale&&<><div style={{fontSize:11,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"rgba(255,255,255,.55)",marginBottom:4}}>Why selling</div><div style={{fontSize:14,color:"rgba(255,255,255,.9)",lineHeight:1.55,textShadow:"0 1px 4px rgba(0,0,0,.7)",marginBottom:8}}>{l.reason_for_sale.length>100?l.reason_for_sale.slice(0,100)+"…":l.reason_for_sale}</div></>}<div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>{l.county&&<span style={{background:"rgba(255,255,255,.15)",color:"rgba(255,255,255,.9)",fontSize:12,fontWeight:600,padding:"4px 10px",borderRadius:20,backdropFilter:"blur(4px)"}}>{l.county}</span>}{l.seller_avg_rating>0&&<span style={{background:"rgba(255,255,255,.15)",color:"rgba(255,255,255,.9)",fontSize:12,fontWeight:600,padding:"4px 10px",borderRadius:20,backdropFilter:"blur(4px)",display:"flex",alignItems:"center",gap:4}}><svg width="11" height="11" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>{Number(l.seller_avg_rating).toFixed(1)}</span>}<span style={{background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",fontSize:12,padding:"4px 10px",borderRadius:20}}>{ago(l.created_at)}</span></div></>,
              btns:null};
          return(
            <div key={panelI} style={{position:"absolute",inset:0,transform:`translateX(${tx})`,transition:animatingH?"transform .3s cubic-bezier(.25,.46,.45,.94)":"none",willChange:"transform",background:hasNoPhoto?"#F2F2F2":"#000",overflow:"hidden"}}>
              {/* Image or placeholder */}
              {src
                ?<img src={src} alt={l.title} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain"}}/>
                :<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,background:"#F2F2F2"}}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span style={{fontSize:13,fontWeight:600,color:"#AAAAAA",letterSpacing:".04em"}}>No photos uploaded</span>
                  </div>}
              {/* Dark gradient only when there's a real image */}
              {src&&<div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.3) 0%,transparent 28%,transparent 40%,rgba(0,0,0,.88) 100%)",pointerEvents:"none"}}/>}
              {/* Overlays — only on the active panel of the current slide */}
              {offset===0&&isCurrentPanel&&(
                <>
                  {/* Panel dots */}
                  {totalPanels>1&&<div style={{position:"absolute",top:onClose?58:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:4,zIndex:15,pointerEvents:"none"}}>
                    {Array.from({length:totalPanels},(_,di)=>{
                      const isInfo=di===totalPanels-1;
                      const isAct=di===activePanelIdx;
                      return<div key={di} style={{width:isAct?20:5,height:5,borderRadius:3,background:isAct?(isInfo?"#1428A0":"#fff"):isInfo?"rgba(20,40,160,.45)":"rgba(255,255,255,.45)",transition:"all .2s"}}/>;
                    })}
                  </div>}
                  {/* Badges */}
                  <div style={{position:"absolute",top:onClose?60:14,left:14,display:"flex",flexDirection:"column",gap:5,zIndex:10}}>
                    {isNew&&<div style={{background:"#10b981",color:"#fff",fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:6,letterSpacing:".06em"}}>NEW</div>}
                    {isExpiring&&<div style={{background:"#f59e0b",color:"#fff",fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:6}}>EXPIRING</div>}
                    {l.status==="sold"&&<div style={{background:"#111",color:"#fff",fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:6}}>SOLD</div>}
                  </div>
                  {/* Progressive bottom info overlay */}
                  {infoLayer.card
                    /* Description panel: full scrollable frosted card replaces the overlay */
                    ?<div style={{position:"absolute",inset:0,zIndex:10,pointerEvents:"none"}}>
                        <div style={{position:"absolute",inset:0,pointerEvents:"auto"}}>{infoLayer.card}</div>
                      </div>
                    :<div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 16px 110px",zIndex:10}}>
                        {infoLayer.top}
                        {isLastPhoto&&totalPanels>1&&<div style={{fontSize:11,fontWeight:700,color:src?"rgba(255,255,255,.55)":"#AAAAAA",marginTop:8,marginBottom:10,textAlign:"center",letterSpacing:".04em"}}>← Swipe left for full details →</div>}
                        {infoLayer.btns&&<div style={{display:"flex",gap:8,marginTop:isLastPhoto&&totalPanels>1?0:12}}>{infoLayer.btns}</div>}
                      </div>}
                  {/* Swipe-up hint */}
                  {idx===0&&listings.length>1&&activePanelIdx===0&&<div style={{position:"absolute",bottom:80,left:"50%",transform:"translateX(-50%)",color:src?"rgba(255,255,255,.3)":"#CCCCCC",fontSize:11,textAlign:"center",pointerEvents:"none",zIndex:5,whiteSpace:"nowrap"}}>↑ swipe up for next ad</div>}
                </>
              )}
            </div>
          );
        })}
        {/* Info panel — the last horizontal panel */}
        {offset===0&&(()=>{
          const panelI=photoSrcs.length;
          const isCurrentPanel=panelI===activePanelIdx;
          const tx=`calc(${(panelI-activePanelIdx)*100}% + ${hDrag}px)`;
          return(
            <div style={{position:"absolute",inset:0,transform:`translateX(${tx})`,transition:animatingH?"transform .3s cubic-bezier(.25,.46,.45,.94)":"none",willChange:"transform",background:"#FFFFFF",overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch"}}>
              {/* Dot strip — pinned at top */}
              {totalPanels>1&&<div style={{position:"sticky",top:0,zIndex:20,background:"#fff",paddingTop:onClose?14:12,paddingBottom:10,display:"flex",justifyContent:"center",gap:4,borderBottom:"1px solid #F0F0F0"}}>
                {Array.from({length:totalPanels},(_,di)=>{
                  const isInf=di===totalPanels-1;
                  const isAct=di===activePanelIdx;
                  return<div key={di} style={{width:isAct?20:5,height:5,borderRadius:3,background:isAct?"#1428A0":isInf?"rgba(20,40,160,.3)":"rgba(0,0,0,.15)",transition:"all .2s"}}/>;
                })}
              </div>}

              {/* Header: title + price */}
              <div style={{padding:"18px 18px 0"}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#1428A0",marginBottom:4}}>{l.category}{l.subcat?` · ${l.subcat}`:""}</div>
                <div style={{fontSize:21,fontWeight:800,color:"#1A1A1A",lineHeight:1.25,marginBottom:6}}>{l.title}</div>
                <div style={{fontSize:30,fontWeight:800,color:"#1428A0",letterSpacing:"-.02em",marginBottom:12}}>KSh {Number(l.price).toLocaleString("en-KE")}</div>

                {/* Meta pills */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                  {l.county&&<span style={{background:"#F0F0F0",color:"#444",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:20,display:"flex",alignItems:"center",gap:4}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{l.county}</span>}
                  <span style={{background:"#F0F0F0",color:"#888",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:20}}>{ago(l.created_at)}</span>
                  {l.location&&l.location!==l.county&&<span style={{background:"#F0F0F0",color:"#888",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:20}}>{l.location}</span>}
                  {isNew&&<span style={{background:"#10b981",color:"#fff",fontSize:12,fontWeight:700,padding:"5px 12px",borderRadius:20}}>New</span>}
                  {isExpiring&&<span style={{background:"#f59e0b",color:"#fff",fontSize:12,fontWeight:700,padding:"5px 12px",borderRadius:20}}>Expiring soon</span>}
                </div>

                {/* CTA buttons — always visible at top of detail panel */}
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <button onClick={e=>{e.stopPropagation();if(!user){onSignIn&&onSignIn();return;}onLockIn&&onLockIn(l);}} style={{flex:1,background:"#1428A0",color:"#fff",border:"none",padding:"14px",fontSize:14,fontWeight:700,borderRadius:12,cursor:"pointer",fontFamily:"var(--fn)",boxShadow:"0 4px 14px rgba(20,40,160,.35)"}}>I'm Interested</button>
                  <button onClick={e=>{e.stopPropagation();if(!user){onSignIn&&onSignIn();return;}onMessage&&onMessage(l);}} style={{flex:1,background:"#F5F5F5",color:"#1A1A1A",border:"none",padding:"14px",fontSize:14,fontWeight:700,borderRadius:12,cursor:"pointer",fontFamily:"var(--fn)"}}>Message Seller</button>
                </div>
                <button onClick={e=>{e.stopPropagation();onOpen&&onOpen(l);}} style={{width:"100%",background:"none",color:"#1428A0",border:"1.5px solid #1428A0",padding:"12px",fontSize:13,fontWeight:700,borderRadius:12,cursor:"pointer",fontFamily:"var(--fn)",marginBottom:8}}>Open Full Listing →</button>
                <button onClick={e=>{e.stopPropagation();setShareModal(l);}} style={{width:"100%",background:"none",color:"#636363",border:"1.5px solid #EBEBEB",padding:"12px",fontSize:13,fontWeight:700,borderRadius:12,cursor:"pointer",fontFamily:"var(--fn)",marginBottom:18,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Share this Listing</button>
              </div>

              {/* Divider */}
              <div style={{height:8,background:"#F5F5F5",margin:"0"}}/>

              {/* Description — full, no clamp */}
              {l.description&&<div style={{padding:"16px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:8}}>Description</div>
                <p style={{fontSize:14,color:"#1D1D1D",lineHeight:1.8,margin:0,whiteSpace:"pre-wrap"}}>{l.description}</p>
              </div>}

              {/* Reason for sale */}
              {l.reason_for_sale&&<>
                <div style={{height:1,background:"#F0F0F0",margin:"0 18px"}}/>
                <div style={{padding:"14px 18px"}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:8}}>Why Selling</div>
                  <p style={{fontSize:14,color:"#1D1D1D",lineHeight:1.7,margin:0}}>{l.reason_for_sale}</p>
                </div>
              </>}

              {/* Divider */}
              <div style={{height:8,background:"#F5F5F5"}}/>

              {/* Seller info */}
              <div style={{padding:"16px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:10}}>Seller</div>
                <div style={{display:"flex",alignItems:"center",gap:12,background:"#F8F8F8",borderRadius:12,padding:"14px"}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#1428A0,#6c63ff)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{color:"#fff",fontWeight:800,fontSize:17}}>{(l.seller_anon||l.anon_tag||l.seller_name||"?")[0].toUpperCase()}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#1A1A1A"}}>{l.seller_anon||l.anon_tag||"Anonymous Seller"}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
                      {l.seller_avg_rating>0&&<span style={{fontSize:12,color:"#8B6400",fontWeight:600,display:"flex",alignItems:"center",gap:3}}><svg width="11" height="11" viewBox="0 0 24 24" fill="#8B6400" stroke="#8B6400" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>{Number(l.seller_avg_rating).toFixed(1)} ({l.seller_review_count||0} reviews)</span>}
                      {l.response_rate!=null&&<span style={{fontSize:12,color:"#555",fontWeight:500}}>{Math.round(l.response_rate)}% response rate</span>}
                    </div>
                  </div>
                </div>
                <div style={{marginTop:10,padding:"10px 12px",background:"#FFF8E1",borderRadius:10,border:"1px solid #FFE082"}}>
                  <div style={{fontSize:12,color:"#92400E",lineHeight:1.6}}>Pay <strong>KSh 260</strong> to unlock seller contact. Funds are only charged when a serious buyer locks in.</div>
                </div>
              </div>

              {/* Bottom spacer so content clears the fold */}
              <div style={{height:32}}/>
            </div>
          );
        })()}

        {/* Fixed action bar — stays put while swiping through photo panels */}
        {offset===0&&activePanelIdx<photoSrcs.length&&<>
          {/* Right-side column: Save / Views / Interest */}
          <div style={{position:"absolute",right:12,bottom:100,display:"flex",flexDirection:"column",gap:14,alignItems:"center",zIndex:30,pointerEvents:"auto"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <HeartBtn saved={isSaved} onToggle={e=>{if(e&&e.stopPropagation)e.stopPropagation();if(!user){onSignIn&&onSignIn();return;}onToggleSave&&onToggleSave(l);}} size={20} bg="rgba(0,0,0,.55)" style={{width:44,height:44,border:"1.5px solid rgba(255,255,255,.3)",backdropFilter:"blur(6px)"}}/>
              <span style={{color:"#fff",fontSize:10,fontWeight:700,textShadow:"0 1px 4px rgba(0,0,0,.8)"}}>{isSaved?"Saved":"Save"}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(255,255,255,.2)",backdropFilter:"blur(6px)"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              <span style={{color:"rgba(255,255,255,.8)",fontSize:10,fontWeight:700}}>{l.view_count||0}</span>
            </div>
            {l.interest_count>0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(232,25,75,.8)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(255,255,255,.2)",backdropFilter:"blur(6px)",flexDirection:"column"}}>
                <span style={{color:"#fff",fontSize:12,fontWeight:800,lineHeight:1}}>{l.interest_count}</span>
                <span style={{color:"rgba(255,255,255,.7)",fontSize:8,fontWeight:700}}>INT</span>
              </div>
            </div>}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <button onClick={e=>{e.stopPropagation();setShareModal(l);}} style={{width:44,height:44,borderRadius:"50%",background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(255,255,255,.2)",backdropFilter:"blur(6px)",cursor:"pointer"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
              <span style={{color:"rgba(255,255,255,.8)",fontSize:10,fontWeight:700}}>Share</span>
            </div>
          </div>
          {/* Bottom action buttons */}
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 16px 24px",display:"flex",gap:8,zIndex:30,background:"linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 100%)"}}>
            <button onClick={e=>{e.stopPropagation();if(!user){onSignIn&&onSignIn();return;}onMessage&&onMessage(l);}} style={{flex:1,background:"rgba(255,255,255,.15)",color:"#fff",border:"1.5px solid rgba(255,255,255,.4)",padding:"14px",fontSize:14,fontWeight:700,borderRadius:12,cursor:"pointer",fontFamily:"var(--fn)",backdropFilter:"blur(8px)"}}>Message Seller</button>
            <button onClick={e=>{e.stopPropagation();if(!user){onSignIn&&onSignIn();return;}onLockIn&&onLockIn(l);}} style={{background:"#1428A0",color:"#fff",border:"none",padding:"14px 16px",fontSize:14,fontWeight:700,borderRadius:12,cursor:"pointer",fontFamily:"var(--fn)",boxShadow:"0 4px 14px rgba(20,40,160,.5)",whiteSpace:"nowrap"}}>I'm Interested</button>
          </div>
        </>}
      </div>
    );
  };

  if(loading&&!listings.length)return<div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#000"}}><Spin s="48px"/></div>;
  if(!listings.length)return<div style={{height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#111",gap:16,padding:24,textAlign:"center"}}>
    <div style={{opacity:.3,marginBottom:4}}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
    <div style={{fontWeight:700,fontSize:18,color:"#fff"}}>No listings yet</div>
    <div style={{fontSize:14,color:"rgba(255,255,255,.5)"}}>Be the first to post something</div>
    <button onClick={()=>onPostAd&&onPostAd()} style={{background:"#1428A0",color:"#fff",border:"none",padding:"14px 28px",fontSize:14,fontWeight:700,borderRadius:10,cursor:"pointer",fontFamily:"var(--fn)",marginTop:8}}>+ Post an Ad</button>
  </div>;

  const visCount=Math.min(listings.length,7);
  const visStart=Math.max(0,Math.min(idx-3,listings.length-visCount));

  return(<>
    {shareModal&&<ShareModal listing={shareModal} onClose={()=>setShareModal(null)}/>}
    <div ref={containerRef} style={{height:"100vh",width:"100%",background:"#000",position:"relative",overflow:"hidden",userSelect:"none",WebkitUserSelect:"none",touchAction:"none"}}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* Left / Current / Right slides */}
      {renderSlide(-1)}
      {renderSlide(1)}
      {renderSlide(0)}

      {/* Fixed UI — always on top, not part of swipe stack */}
      {/* Back button */}
      {onClose&&<button onClick={onClose} style={{position:"absolute",top:14,left:14,width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,.6)",border:"2px solid rgba(255,255,255,.3)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:20,backdropFilter:"blur(4px)"}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
      </button>}
      {/* Counter pill + autoscroll toggle */}
      <div style={{position:"absolute",top:14,right:14,display:"flex",gap:8,alignItems:"center",zIndex:20}}>
        {/* Autoscroll toggle switch */}
        <div
          onClick={()=>setAutoScroll(s=>!s)}
          title={autoScroll?"Pause autoscroll":"Start autoscroll"}
          style={{
            display:"flex",alignItems:"center",gap:7,
            background:"rgba(0,0,0,.58)",
            borderRadius:20,padding:"5px 10px 5px 12px",
            cursor:"pointer",backdropFilter:"blur(6px)",
            border:"1.5px solid rgba(255,255,255,.18)",
            userSelect:"none",WebkitUserSelect:"none",
          }}
        >
          <span style={{color:"rgba(255,255,255,.85)",fontSize:10,fontWeight:700,letterSpacing:".05em",fontFamily:"var(--fn)"}}>AUTOPLAY</span>
          {/* Toggle track */}
          <div style={{
            width:34,height:18,borderRadius:9,flexShrink:0,position:"relative",
            background:autoScroll?"#1428A0":"rgba(255,255,255,.22)",
            border:"1.5px solid rgba(255,255,255,.2)",
            transition:"background .2s ease",
          }}>
            {/* Toggle thumb */}
            <div style={{
              position:"absolute",top:1,
              left:autoScroll?14:1,
              width:12,height:12,borderRadius:"50%",
              background:"#fff",
              transition:"left .2s ease",
              boxShadow:"0 1px 4px rgba(0,0,0,.5)",
            }}/>
          </div>
        </div>
        <div style={{background:"rgba(0,0,0,.55)",color:"#fff",fontSize:12,fontWeight:700,padding:"5px 12px",borderRadius:20,backdropFilter:"blur(4px)"}}>
          {idx+1} / {total}
        </div>
      </div>
    </div>
  </>);
}

// ── HOT RIGHT NOW — horizontal scroll of popular listings ─────────────────────
function HotRightNow({onOpen,savedIds,onToggleSave,user,onOpenInFeed,onLockIn,onMessage,onSignIn}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [feedIdx,setFeedIdx]=useState(null);
  useEffect(()=>{api("/api/listings?sort=popular&limit=10").then(d=>setItems(d.listings||[])).catch(()=>{}).finally(()=>setLoading(false));},[]);
  if(!loading&&!items.length)return null;
  if(loading)return <div style={{marginBottom:8}}>
    <div style={{fontWeight:700,fontSize:15,color:"#1A1A1A",padding:"14px 16px 10px"}}>Hot Right Now</div>
    <div style={{display:"flex",gap:10,padding:"4px 16px 14px",overflowX:"hidden"}}>
      {[1,2,3,4].map(i=><div key={i} style={{flexShrink:0,width:150}}>
        <Skeleton w={150} h={150} r={12} style={{marginBottom:8}}/>
        <Skeleton w="80%" h={13} style={{marginBottom:5}}/>
        <Skeleton w="50%" h={16}/>
      </div>)}
    </div>
  </div>;
  const openItem=(l,i)=>{
    if(onOpenInFeed){onOpenInFeed(items,i);}
    else if(typeof window!=="undefined"&&window.innerWidth>=768&&onOpen){onOpen(l);}
    else{setFeedIdx(i);}
  };
  return<>  
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 6px"}}>
        <div style={{fontWeight:700,fontSize:15,color:"#1A1A1A"}}>Hot Right Now</div>
        <div style={{fontSize:11,color:"#AAAAAA",fontWeight:500}}>Most viewed today</div>
      </div>
      {/* Mobile: 2-column grid / Desktop: horizontal scroll */}
      <div className="hot-right-now-grid" style={{padding:"4px 16px 12px"}}>
        {items.slice(0,typeof window!=="undefined"&&window.innerWidth<768?2:10).map((l,i)=>{
          const photo=Array.isArray(l.photos)?l.photos.find(p=>typeof p==="string")||l.photos[0]?.url||null:null;
          const isNew=Date.now()-new Date(l.created_at)<12*3600000;
          const catPhoto=CAT_PHOTOS[l.category];
          return<div key={l.id} onClick={()=>openItem(l,i)} style={{cursor:"pointer"}}>
            <div style={{width:"100%",aspectRatio:"1/1",borderRadius:14,overflow:"hidden",background:"#F0F0F0",position:"relative",marginBottom:9,boxShadow:"0 2px 8px rgba(0,0,0,.10),0 6px 20px rgba(20,40,160,.07)",transition:"transform .2s,box-shadow .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.12),0 12px 32px rgba(20,40,160,.12)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.10),0 6px 20px rgba(20,40,160,.07)";}}>
              {photo
                ?<img src={photo} alt={l.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                :catPhoto
                  ?<img src={catPhoto} alt={l.category} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.22,filter:"grayscale(20%)"}}/>
                  :<div style={{width:"100%",height:"100%",background:"#F0F0F0",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:10,color:"#AAAAAA",fontWeight:600}}>No photo</span></div>}
              {isNew&&<div style={{position:"absolute",top:7,left:7,background:"#10b981",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:5,boxShadow:"0 1px 4px rgba(16,185,129,.4)"}}>NEW</div>}
              {l.interest_count>0&&<div style={{position:"absolute",bottom:7,left:7,background:"rgba(232,25,75,.88)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,display:"flex",alignItems:"center",gap:4,backdropFilter:"blur(4px)"}}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>{l.interest_count}
              </div>}
              <HeartBtn saved={savedIds?.has(l.id)} onToggle={e=>{e&&e.stopPropagation&&e.stopPropagation();onToggleSave&&onToggleSave(l);}} size={14} style={{position:"absolute",top:7,right:7,width:30,height:30}}/>
            </div>
            <div style={{fontSize:12,fontWeight:700,color:"#1A1A1A",lineHeight:1.4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{l.title}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#1428A0",marginTop:3,letterSpacing:"-.01em"}}>{fmtKES(l.price)}</div>
          </div>;
        })}
      </div>
    </div>
    {/* SwipeFeed overlay for hot listings */}
{feedIdx!==null&&<div style={{position:"fixed",inset:0,zIndex:600}}>
      <SwipeFeed user={user} token={null} initialListings={items} startIndex={feedIdx}
      onOpen={l=>{setFeedIdx(null);onOpen&&onOpen(l);}}
      onLockIn={l=>{setFeedIdx(null);onLockIn&&onLockIn(l);}}
      onMessage={l=>{setFeedIdx(null);onMessage&&onMessage(l);}}
      savedIds={savedIds} onToggleSave={onToggleSave}
      onSignIn={onSignIn||(()=>{})} onPostAd={()=>{setFeedIdx(null);}} onClose={()=>setFeedIdx(null)}/>
    </div>}
  </>;
}

// ── ALL LISTINGS PAGE — Full standalone /listings page ────────────────────────
function AllListingsPage({user,token,notify,onBack,onOpenListing,onToggleSave,savedIds,onPostAd,onSignIn,onLockIn,onChatListing,initialFilter}){
  const [listings,setListings]=useState([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false);
  const [vm,setVm]=useState("grid");
  const [searchInput,setSearchInput]=useState(initialFilter?.q||"");
  const [search,setSearch]=useState(initialFilter?.q||"");
  const [category,setCategory]=useState(initialFilter?.cat||"");
  const [subcat,setSubcat]=useState(initialFilter?.subcat||"");
  const [county,setCounty]=useState(initialFilter?.county||"");
  const [minPrice,setMinPrice]=useState(initialFilter?.minPrice||"");
  const [maxPrice,setMaxPrice]=useState(initialFilter?.maxPrice||"");
  const [sort,setSort]=useState(initialFilter?.sort||"newest");
  const [pg,setPg]=useState(1);
  const [feedIdx,setFeedIdx]=useState(null);
  const loaderRef=useRef(null);
  const PER=24;
  const filterCat=CATS.find(c=>c.name===category);
  const hasFilters=search||category||subcat||county||minPrice||maxPrice||sort!=="newest";

  useEffect(()=>{
    if(pg===1)setLoading(true);else setLoadingMore(true);
    const p=new URLSearchParams({page:pg,limit:PER,sort});
    if(search)p.set("search",search);
    if(category)p.set("category",category);
    if(subcat)p.set("subcat",subcat);
    if(county)p.set("county",county);
    if(minPrice)p.set("minPrice",minPrice);
    if(maxPrice)p.set("maxPrice",maxPrice);
    api(`/api/listings?${p}`).then(d=>{
      setListings(prev=>pg===1?(d.listings||[]):[...prev,...(d.listings||[])]);
      setTotal(d.total||0);
    }).catch(()=>{}).finally(()=>{setLoading(false);setLoadingMore(false);});
  },[search,category,subcat,county,minPrice,maxPrice,sort,pg]);

  // Reset to page 1 when filters change
  useEffect(()=>{setPg(1);},[search,category,subcat,county,minPrice,maxPrice,sort]);

  // Infinite scroll observer
  useEffect(()=>{
    if(!loaderRef.current)return;
    const obs=new IntersectionObserver(([e])=>{
      if(e.isIntersecting&&!loadingMore&&!loading&&listings.length<total){setPg(p=>p+1);}
    },{threshold:0.1});
    obs.observe(loaderRef.current);
    return()=>obs.disconnect();
  },[loadingMore,loading,listings.length,total]);

  const clearFilters=()=>{setSearchInput("");setSearch("");setCategory("");setSubcat("");setCounty("");setMinPrice("");setMaxPrice("");setSort("newest");setPg(1);};

  return<div style={{minHeight:"100vh",background:"#F7F7F7",fontFamily:"var(--fn)"}}>
    {/* Header */}
    <div style={{background:"linear-gradient(135deg,#1D1D1D 0%,#333 100%)",padding:"clamp(20px,4vw,40px) clamp(16px,4vw,48px) 0"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,gap:12,flexWrap:"wrap"}}>
        <div>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)",display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>Back
          </button>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.6)",marginBottom:6}}>Marketplace</div>
          <h1 style={{fontSize:"clamp(24px,3vw,40px)",fontWeight:700,color:"#fff",letterSpacing:"-.02em",lineHeight:1.1}}>All Listings</h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,.7)",marginTop:6}}>{total} item{total!==1?"s":""} available</p>
        </div>
        {user&&<button style={{background:"#1428A0",color:"#fff",border:"none",padding:"12px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8,whiteSpace:"nowrap"}} onClick={onPostAd}>+ Post Ad</button>}
        {!user&&<button style={{background:"#fff",color:"#1D1D1D",border:"none",padding:"12px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8,whiteSpace:"nowrap"}} onClick={onSignIn}>Sign In to Post</button>}
      </div>
      {/* Search bar */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingBottom:20}}>
        <div style={{display:"flex",flex:"2 1 300px",gap:0,border:"1.5px solid rgba(255,255,255,.3)",borderRadius:8,overflow:"hidden",background:"rgba(255,255,255,.1)",minWidth:0}}>
          <input style={{flex:1,padding:"10px 14px",border:"none",outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"transparent",color:"#fff",minWidth:0}}
            placeholder="Search listings..." value={searchInput}
            onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){setSearch(searchInput);setPg(1);}}}/>
          <button onClick={()=>{setSearch(searchInput);setPg(1);}} style={{background:"rgba(255,255,255,.2)",color:"#fff",border:"none",padding:"0 16px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"var(--fn)",flexShrink:0}}>Search</button>
        </div>
        <select style={{padding:"10px 12px",border:"1.5px solid rgba(255,255,255,.3)",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"rgba(255,255,255,.1)",cursor:"pointer",color:"#fff",flex:"1 1 160px"}}
          value={category} onChange={e=>{setCategory(e.target.value);setSubcat("");setPg(1);}}>
          <option value="">All Categories</option>
          {CATS.map(c=><option key={c.name} value={c.name} style={{color:"#000"}}>{c.name}</option>)}
        </select>
        {filterCat&&<select style={{padding:"10px 12px",border:"1.5px solid rgba(255,255,255,.3)",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"rgba(255,255,255,.1)",cursor:"pointer",color:"#fff",flex:"1 1 140px"}}
          value={subcat} onChange={e=>{setSubcat(e.target.value);setPg(1);}}>
          <option value="">All Subcategories</option>
          {filterCat.sub.map(s=><option key={s} value={s} style={{color:"#000"}}>{s}</option>)}
        </select>}
      </div>
    </div>
    {/* Secondary filters */}
    <div style={{background:"#fff",borderBottom:"1px solid #EBEBEB",padding:"12px clamp(16px,4vw,48px)",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <select style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer",color:"#444"}}
        value={county} onChange={e=>{setCounty(e.target.value);setPg(1);}}>
        <option value="">All Counties</option>
        {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
      <input style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",width:120}} type="number" placeholder="Min KSh" value={minPrice} onChange={e=>{setMinPrice(e.target.value);setPg(1);}}/>
      <input style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",width:120}} type="number" placeholder="Max KSh" value={maxPrice} onChange={e=>{setMaxPrice(e.target.value);setPg(1);}}/>
      <select style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer",color:"#444"}}
        value={sort} onChange={e=>{setSort(e.target.value);setPg(1);}}>
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="price_asc">Price: Low → High</option>
        <option value="price_desc">Price: High → Low</option>
        <option value="popular">Most Viewed</option>
        <option value="expiring">Expiring Soon</option>
      </select>
      <div style={{display:"flex",gap:2}}>
        <button onClick={()=>setVm("grid")} style={{background:vm==="grid"?"#1D1D1D":"#fff",color:vm==="grid"?"#fff":"#767676",border:"1px solid #E0E0E0",padding:"8px 12px",cursor:"pointer",fontSize:13,fontFamily:"var(--fn)",borderRadius:"6px 0 0 6px"}}>Grid</button>
        <button onClick={()=>setVm("list")} style={{background:vm==="list"?"#1D1D1D":"#fff",color:vm==="list"?"#fff":"#767676",border:"1px solid #E0E0E0",borderLeft:"none",padding:"8px 12px",cursor:"pointer",fontSize:13,fontFamily:"var(--fn)",borderRadius:"0 6px 6px 0"}}>List</button>
      </div>
      {hasFilters&&<button style={{padding:"8px 14px",border:"1px solid #E0E0E0",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,fontFamily:"var(--fn)",color:"#636363"}} onClick={clearFilters}>Clear All</button>}
    </div>
    {/* Content */}
    <div style={{padding:"clamp(20px,3vw,40px) clamp(16px,4vw,48px) 80px"}}>
      {loading?<div className={vm==="grid"?"g3":"lvc"}>{[1,2,3,4,5,6,7,8].map(i=><SkeletonCard key={i}/>)}</div>
        :listings.length===0?<div style={{textAlign:"center",padding:"80px 20px",color:"#767676"}}>
          <div style={{marginBottom:16,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.search(56,"currentColor")}</div>
          <div style={{fontWeight:700,fontSize:18,marginBottom:10,letterSpacing:"-.01em"}}>No listings found</div>
          <div style={{fontSize:14,marginBottom:22,color:"#AAAAAA",lineHeight:1.65}}>Try adjusting your filters or search terms</div>
          {hasFilters&&<button className="btn bp" onClick={clearFilters}>Clear Filters</button>}
        </div>
        :<>
          <div className={vm==="grid"?"g3":"lvc"}>
            {listings.map((l, i)=><ListingCard key={l.id} listing={l} onClick={()=>{
              if(typeof window!=="undefined"&&window.innerWidth<768){
                setFeedIdx(i);
              }else{
                onOpenListing&&onOpenListing(l);
              }
            }} listView={vm==="list"} isSaved={savedIds?.has(l.id)} onSave={user?()=>onToggleSave&&onToggleSave(l):null}/>)}
          </div>
          <div ref={loaderRef} style={{height:72,display:"flex",alignItems:"center",justifyContent:"center",marginTop:16}}>
            {loadingMore&&<div className={vm==="grid"?"g3":"lvc"} style={{width:"100%"}}>{[1,2,3].map(i=><SkeletonCard key={i}/>)}</div>}
            {!loadingMore&&listings.length>=total&&total>0&&<div className="inf-end">You've seen all {total} listings — check back soon for new ones</div>}
          </div>
        </>}
    </div>
    {feedIdx!==null&&<div style={{position:"fixed",inset:0,zIndex:9999}}>
      <SwipeFeed user={user} token={token} initialListings={listings} startIndex={feedIdx}
        onOpen={l=>{setFeedIdx(null);onOpenListing&&onOpenListing(l);}}
        onLockIn={onLockIn||((l)=>{})} onMessage={l=>{setFeedIdx(null);onChatListing&&onChatListing(l);}} savedIds={savedIds} onToggleSave={onToggleSave}
        onSignIn={onSignIn} onPostAd={onPostAd} onClose={()=>setFeedIdx(null)}/>
    </div>}
  </div>;
}

// ── SOLD PAGE — Full standalone /sold page ─────────────────────────────────────
function SoldPage({token,user,onBack}){
  const [items,setItems]=useState([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [searchInput,setSearchInput]=useState("");
  const [search,setSearch]=useState("");
  const [cat,setCat]=useState("");
  const [pg,setPg]=useState(1);
  const PER=24;

  useEffect(()=>{
    setLoading(true);
    const params=new URLSearchParams({page:pg,limit:PER});
    if(cat)params.set("category",cat);
    if(search)params.set("search",search);
    api(`/api/listings/sold?${params}`).then(d=>{setItems(d.listings||[]);setTotal(d.total||0);})
      .catch(()=>{}).finally(()=>setLoading(false));
  },[pg,cat,search]);

  return<div style={{minHeight:"100vh",background:"#111",fontFamily:"var(--fn)"}}>
    {/* Dark header */}
    <div style={{background:"#1D1D1D",padding:"clamp(20px,4vw,52px) clamp(16px,4vw,48px) 0"}}>
      <button onClick={onBack} style={{background:"transparent",border:"1px solid rgba(255,255,255,.35)",color:"#fff",padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)",marginBottom:28,display:"inline-flex",alignItems:"center",gap:6,letterSpacing:".02em",borderRadius:8}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>Back to Marketplace
      </button>
      <div style={{marginBottom:14,opacity:.9}}><WekaSokoLogo size={26} light/></div>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(255,255,255,.55)",marginBottom:10}}>Sold Listings</div>
      <h1 style={{fontSize:"clamp(30px,5vw,54px)",fontWeight:700,letterSpacing:"-.03em",color:"#fff",lineHeight:1.05,marginBottom:14}}>Sold on Weka Soko</h1>
      <p style={{fontSize:15,color:"rgba(255,255,255,.7)",maxWidth:500,lineHeight:1.75,marginBottom:24}}>Real items. Real buyers. Every listing below found a home through Weka Soko.</p>
      {/* Search + category */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingBottom:20}}>
        <div style={{display:"flex",flex:"2 1 280px",gap:0,border:"1.5px solid rgba(255,255,255,.25)",borderRadius:8,overflow:"hidden",background:"rgba(255,255,255,.08)",minWidth:0}}>
          <input style={{flex:1,padding:"10px 14px",border:"none",outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"transparent",color:"#fff",minWidth:0}}
            placeholder="Search sold items..." value={searchInput}
            onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){setSearch(searchInput);setPg(1);}}}/>
          <button onClick={()=>{setSearch(searchInput);setPg(1);}} style={{background:"rgba(255,255,255,.15)",color:"#fff",border:"none",padding:"0 16px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"var(--fn)",flexShrink:0}}>Search</button>
        </div>
        <select style={{padding:"10px 12px",border:"1.5px solid rgba(255,255,255,.25)",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"rgba(255,255,255,.08)",cursor:"pointer",color:"#fff",flex:"1 1 160px"}}
          value={cat} onChange={e=>{setCat(e.target.value);setPg(1);}}>
          <option value="">All Categories</option>
          {CATS.map(c=><option key={c.name} value={c.name} style={{color:"#000"}}>{c.name}</option>)}
        </select>
      </div>
    </div>
    <div style={{background:"#F0F0F0",padding:"clamp(28px,3vw,44px) clamp(16px,4vw,48px) 80px"}}>
      {total>0&&<div style={{display:"flex",gap:0,border:"1px solid #E5E5E5",marginBottom:28,background:"#fff",borderRadius:12,overflow:"hidden",flexWrap:"wrap"}}>
        {[{label:"Total Sales",val:total},{label:"Categories",val:[...new Set(items.map(i=>i.category))].length},{label:"Avg Price",val:items.length?"KSh "+Math.round(items.reduce((a,l)=>a+(parseFloat(l.price)||0),0)/items.length).toLocaleString("en-KE"):"—"}].map((s,i)=>(
          <div key={s.label} style={{flex:1,padding:"18px 20px",borderRight:i<2?"1px solid #E5E5E5":"none",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:700,letterSpacing:"-.02em",color:"#111111"}}>{s.val}</div>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"#767676",marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>}
      {loading?<div style={{textAlign:"center",padding:60}}><Spin s="40px"/></div>
        :items.length===0?<div style={{textAlign:"center",padding:"80px 20px",color:"#767676"}}>
          <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>No sold items found</div>
          {(cat||search)&&<button className="btn bs" style={{marginTop:12}} onClick={()=>{setCat("");setSearch("");setSearchInput("");}}>Clear Filters</button>}
        </div>
        :<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:20,marginBottom:32}}>
            {items.map(l=><SoldCard key={l.id} l={l} showContact={true}/>)}
          </div>
          {Math.ceil(total/PER)>1&&<div style={{display:"flex",justifyContent:"center",gap:8,alignItems:"center"}}>
            <button className="btn bs sm" onClick={()=>{setPg(p=>Math.max(1,p-1));window.scrollTo(0,0);}} disabled={pg<=1} style={{opacity:pg<=1?.4:1}}>← Prev</button>
            <span style={{fontSize:13,color:"#888",fontWeight:500}}>Page {pg} of {Math.ceil(total/PER)}</span>
            <button className="btn bp sm" onClick={()=>{setPg(p=>Math.min(Math.ceil(total/PER),p+1));window.scrollTo(0,0);}} disabled={pg>=Math.ceil(total/PER)} style={{opacity:pg>=Math.ceil(total/PER)?.4:1}}>Next →</button>
          </div>}
        </>}
    </div>
  </div>;
}

// ── BUYERS WANT PAGE — Full standalone page ───────────────────────────────────
function BuyersWantPage({user,token,notify,onBack,onIHaveThis,onSignIn}){
  const [requests,setRequests]=useState([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [showModal,setShowModal]=useState(false);
  const [searchInput,setSearchInput]=useState("");
  const [search,setSearch]=useState("");
  const [county,setCounty]=useState("");
  const [category,setCategory]=useState("");
  const [subcat,setSubcat]=useState("");
  const [minPrice,setMinPrice]=useState("");
  const [maxPrice,setMaxPrice]=useState("");
  const [sort,setSort]=useState("newest");
  const [pg,setPg]=useState(1);
  const PER=20;
  const filterCat=CATS.find(c=>c.name===category);
  const hasFilters=search||county||category||subcat||minPrice||maxPrice||sort!=="newest";

  const handleIHaveThis=(request)=>{
    if(!user){onSignIn&&onSignIn();return;}
    if(user.role!=="seller"){
      if(window.confirm("To respond to this buyer request you need a Seller account.\n\nSwitch to Seller now?")){
        onIHaveThis&&onIHaveThis(request,"switch_to_seller");
      }
      return;
    }
    if(user.id===request.user_id){notify("This is your own request","warning");return;}
    onIHaveThis&&onIHaveThis(request,"post_ad");
  };

  useEffect(()=>{
    setLoading(true);
    const p=new URLSearchParams({page:pg,limit:PER,sort});
    if(search)p.set("search",search);
    if(county)p.set("county",county);
    if(category)p.set("category",category);
    if(subcat)p.set("subcat",subcat);
    if(minPrice)p.set("min_price",minPrice);
    if(maxPrice)p.set("max_price",maxPrice);
    api(`/api/requests?${p}`).then(d=>{setRequests(d.requests||[]);setTotal(d.total||0);})
      .catch(()=>{}).finally(()=>setLoading(false));
  },[search,county,category,subcat,minPrice,maxPrice,sort,pg]);

  const clearFilters=()=>{setSearchInput("");setSearch("");setCounty("");setCategory("");setSubcat("");setMinPrice("");setMaxPrice("");setSort("newest");setPg(1);};

  return <div style={{minHeight:"100vh",background:"#F7F7F7",fontFamily:"var(--fn)"}}>
    {/* Page header */}
    <div style={{background:"linear-gradient(135deg,#1428A0 0%,#0F1F8A 100%)",padding:"clamp(20px,4vw,40px) clamp(16px,4vw,48px) 0"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,gap:12,flexWrap:"wrap"}}>
        <div>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--fn)",display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>Back
          </button>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.6)",marginBottom:6}}>Community</div>
          <h1 style={{fontSize:"clamp(24px,3vw,40px)",fontWeight:700,color:"#fff",letterSpacing:"-.02em",lineHeight:1.1}}>What Buyers Want</h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,.7)",marginTop:6}}>{total} active request{total!==1?"s":""}</p>
        </div>
        <button style={{background:"#fff",color:"#1428A0",border:"none",padding:"12px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--fn)",borderRadius:8,whiteSpace:"nowrap"}}
          onClick={()=>{if(!user){onSignIn&&onSignIn();return;}setShowModal(true);}}>+ Post a Request</button>
      </div>
      {/* Filter bar — inside header */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingBottom:20}}>
        <div style={{display:"flex",flex:"2 1 280px",gap:0,border:"1.5px solid rgba(255,255,255,.3)",borderRadius:8,overflow:"hidden",background:"rgba(255,255,255,.1)",minWidth:0}}>
          <input style={{flex:1,padding:"10px 14px",border:"none",outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"transparent",color:"#fff",minWidth:0}}
            placeholder="Search requests..." value={searchInput}
            onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){setSearch(searchInput);setPg(1);}}}
            style={{flex:1,padding:"10px 14px",border:"none",outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"transparent",color:"#fff",minWidth:0,"::placeholder":{color:"rgba(255,255,255,.5)"}}}/>
          <button onClick={()=>{setSearch(searchInput);setPg(1);}} style={{background:"rgba(255,255,255,.2)",color:"#fff",border:"none",padding:"0 16px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"var(--fn)",flexShrink:0}}>Search</button>
        </div>
        <select style={{padding:"10px 12px",border:"1.5px solid rgba(255,255,255,.3)",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"rgba(255,255,255,.1)",cursor:"pointer",color:"#fff",flex:"1 1 140px"}}
          value={category} onChange={e=>{setCategory(e.target.value);setSubcat("");setPg(1);}}>
          <option value="">All Categories</option>
          {CATS.map(c=><option key={c.name} value={c.name} style={{color:"#000"}}>{c.name}</option>)}
        </select>
        {filterCat&&<select style={{padding:"10px 12px",border:"1.5px solid rgba(255,255,255,.3)",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"rgba(255,255,255,.1)",cursor:"pointer",color:"#fff",flex:"1 1 120px"}}
          value={subcat} onChange={e=>{setSubcat(e.target.value);setPg(1);}}>
          <option value="">All Subcategories</option>
          {filterCat.sub.map(s=><option key={s} value={s} style={{color:"#000"}}>{s}</option>)}
        </select>}
      </div>
    </div>

    {/* Secondary filter row */}
    <div style={{background:"#fff",borderBottom:"1px solid #EBEBEB",padding:"12px clamp(16px,4vw,48px)",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <select style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer",color:"#444"}}
        value={county} onChange={e=>{setCounty(e.target.value);setPg(1);}}>
        <option value="">All Counties</option>
        {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
      <input style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",width:120}} type="number" placeholder="Min KSh" value={minPrice} onChange={e=>{setMinPrice(e.target.value);setPg(1);}}/>
      <input style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",width:120}} type="number" placeholder="Max KSh" value={maxPrice} onChange={e=>{setMaxPrice(e.target.value);setPg(1);}}/>
      <select style={{padding:"8px 12px",border:"1px solid #E0E0E0",borderRadius:8,outline:"none",fontSize:13,fontFamily:"var(--fn)",background:"#fff",cursor:"pointer",color:"#444"}}
        value={sort} onChange={e=>{setSort(e.target.value);setPg(1);}}>
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="budget_desc">Highest Budget</option>
        <option value="budget_asc">Lowest Budget</option>
      </select>
      {hasFilters&&<button style={{padding:"8px 14px",border:"1px solid #E0E0E0",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,fontFamily:"var(--fn)",color:"#636363"}} onClick={clearFilters}>Clear All</button>}
    </div>

    {/* Content */}
    <div style={{padding:"clamp(20px,3vw,40px) clamp(16px,4vw,48px) 80px"}}>
      {loading?<div style={{textAlign:"center",padding:60}}><Spin s="40px"/></div>
        :requests.length===0?<div style={{textAlign:"center",padding:"80px 20px",color:"#767676"}}>
          <div style={{marginBottom:16,opacity:.2,display:"flex",alignItems:"center",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle"}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
          <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>{hasFilters?"No requests match your filters":"No requests yet"}</div>
          <div style={{fontSize:14,marginBottom:20}}>{hasFilters?"Try different filters":"Be the first to post what you're looking for"}</div>
          {hasFilters?<button className="btn bp" style={{marginTop:8}} onClick={clearFilters}>Clear Filters</button>
            :<button className="btn bp" style={{marginTop:8}} onClick={()=>{if(!user){onSignIn&&onSignIn();return;}setShowModal(true);}}>+ Post a Request</button>}
        </div>
        :<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14,marginBottom:32}}>
            {requests.map(r=><RequestCard key={r.id} r={r} user={user} token={token} notify={notify}
              onIHaveThis={handleIHaveThis}
              onDelete={id=>{setRequests(p=>p.filter(x=>x.id!==id));setTotal(t=>t-1);}}/>)}
          </div>
          {/* Pagination */}
          {Math.ceil(total/PER)>1&&<div style={{display:"flex",justifyContent:"center",gap:8,alignItems:"center"}}>
            <button className="btn bs sm" onClick={()=>{setPg(p=>Math.max(1,p-1));window.scrollTo(0,0);}} disabled={pg<=1} style={{opacity:pg<=1?.4:1}}>← Prev</button>
            <span style={{fontSize:13,color:"#888",fontWeight:500}}>Page {pg} of {Math.ceil(total/PER)}</span>
            <button className="btn bp sm" onClick={()=>{setPg(p=>Math.min(Math.ceil(total/PER),p+1));window.scrollTo(0,0);}} disabled={pg>=Math.ceil(total/PER)} style={{opacity:pg>=Math.ceil(total/PER)?.4:1}}>Next →</button>
          </div>}
        </>}
    </div>

    {showModal&&<PostRequestModal token={token} notify={notify} onClose={()=>setShowModal(false)} onSuccess={r=>{setRequests(p=>[r,...p]);setTotal(t=>t+1);}}/>}
  </div>;
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export { WekaSokoLogo, Spin, Toast, Modal, FF, Counter, ImageUploader, TermsModal, PasswordField, ForgotPasswordPanel, ResetPasswordModal, WatermarkedImage, Lightbox, AuthModal, ShareModal, PayModal, ChatModal, PostAdModal, ListingCard, ListingCardSkeleton, HeroSkeleton, LeaveReviewBtn, ReportListingBtn, DetailModal, MarkSoldModal, RoleSwitcher, PostRequestModal, WhatBuyersWant, SoldSection, SoldCard, StarPicker, ReviewsSection, MyRequestsTab, PitchesTab, ProfileSection, PasswordSection, VerificationSection, MobileDashboard, Dashboard, Pager, MobileRequestsTab, MobileLayout, BuyersWantPage, AllListingsPage, SoldPage, SwipeFeed, HotRightNow };

