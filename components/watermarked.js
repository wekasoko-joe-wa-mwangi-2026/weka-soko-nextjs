// ── WATERMARKED IMAGE ─────────────────────────────────────────────────────────
// Renders an image on a <canvas> with a centered semi-transparent WekaSoko logo watermark.
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
      
      // Add centered logo watermark
      const logoImg=new Image();
      logoImg.crossOrigin="anonymous";
      logoImg.onload=()=>{
        // Calculate watermark size (25% of image width, max 180px)
        const watermarkWidth=Math.min(w*0.25,180);
        const scale=watermarkWidth/logoImg.width;
        const watermarkHeight=logoImg.height*scale;
        
        // Center position
        const x=(w-watermarkWidth)/2;
        const y=(h-watermarkHeight)/2;
        
        ctx.save();
        // Set transparency (25% opacity)
        ctx.globalAlpha=0.25;
        ctx.drawImage(logoImg,x,y,watermarkWidth,watermarkHeight);
        ctx.restore();
        
        setLoaded(true);
      };
      logoImg.onerror=()=>setLoaded(true);
      logoImg.src="/logo-ws-new.png";
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