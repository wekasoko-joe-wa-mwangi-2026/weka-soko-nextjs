'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AllListingsPage, Toast } from '@/components/all';

export default function ListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [toast, setToast] = useState(null);
  const [ready, setReady] = useState(false);
  const [savedIds, setSavedIds] = useState([]);

  const notify = (msg, type = 'info') => setToast({ msg, type, id: Date.now() });

  const apiCall = async (path, opts = {}) => {
    const res = await fetch(`https://weka-soko-backend.onrender.com${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
    return res.json();
  };

  const handleToggleSave = async (id) => {
    if (!token) { notify('Sign in to save listings', 'warning'); return; }
    try {
      const isSaved = savedIds.includes(id);
      await apiCall(`/api/listings/${id}/${isSaved ? 'unsave' : 'save'}`, { method: 'POST' }, token);
      setSavedIds(p => isSaved ? p.filter(x => x !== id) : [...p, id]);
      notify(isSaved ? 'Removed from saved' : 'Saved!', 'success');
    } catch (e) { notify(e.message, 'error'); }
  };

  useEffect(() => {
    const t = localStorage.getItem('ws_token');
    const u = localStorage.getItem('ws_user');
    if (u) try { setUser(JSON.parse(u)); } catch {}
    if (t) setToken(t);
    
    // Load saved listings if logged in
    if (t) {
      apiCall('/api/listings/buyer/saved/ids', {}, t)
        .then(r => setSavedIds(Array.isArray(r) ? r : []))
        .catch(() => {});
    }
    
    setReady(true);
  }, []);

  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spin" style={{ width: 40, height: 40 }} />
    </div>
  );

  return (
    <>
      <AllListingsPage 
        user={user}
        token={token}
        notify={notify}
        savedIds={savedIds}
        onBack={() => router.push('/')}
        onOpenListing={(id) => router.push(`/listings/${id}`)}
        onToggleSave={handleToggleSave}
        onPostAd={() => {
          if (!user) {
            router.push('/?auth=signup');
            return;
          }
          // Open post ad modal or redirect
          router.push('/?post=1');
        }}
        onSignIn={() => router.push('/?auth=login')}
        initialFilter={{ cat: '', subcat: '', q: '', county: '', minPrice: '', maxPrice: '', sort: 'newest' }}
      />
      {toast && <Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
