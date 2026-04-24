'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';
import { api, Spin, Ic } from '@/components/ui/primitives';
import { FF, Modal } from '@/components/ui/core';


function PayModal({type,listingId,pitchId,amount,purpose,token,user,onSuccess,onClose,notify,allowVoucher}){
  const [phone,setPhone]=useState(user?.phone||"07");
  const [vcode,setVcode]=useState("");
  const [voucherInfo,setVoucherInfo]=useState(null);
  const [step,setStep]=useState("form");
  const [errMsg,setErrMsg]=useState("");
  const [cd,setCd]=useState(90);
  const [manualCode,setManualCode]=useState("");
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
      notify(`Voucher applied — ${pct}% off! You save ${fmtKES(saved)}`,"success");
    }catch{notify("Invalid or expired voucher code.","error");setVoucherInfo(null);}
  };

  const startPayment=async()=>{
    if(finalAmt>0&&(!phone||phone.length<10)){notify("Enter a valid M-Pesa phone number.","warning");return;}
    setStep("pushing");
    try{
      const endpoint=pitchId?`/api/pitches/${pitchId}/accept`:type==="unlock"?"/api/payments/unlock":"/api/payments/escrow";
      const body=pitchId?{phone:phone.trim()}:{listing_id:listingId,phone:phone.trim()};
      if(voucherInfo)body.voucher_code=vcode.trim().toUpperCase();
      const result=await api(endpoint,{method:"POST",body:JSON.stringify(body)},token);
      if(result.unlocked){setStep("done");setTimeout(()=>onSuccess(result),600);return;}
      setStep("polling");
      let c=90;setCd(90);
      pollRef.current=setInterval(async()=>{
        c--;setCd(c);
        if(c<=0){clearInterval(pollRef.current);setStep("timeout");return;}
        try{
          const s=await api(`/api/payments/status/${result.checkoutRequestId}`,{},token);
          if(s.status==="confirmed"){clearInterval(pollRef.current);setStep("done");setTimeout(()=>onSuccess(s),800);}
          else if(s.status==="failed"){clearInterval(pollRef.current);setStep("error");setErrMsg(s.resultDesc||"Payment failed. Try again.");}
        }catch{}
      },2000);
    }catch(err){setStep("error");setErrMsg(err.message);}
  };

  const verifyManual=async()=>{
    if(pitchId){notify("Manual verification is not available for pitch payments. Please try again or contact support.","warning");return;}
    const code=manualCode.trim().toUpperCase();
    if(!code||code.length<8){notify("Enter a valid M-Pesa transaction code.","warning");return;}
    setVerifying(true);
    try{
      const result=await api("/api/payments/verify-manual",{method:"POST",body:JSON.stringify({mpesa_code:code,listing_id:listingId,type})},token);
      setStep("done");setTimeout(()=>onSuccess(result),600);
    }catch(err){notify(err.message,"error");}
    finally{setVerifying(false);}
  };

  useEffect(()=>()=>{if(pollRef.current)clearInterval(pollRef.current);},[]);

  const ManualInput=()=><div style={{marginTop:14,borderTop:"1px solid #E8E8E8",paddingTop:14}}>
    <div className="lbl" style={{marginBottom:8}}>Paid directly? Enter M-Pesa Transaction Code</div>
    <div style={{display:"flex",gap:8}}>
      <input className="inp" placeholder="e.g. RJK2X4ABCD" value={manualCode} onChange={e=>setManualCode(e.target.value.toUpperCase())} style={{flex:1,fontFamily:"monospace",letterSpacing:".05em"}} maxLength={12}/>
      <button className="btn bg2 sm" onClick={verifyManual} disabled={verifying||manualCode.length<8}>{verifying?<Spin/>:"Verify"}</button>
    </div>
    <p style={{fontSize:11,color:"#CCCCCC",marginTop:5}}>We confirm the code was paid to Till 5673935 before unlocking.</p>
  </div>;

  return <Modal title={pitchId?"Reveal Contact Info — KSh 250":type==="unlock"?"Reveal Contact Info — KSh 250":"Escrow Payment"} onClose={onClose}>
    {step==="form"&&<>
      {/* Decoy: Show the 3 options with escrow as the clearly "best" choice */}
      {type==="unlock"&&<div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#AAAAAA",marginBottom:12}}>How do you want to proceed?</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Option A — decoy: direct contact, no protection (least appealing) */}
          <div className="pay-option" style={{opacity:.7}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:"#F5F5F5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{Ic.phone(16,"#888888")}</div>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:"#1A1A1A",marginBottom:3}}>Unlock Contact — KSh 250</div>
                <div style={{fontSize:12,color:"#888888",lineHeight:1.6}}>Get the buyer's number directly. No transaction protection. Riskier for cash deals.</div>
              </div>
            </div>
          </div>
          {/* Option B — featured: escrow (the obvious best choice, decoy pushes buyer here) */}
          <div className="pay-option featured" style={{position:"relative"}}>
            <div className="pay-badge gold">MOST POPULAR — BEST VALUE</div>
            <div style={{display:"flex",alignItems:"flex-start",gap:12,marginTop:8}}>
              <div style={{width:36,height:36,borderRadius:10,background:"rgba(20,40,160,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{Ic.shield(16,"#1428A0")}</div>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:"#1428A0",marginBottom:3}}>Buy with Escrow — Full Protection</div>
                <div style={{fontSize:12,color:"#444444",lineHeight:1.65}}>Your money is held safely until you receive and confirm the item. <strong style={{color:"#1428A0"}}>If anything goes wrong, you get a full refund.</strong> Fee: 5.5% of item price.</div>
                <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span className="badge" style={{background:"rgba(20,40,160,.08)",color:"#1428A0"}}>Buyer protected</span>
                  <span className="badge" style={{background:"rgba(16,185,129,.1)",color:"#059669"}}>Full refund if dispute</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{height:1,background:"#F0F0F0",margin:"20px 0"}}/>
        <div style={{fontSize:11,color:"#AAAAAA",lineHeight:1.6,marginBottom:16}}>Or pay KSh 250 to just unlock the contact and negotiate directly:</div>
      </div>}

      {/* Seller safety tip — shown only on unlock */}
      {type==="unlock"&&<div style={{background:"#F8F9FF",border:"1px solid #C7D2FE",borderRadius:12,padding:"12px 14px",marginBottom:16,fontSize:12,color:"#1428A0",lineHeight:1.7}}>
        <strong style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>{Ic.shield(14)} Seller tip:</strong> Once you unlock, you'll see the buyer's contact details. <strong>Do not hand over the item until payment is confirmed.</strong>
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
          <FF label="Your M-Pesa Number" required>
            <div style={{display:"flex"}}>
              <div style={{background:"#F5F5F5",border:"1.5px solid #E0E0E0",borderRight:"none",borderRadius:6,padding:"10px 12px",fontSize:13,color:"#888888",whiteSpace:"nowrap"}}>KE +254</div>
              <input className="inp" style={{borderRadius:6}} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value.replace(/[^0-9]/g,""))} placeholder="0712345678" maxLength={10}/>
            </div>
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
            <strong style={{display:"flex",alignItems:"center",gap:6}}>{Ic.warning(14)} Security reminder:</strong> {type==="escrow"?<>This payment of <strong>{fmtKES(finalAmt)}</strong> goes to <strong>Weka Soko Till 5673935</strong> only. Funds are held in escrow — not paid directly to the seller.</>:<>This KSh 250 is paid to <strong>Weka Soko Till 5673935</strong> only. We will <strong>never</strong> ask you to send money to a seller's personal number before meeting.</>}
          </div>
          <button className="btn bp lg" style={{width:"100%"}} onClick={startPayment} disabled={phone.length<10}>
            Send M-Pesa Request — {fmtKES(finalAmt)}
          </button>
          <ManualInput/>
        </>}
    </>}
    {step==="pushing"&&<div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{marginBottom:18}}><Spin s="48px"/></div>
      <h3 style={{fontWeight:700,marginBottom:8}}>Sending M-Pesa Request...</h3>
      <p style={{color:"#888888",fontSize:14}}>Watch for a push notification on <strong>{phone}</strong></p>
    </div>}
    {step==="polling"&&<div style={{textAlign:"center",padding:"24px 0"}}>
      <div style={{marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.phone(56,"#1428A0")}</div>
      <h3 style={{fontWeight:700,marginBottom:8}}>Enter Your M-Pesa PIN</h3>
      <p style={{color:"#888888",fontSize:14,marginBottom:16}}>Check your phone · Pay Till <strong>5673935</strong> · {fmtKES(finalAmt)}</p>
      <div style={{fontSize:48,fontWeight:700,color:"#111111",marginBottom:8}}>{cd}s</div>
      <div className="progress"><div className="progress-bar" style={{width:`${(cd/90)*100}%`}}/></div>
      <ManualInput/>
    </div>}
    {step==="timeout"&&<div style={{textAlign:"center",padding:"24px 0"}}>
      <div style={{marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{Ic.clock(56,"#C03030")}</div>
      <h3 style={{fontWeight:700,marginBottom:8}}>Request Timed Out</h3>
      <p style={{color:"#888888",fontSize:14,marginBottom:14}}>Did you pay? Paste your M-Pesa code to verify:</p>
      <ManualInput/>
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


export { PayModal };
