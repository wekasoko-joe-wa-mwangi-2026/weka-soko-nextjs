'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiCall, CATS, KENYA_COUNTIES } from '@/lib/utils';
import { WekaSokoLogo } from '@/components/all';

const API = (process.env.NEXT_PUBLIC_API_URL || 'https://wekasokobackend.up.railway.app').replace(/\/$/, '');

function fmtNum(n) { return Number(n||0).toLocaleString('en-KE'); }

function VerifiedBadge() {
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:3,background:'rgba(20,40,160,.08)',color:'#1428A0',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:4,letterSpacing:'.04em'}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="#1428A0"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
      Verified
    </span>
  );
}

function StoreCard({ store }) {
  return (
    <a href={`/store/${store.slug}`} style={{textDecoration:'none',display:'flex',flexDirection:'column',background:'#fff',border:'1px solid #EBEBEB',borderRadius:16,overflow:'hidden',transition:'box-shadow .18s,transform .18s',cursor:'pointer'}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 24px rgba(0,0,0,.10)';e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)';}}>
      {/* Banner */}
      <div style={{height:90,background:store.banner_url?`url(${store.banner_url}) center/cover`:'linear-gradient(135deg,#1428A0 0%,#6c63ff 100%)',position:'relative',flexShrink:0}}>
        {/* Logo */}
        <div style={{position:'absolute',bottom:-24,left:16,width:48,height:48,borderRadius:10,background:'#fff',border:'2px solid #EBEBEB',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {store.logo_url
            ? <img src={store.logo_url} alt={store.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : <span style={{fontWeight:800,fontSize:18,color:'#1428A0'}}>{(store.name||'?')[0].toUpperCase()}</span>}
        </div>
      </div>
      {/* Body */}
      <div style={{padding:'32px 16px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:4}}>
          <span style={{fontWeight:700,fontSize:15,color:'#1A1A1A'}}>{store.name}</span>
          {store.is_verified && <VerifiedBadge/>}
        </div>
        {store.tagline && <p style={{fontSize:12,color:'#636363',margin:'0 0 8px',lineHeight:1.5}}>{store.tagline.slice(0,80)}</p>}
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {store.category && <span style={{fontSize:11,fontWeight:600,color:'#888',background:'#F5F5F5',padding:'3px 8px',borderRadius:4}}>{store.category}</span>}
          {store.county && <span style={{fontSize:11,fontWeight:600,color:'#888',background:'#F5F5F5',padding:'3px 8px',borderRadius:4}}>{store.county}</span>}
          <span style={{fontSize:11,color:'#AAAAAA',marginLeft:'auto'}}>{fmtNum(store.active_listing_count)} listing{store.active_listing_count!==1?'s':''}</span>
        </div>
      </div>
    </a>
  );
}

export default function MallsClient({ initialStores, initialTotal, initialFilter }) {
  const [stores, setStores]     = useState(initialStores || []);
  const [total, setTotal]       = useState(initialTotal || 0);
  const [loading, setLoading]   = useState(false);
  const [filter, setFilter]     = useState(initialFilter || { category:'', county:'', q:'' });
  const [searchInput, setSearchInput] = useState(initialFilter?.q || '');

  const load = useCallback(async (f) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit:48, offset:0 });
      if (f.category) qs.set('category', f.category);
      if (f.county)   qs.set('county', f.county);
      if (f.q)        qs.set('q', f.q);
      const data = await apiCall(`/api/stores?${qs}`);
      setStores(data.stores || []);
      setTotal(data.total || 0);
    } catch { setStores([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(filter); }, [filter]);

  const setF = (key, val) => setFilter(f => ({ ...f, [key]: val }));

  return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',fontFamily:"var(--fn,'SamsungSharpSans','Helvetica Neue',sans-serif)"}}>
      {/* Nav */}
      <nav style={{background:'#fff',borderBottom:'1px solid #EBEBEB',padding:'0 clamp(16px,4vw,48px)',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <a href="/" style={{textDecoration:'none',display:'flex',alignItems:'center'}}>
          <WekaSokoLogo size={34}/>
        </a>
        <div style={{display:'flex',gap:8}}>
          <a href="/" style={{color:'#636363',fontSize:13,fontWeight:600,textDecoration:'none',padding:'8px 14px'}}>Browse</a>
          <span style={{color:'#1428A0',fontSize:13,fontWeight:700,padding:'8px 14px',borderBottom:'2px solid #1428A0'}}>Malls</span>
        </div>
      </nav>

      {/* Hero */}
      <div style={{background:'linear-gradient(135deg,#1428A0 0%,#0f1f8a 100%)',padding:'40px clamp(16px,4vw,48px) 36px',color:'#fff'}}>
        <div style={{maxWidth:700,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(255,255,255,.6)',marginBottom:10}}>Weka Soko Malls</div>
          <h1 style={{fontSize:'clamp(24px,3vw,40px)',fontWeight:800,letterSpacing:'-.02em',marginBottom:12}}>Verified Shops & Dealers</h1>
          <p style={{fontSize:14,color:'rgba(255,255,255,.75)',lineHeight:1.8,marginBottom:24}}>Browse Kenya's trusted business storefronts — verified by Weka Soko. Real inventory, real sellers.</p>
          {/* Search */}
          <div style={{display:'flex',gap:8,maxWidth:480,margin:'0 auto'}}>
            <input
              value={searchInput}
              onChange={e=>setSearchInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&setF('q',searchInput.trim())}
              placeholder="Search stores..."
              style={{flex:1,padding:'12px 16px',borderRadius:10,border:'none',fontSize:14,fontFamily:'inherit',outline:'none'}}
            />
            <button onClick={()=>setF('q',searchInput.trim())} style={{background:'#fff',color:'#1428A0',border:'none',padding:'12px 20px',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>Search</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{background:'#fff',borderBottom:'1px solid #EBEBEB',padding:'12px clamp(16px,4vw,48px)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <select value={filter.category} onChange={e=>setF('category',e.target.value)}
          style={{padding:'8px 12px',border:'1px solid #E0E0E0',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff',cursor:'pointer',color:filter.category?'#1428A0':'#888'}}>
          <option value="">All Categories</option>
          {CATS.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select value={filter.county} onChange={e=>setF('county',e.target.value)}
          style={{padding:'8px 12px',border:'1px solid #E0E0E0',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff',cursor:'pointer',color:filter.county?'#1428A0':'#888'}}>
          <option value="">All Counties</option>
          {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        {(filter.category||filter.county||filter.q)&&(
          <button onClick={()=>{setFilter({category:'',county:'',q:''});setSearchInput('');}} style={{background:'none',border:'1px solid #E0E0E0',color:'#636363',padding:'8px 14px',borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Clear</button>
        )}
        <span style={{marginLeft:'auto',fontSize:12,color:'#AAAAAA'}}>{fmtNum(total)} store{total!==1?'s':''}</span>
      </div>

      {/* Grid */}
      <div style={{maxWidth:1280,margin:'0 auto',padding:'32px clamp(16px,4vw,48px) 80px'}}>
        {loading ? (
          <div style={{textAlign:'center',padding:60,color:'#AAAAAA',fontSize:14}}>Loading stores...</div>
        ) : stores.length === 0 ? (
          <div style={{textAlign:'center',padding:80}}>
            <div style={{fontSize:40,marginBottom:12,opacity:.3}}>🏬</div>
            <div style={{fontWeight:700,fontSize:18,color:'#1A1A1A',marginBottom:6}}>No stores found</div>
            <p style={{color:'#888',fontSize:14}}>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:20}}>
            {stores.map(s => <StoreCard key={s.id} store={s}/>)}
          </div>
        )}

        {/* CTA — open your mall */}
        <div style={{marginTop:60,background:'#fff',border:'1px solid #EBEBEB',borderRadius:20,padding:'40px 32px',textAlign:'center',maxWidth:540,margin:'60px auto 0'}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#1428A0',marginBottom:8}}>Open Your Mall</div>
          <h2 style={{fontSize:22,fontWeight:800,color:'#1A1A1A',marginBottom:10}}>Do you run a business?</h2>
          <p style={{fontSize:14,color:'#636363',lineHeight:1.8,marginBottom:20}}>Get a branded storefront, verified badge, and all your listings in one place. Free to set up.</p>
          <a href="/" style={{display:'inline-block',background:'#1428A0',color:'#fff',padding:'13px 28px',borderRadius:10,fontWeight:700,fontSize:14,textDecoration:'none'}}>Create Your Store</a>
        </div>
      </div>
    </div>
  );
}
