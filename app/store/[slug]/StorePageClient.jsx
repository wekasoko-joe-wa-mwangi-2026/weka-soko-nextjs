'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiCall, fmtKES, ago, CATS } from '@/lib/utils';
import { WekaSokoLogo, Spin } from '@/components/all';

function VerifiedBadge() {
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:4,background:'rgba(20,40,160,.09)',color:'#1428A0',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:5,letterSpacing:'.04em'}}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="#1428A0"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
      Verified Store
    </span>
  );
}

function ListingCard({ l, onOpen }) {
  const photos = Array.isArray(l.photos) ? l.photos.map(p => typeof p === 'string' ? p : p?.url).filter(Boolean) : [];
  const photo = photos[0] || null;
  return (
    <div onClick={() => onOpen(l)} style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'box-shadow .16s,transform .16s'}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,.09)';e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)';}}>
      <div style={{height:160,background:'#F5F5F5',overflow:'hidden',position:'relative'}}>
        {photo
          ? <img src={photo} alt={l.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:11,color:'#AAAAAA',fontWeight:600}}>No photo</span>
            </div>}
        {l.status==='sold'&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontWeight:800,fontSize:13,letterSpacing:'.06em'}}>SOLD</span></div>}
      </div>
      <div style={{padding:'12px 14px'}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'#AAAAAA',marginBottom:4}}>{l.category}</div>
        <div style={{fontWeight:700,fontSize:14,color:'#1A1A1A',marginBottom:6,lineHeight:1.35,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{l.title}</div>
        <div style={{fontWeight:800,fontSize:18,color:'#1428A0',letterSpacing:'-.01em'}}>{fmtKES(l.price)}</div>
        <div style={{fontSize:11,color:'#AAAAAA',marginTop:6}}>{ago(l.created_at)}{l.county ? ` · ${l.county}` : ''}</div>
      </div>
    </div>
  );
}

export default function StorePageClient({ store, initialListings, initialTotal }) {
  const [listings, setListings] = useState(initialListings || []);
  const [total, setTotal] = useState(initialTotal || 0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [catFilter, setCatFilter] = useState('');

  const load = useCallback(async (pg, cat) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: pg, limit: 24 });
      if (cat) qs.set('category', cat);
      const data = await apiCall(`/api/stores/${store.slug}/listings?${qs}`);
      setListings(data.listings || []);
      setTotal(data.total || 0);
    } catch { setListings([]); }
    finally { setLoading(false); }
  }, [store.slug]);

  useEffect(() => { load(page, catFilter); }, [page, catFilter]);

  const openListing = (l) => {
    window.location.href = `/?listing=${l.id}`;
  };

  const cats = [...new Set(listings.map(l => l.category).filter(Boolean))];

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"var(--fn,'SamsungSharpSans','Helvetica Neue',sans-serif)"}}>
      {/* Nav */}
      <nav style={{background:'#fff',borderBottom:'1px solid #EBEBEB',padding:'0 clamp(16px,4vw,48px)',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <a href="/" style={{textDecoration:'none',display:'flex',alignItems:'center'}}><WekaSokoLogo size={34}/></a>
        <div style={{display:'flex',gap:8}}>
          <a href="/malls" style={{color:'#636363',fontSize:13,fontWeight:600,textDecoration:'none',padding:'8px 14px'}}>All Malls</a>
          <a href="/" style={{color:'#636363',fontSize:13,fontWeight:600,textDecoration:'none',padding:'8px 14px'}}>Browse</a>
        </div>
      </nav>

      {/* Banner */}
      <div style={{height:180,background:store.banner_url?`url(${store.banner_url}) center/cover`:'linear-gradient(135deg,#1428A0 0%,#6c63ff 100%)',position:'relative'}}>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.25)'}}/>
      </div>

      {/* Store header */}
      <div style={{background:'#fff',borderBottom:'1px solid #EBEBEB',padding:'0 clamp(16px,4vw,48px) 20px',position:'relative'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex',gap:20,alignItems:'flex-end',marginTop:-36}}>
          {/* Logo */}
          <div style={{width:72,height:72,borderRadius:14,background:'#fff',border:'3px solid #fff',overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,.14)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {store.logo_url
              ? <img src={store.logo_url} alt={store.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <span style={{fontWeight:800,fontSize:28,color:'#1428A0'}}>{(store.name||'?')[0].toUpperCase()}</span>}
          </div>
          <div style={{flex:1,minWidth:0,paddingBottom:4}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <h1 style={{fontSize:22,fontWeight:800,color:'#1A1A1A',margin:0,letterSpacing:'-.01em'}}>{store.name}</h1>
              {store.is_verified && <VerifiedBadge/>}
            </div>
            {store.tagline && <p style={{margin:'4px 0 0',fontSize:13,color:'#636363'}}>{store.tagline}</p>}
          </div>
        </div>

        {/* Meta row */}
        <div style={{maxWidth:900,margin:'16px auto 0',display:'flex',gap:16,flexWrap:'wrap',alignItems:'center'}}>
          {store.category && <span style={{fontSize:12,color:'#888',fontWeight:600,background:'#F5F5F5',padding:'4px 10px',borderRadius:6}}>{store.category}</span>}
          {store.county && <span style={{fontSize:12,color:'#888',display:'flex',alignItems:'center',gap:4}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{store.county}
          </span>}
          <span style={{fontSize:12,color:'#AAAAAA'}}>{total} listing{total!==1?'s':''}</span>
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            {store.whatsapp && <a href={`https://wa.me/${store.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener" style={{display:'inline-flex',alignItems:'center',gap:5,background:'#25D366',color:'#fff',padding:'7px 14px',borderRadius:8,fontSize:12,fontWeight:700,textDecoration:'none'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>}
            {store.instagram && <a href={`https://instagram.com/${store.instagram.replace('@','')}`} target="_blank" rel="noopener" style={{display:'inline-flex',alignItems:'center',gap:5,background:'#E1306C',color:'#fff',padding:'7px 14px',borderRadius:8,fontSize:12,fontWeight:700,textDecoration:'none'}}>Instagram</a>}
            {store.website && <a href={store.website} target="_blank" rel="noopener" style={{display:'inline-flex',alignItems:'center',gap:5,background:'#F5F5F5',color:'#1A1A1A',padding:'7px 14px',borderRadius:8,fontSize:12,fontWeight:700,textDecoration:'none'}}>Website</a>}
          </div>
        </div>

        {store.description && (
          <div style={{maxWidth:900,margin:'14px auto 0',fontSize:13,color:'#636363',lineHeight:1.8,padding:'12px 16px',background:'#F9F9F9',borderRadius:10}}>
            {store.description}
          </div>
        )}
      </div>

      {/* Listings */}
      <div style={{maxWidth:960,margin:'0 auto',padding:'28px clamp(16px,4vw,48px) 80px'}}>
        {/* Category filter tabs */}
        {cats.length > 1 && (
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}}>
            <button onClick={()=>{setCatFilter('');setPage(1);}} style={{padding:'7px 14px',borderRadius:20,border:`1.5px solid ${!catFilter?'#1428A0':'#E0E0E0'}`,background:!catFilter?'#1428A0':'#fff',color:!catFilter?'#fff':'#636363',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>All</button>
            {cats.map(c=><button key={c} onClick={()=>{setCatFilter(c);setPage(1);}} style={{padding:'7px 14px',borderRadius:20,border:`1.5px solid ${catFilter===c?'#1428A0':'#E0E0E0'}`,background:catFilter===c?'#1428A0':'#fff',color:catFilter===c?'#fff':'#636363',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{c}</button>)}
          </div>
        )}

        {loading ? (
          <div style={{textAlign:'center',padding:60}}><Spin s="36px"/></div>
        ) : listings.length === 0 ? (
          <div style={{textAlign:'center',padding:80,color:'#AAAAAA'}}>
            <div style={{fontSize:36,marginBottom:10,opacity:.3}}>📦</div>
            <div style={{fontWeight:700,fontSize:16,color:'#1A1A1A',marginBottom:4}}>No listings yet</div>
            <p style={{fontSize:13}}>Check back soon</p>
          </div>
        ) : (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16}}>
              {listings.map(l => <ListingCard key={l.id} l={l} onOpen={openListing}/>)}
            </div>
            {/* Pagination */}
            {total > 24 && (
              <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:32}}>
                {page > 1 && <button onClick={()=>setPage(p=>p-1)} style={{padding:'9px 18px',border:'1px solid #E0E0E0',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>Previous</button>}
                <span style={{padding:'9px 14px',fontSize:13,color:'#888'}}>Page {page} of {Math.ceil(total/24)}</span>
                {page < Math.ceil(total/24) && <button onClick={()=>setPage(p=>p+1)} style={{padding:'9px 18px',border:'1px solid #E0E0E0',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>Next</button>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
