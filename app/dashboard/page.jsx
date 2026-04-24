'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Toast } from '@/components/all';
const Dashboard = dynamic(() => import('@/components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })), { ssr: false, loading: () => null });

export default function DashboardPage() {
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
      <Dashboard
        user={user} token={token} notify={notify}
        onPostAd={() => router.push('/?post=1')}
        onClose={() => router.push('/')}
        onUserUpdate={updated => {
          const merged = { ...user, ...updated };
          setUser(merged);
          localStorage.setItem('ws_user', JSON.stringify(merged));
        }}
      />
      {toast && <Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
