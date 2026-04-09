import { Suspense } from 'react';
import MallsClient from './MallsClient';

const API = (process.env.NEXT_PUBLIC_API_URL || 'https://wekasokobackend.up.railway.app').replace(/\/$/, '');

export const metadata = {
  title: 'Weka Soko Malls — Verified Shops & Dealers in Kenya',
  description: 'Browse verified shops and dealers on Weka Soko. Electronics, vehicles, fashion, furniture and more — direct from trusted Kenyan businesses.',
  openGraph: {
    title: 'Weka Soko Malls — Verified Shops & Dealers in Kenya',
    description: 'Browse verified shops and dealers on Weka Soko.',
    url: 'https://weka-soko-nextjs.vercel.app/malls',
    siteName: 'Weka Soko',
  },
};

export default async function MallsPage({ searchParams }) {
  const params = await searchParams;
  const { category = '', county = '', q = '' } = params;
  const qs = new URLSearchParams({ limit: 48, offset: 0 });
  if (category) qs.set('category', category);
  if (county)   qs.set('county', county);
  if (q)        qs.set('q', q);

  let initialStores = [];
  let initialTotal = 0;
  try {
    const res = await fetch(`${API}/api/stores?${qs}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      initialStores = data.stores || [];
      initialTotal  = data.total  || 0;
    }
  } catch {}

  return (
    <Suspense>
      <MallsClient initialStores={initialStores} initialTotal={initialTotal} initialFilter={{ category, county, q }} />
    </Suspense>
  );
}
