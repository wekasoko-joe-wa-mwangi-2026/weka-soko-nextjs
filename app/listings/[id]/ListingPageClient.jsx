'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/utils';
import { DetailModal, AuthModal, PayModal, ChatModal, ShareModal, Toast } from '@/components/all';

export default function ListingPageClient({ initialListing, listingId }) {
  const router = useRouter();
  const [listing, setListing] = useState(initialListing);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [modal, setModal] = useState('detail');
  const [payType, setPayType] = useState('unlock');
  const [toast, setToast] = useState(null);

  const notify = (msg, type = 'info') => setToast({ msg, type, id: Date.now() });

  useEffect(() => {
    const t = localStorage.getItem('ws_token');
    const u = localStorage.getItem('ws_user');
    if (t && u) { try { setUser(JSON.parse(u)); setToken(t); } catch {} }
    api(`/api/listings/${listingId}`).then(fresh => setListing(fresh)).catch(() => {});
  }, [listingId]);

  const handleLockIn = async () => {
    if (!user) { setModal('auth'); return; }
    try {
      await api(`/api/listings/${listing.id}/lock-in`, { method: 'POST' }, token);
      setListing(p => ({ ...p, locked_buyer_id: user.id }));
      notify('🔥 Locked in! The seller has been notified.', 'success');
    } catch (e) { notify(e.message, 'error'); }
  };

  if (!listing) return null;

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
          amount={payType === 'unlock' ? 250 : listing.price + Math.round(listing.price * 0.075)}
          purpose={payType === 'unlock' ? `Reveal buyer: ${listing.title}` : `Escrow: ${listing.title}`}
          token={token} user={user} allowVoucher={true}
          onSuccess={async () => {
            const fresh = await api(`/api/listings/${listing.id}`, {}, token).catch(() => null);
            if (fresh) setListing(fresh);
            setModal('detail');
            notify(payType === 'unlock' ? '🔓 Buyer revealed!' : '🔐 Escrow activated!', 'success');
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
}
