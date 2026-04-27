'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BuyersWantPage, Toast } from '@/components/all';

export default function RequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [toast, setToast] = useState(null);
  const [ready, setReady] = useState(false);

  const notify = (msg, type = 'info') => setToast({ msg, type, id: Date.now() });

  useEffect(() => {
    const t = localStorage.getItem('ws_token');
    const u = localStorage.getItem('ws_user');
    if (!t || !u) { router.push('/'); return; }
    try { setUser(JSON.parse(u)); setToken(t); setReady(true); }
    catch { router.push('/'); }
  }, [router]);

  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spin" style={{ width: 40, height: 40 }} />
    </div>
  );

  return (
    <>
      <BuyersWantPage 
        user={user} 
        token={token} 
        notify={notify}
        onBack={() => router.push('/')}
        onIHaveThis={() => {}}
        onSignIn={() => router.push('/?auth=login')}
      />
      {toast && <Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
