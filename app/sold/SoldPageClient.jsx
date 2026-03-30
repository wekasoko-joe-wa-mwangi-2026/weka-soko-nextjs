'use client';

import { useRouter } from 'next/navigation';
import { WekaSokoLogo, SoldSection } from '@/components/all';

export default function SoldPageClient({ initialItems }) {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: '#F0F0F0' }}>
      <div style={{ background: '#1D1D1D', padding: 'clamp(28px,4vw,52px) clamp(16px,4vw,40px) clamp(28px,4vw,48px)' }}>
        <button onClick={() => router.push('/')}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.35)', color: '#fff', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--fn)', marginBottom: 28, display: 'inline-flex', alignItems: 'center', gap: 6, letterSpacing: '.02em', borderRadius: 8 }}>
          ← Back to Marketplace
        </button>
        <div style={{ marginBottom: 14, opacity: .9 }}><WekaSokoLogo size={26} /></div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 10 }}>Sold Listings</div>
        <h1 style={{ fontSize: 'clamp(30px,5vw,54px)', fontWeight: 700, letterSpacing: '-.03em', color: '#fff', lineHeight: 1.05, marginBottom: 14 }}>Sold on Weka Soko</h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,.7)', maxWidth: 500, lineHeight: 1.75 }}>Real items. Real buyers. Every listing below found a home through Weka Soko.</p>
      </div>
      <div style={{ padding: '44px 48px 80px' }}>
        <SoldSection token={null} user={null} initialItems={initialItems} />
      </div>
    </div>
  );
}
