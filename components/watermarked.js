'use client';

import { useState, useEffect, useRef } from 'react';

// ── WATERMARKED IMAGE ─────────────────────────────────────────────────────────
// Renders an image on a <canvas> with a centered semi-transparent WekaSoko logo watermark.
// The watermark is baked into the canvas pixel data — right-click save includes it.
export default function WatermarkedImage({src,alt,style={},onClick}){
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
      
      // Draw SVG logo watermark
      const watermarkSize=Math.min(w*0.25,180);
      const x=(w-watermarkSize)/2;
      const y=(h-watermarkSize*0.8)/2;
      
      ctx.save();
      ctx.globalAlpha=0.25;
      
      // Draw stylized W and S
      ctx.strokeStyle="#FFFFFF";
      ctx.lineWidth=watermarkSize*0.15;
      ctx.lineCap="round";
      ctx.lineJoin="round";
      
      // W shape
      ctx.beginPath();
      ctx.moveTo(x+watermarkSize*0.1, y+watermarkSize*0.2);
      ctx.lineTo(x+watermarkSize*0.3, y+watermarkSize*0.8);
      ctx.lineTo(x+watermarkSize*0.5, y+watermarkSize*0.2);
      ctx.lineTo(x+watermarkSize*0.7, y+watermarkSize*0.8);
      ctx.lineTo(x+watermarkSize*0.9, y+watermarkSize*0.2);
      ctx.stroke();
      
      // Gold accent bar
      ctx.strokeStyle="#C49A00";
      ctx.lineWidth=watermarkSize*0.12;
      ctx.beginPath();
      ctx.moveTo(x+watermarkSize*0.65, y+watermarkSize*0.1);
      ctx.lineTo(x+watermarkSize*0.65, y+watermarkSize*0.9);
      ctx.stroke();
      
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
