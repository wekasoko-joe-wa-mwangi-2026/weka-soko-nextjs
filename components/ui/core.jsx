'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fmtKES, ago, CATS, KENYA_COUNTIES, KENYA_TOWNS, API, PER_PAGE, CAT_PHOTOS } from '@/lib/utils';
import { api, Ic } from '@/components/ui/primitives';

function Toast({msg,type,onClose}){

  useEffect(()=>{const t=setTimeout(onClose,5000);return()=>clearTimeout(t);},[]);
  const c={success:"#111111",error:"#444444",warning:"#B07F10",info:"#2563EB"}[type]||"#111111";
  return <div className="toast" style={{borderLeft:`3px solid ${c}`}}><span style={{display:"flex",alignItems:"center"}}>{({success:Ic.checkCircle(18,"#1428A0"),error:Ic.xCircle(18,"#C03030"),warning:Ic.warning(18,"#8B6400"),info:Ic.info(18,"#1428A0")})[type]||Ic.info(18,"#1428A0")}</span><span>{msg}</span><button className="btn bgh sm" style={{marginLeft:"auto",padding:"2px 6px"}} onClick={onClose}>{Ic.x(14)}</button></div>;
}

function Modal({title,onClose,children,footer,large,xl}){
const [closing,setClosing]=useState(false);
const [mounted,setMounted]=useState(false);
const closeRef=useRef(onClose);
closeRef.current=onClose;
const close=useCallback(()=>{setClosing(true);setTimeout(()=>closeRef.current(),200);},[]);
useEffect(()=>{
setMounted(true);
const h=e=>{if(e.key==="Escape")close();};
document.addEventListener("keydown",h);
return()=>document.removeEventListener("keydown",h);
},[close]);
const modalContent=(
<div className={`ov${closing?" closing":""}`} onClick={e=>e.target===e.currentTarget&&close()}>
<div className={`mod${large?" lg":""}${xl?" xl":""}${closing?" closing":""}`}>
<div className="mh">
<h3 style={{fontSize:17,fontWeight:700,lineHeight:1.3}}>{title}</h3>
<button className="icon-btn" onClick={close} title="Close" aria-label="Close modal">{Ic.x(18)}</button>
</div>
<div className="mb mod-stagger">{children}</div>
{footer&&<div className="mf">{footer}</div>}
</div>
</div>
);
if(!mounted)return null;
return createPortal(modalContent,document.body);
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



export { Toast, Modal, FF, Counter, compressImage, ImageUploader };
