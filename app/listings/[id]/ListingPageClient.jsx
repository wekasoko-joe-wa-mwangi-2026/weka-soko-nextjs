'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/utils';
import { DetailModal, AuthModal, PayModal, ChatModal, ShareModal, Toast, SwipeFeed } from '@/components/all';

export default function ListingPageClient({ initialListing, listingId }) {
  const router = useRouter();
  const [listing, setListing] = useState(initialListing);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [modal, setModal] = useState('detail');
  const [payType, setPayType] = useState('unlock');
  const [toast, setToast] = useState(null);
  const [isMobile, setIsMobile] = useState(null); // null = unknown until JS runs

  const notify = (msg, type = 'info') => setToast({ msg, type, id: Date.now() });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('ws_token');
    const u = localStorage.getItem('ws_user');
    if (t && u) { try { setUser(JSON.parse(u)); setToken(t); } catch {} }
    apiCall(`/api/listings/${listingId}`).then(fresh => setListing(fresh)).catch(() => {});
  }, [listingId]);

  const handleLockIn = async () => {
    if (!user) { setModal('auth'); return; }
    try {
      await apiCall(`/api/listings/${listing.id}/lock-in`, { method: 'POST' }, token);
      setListing(p => ({ ...p, locked_buyer_id: user.id }));
      notify('Locked in! The seller has been notified.', 'success');
    } catch (e) { notify(e.message, 'error'); }
  };

  // Wait until we know mobile vs desktop before rendering anything interactive
  if (isMobile === null) return null;
  if (!listing) return (
    <div style={{position:'fixed',inset:0,zIndex:9999,background:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:32,textAlign:'center'}}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div style={{fontWeight:700,fontSize:18,color:'#1A1A1A'}}>Listing not found</div>
      <div style={{fontSize:14,color:'#636363'}}>This ad may have been removed or is no longer available.</div>
      <a href="/" style={{marginTop:8,background:'#1428A0',color:'#fff',padding:'12px 28px',borderRadius:10,fontWeight:700,fontSize:14,textDecoration:'none'}}>Browse Listings</a>
    </div>
  );

  const sharedModals = (
    <>
      {modal === 'chat' && user && (
        <ChatModal listing={listing} user={user} token={token} onClose={() => setModal('detail')} notify={notify} />
      )}
      {modal === 'share' && (
        <ShareModal listing={listing} onClose={() => setModal('detail')} />
      )}
      {modal === 'pay' && user && (
        <PayModal
          type={payType}
          listingId={listing.id}
          amount={payType === 'unlock' ? Math.max(0, 250 - (listing.unlock_discount || 0)) : listing.price + Math.round(listing.price * 0.075)}
          purpose={payType === 'unlock' ? `Reveal buyer: ${listing.title}` : `Escrow: ${listing.title}`}
          token={token} user={user} allowVoucher={true}
          onSuccess={async () => {
            const fresh = await apiCall(`/api/listings/${listing.id}`, {}, token).catch(() => null);
            if (fresh) setListing(fresh);
            setModal('detail');
            notify(payType === 'unlock' ? 'Buyer revealed!' : 'Escrow activated!', 'success');
          }}
          onClose={() => setModal('detail')} notify={notify}
        />
      )}
      {modal === 'auth' && (
        <AuthModal defaultMode="login" onClose={() => setModal('detail')}
          onAuth={(u, t) => {
            setUser(u); setToken(t);
            localStorage.setItem('ws_token', t);
            localStorage.setItem('ws_user', JSON.stringify(u));
            setModal('detail');
          }}
          notify={notify}
        />
      )}
      {toast && <Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );

  // Mobile: full-screen SwipeFeed — same experience as in-app browsing
  if (isMobile) {
    return (
      <>
        {modal === 'detail' && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
            <SwipeFeed
              user={user} token={token}
              initialListings={[listing]} startIndex={0}
              onOpen={() => {}}
              onLockIn={handleLockIn}
              onMessage={() => { if (!user) { setModal('auth'); return; } setModal('chat'); }}
              savedIds={new Set()}
              onToggleSave={null}
              onSignIn={() => setModal('auth')}
              onPostAd={() => router.push('/')}
              onClose={() => router.push('/')}
            />
          </div>
        )}
        {sharedModals}
      </>
    );
  }

  // Desktop: slide-up DetailModal
  return (
    <>
      {modal === 'detail' && (
        <DetailModal
          listing={listing} user={user} token={token}
          onClose={() => router.push('/')}
          notify={notify}
          onShare={() => setModal('share')}
          onChat={() => { if (!user) { setModal('auth'); return; } setModal('chat'); }}
          onLockIn={handleLockIn}
          onUnlock={() => { setPayType('unlock'); setModal('pay'); }}
          onEscrow={() => { if (!user) { setModal('auth'); return; } setPayType('escrow'); setModal('pay'); }}
        />
      )}
      {sharedModals}
    </>
  );
}
