import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import StorePageClient from './StorePageClient';

const API = (process.env.NEXT_PUBLIC_API_URL || 'https://wekasokobackend.up.railway.app').replace(/\/$/, '');

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const res = await fetch(`${API}/api/stores/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return { title: 'Store Not Found — Weka Soko' };
    const store = await res.json();
    return {
      title: `${store.name} — Weka Soko Mall`,
      description: store.tagline || store.description?.slice(0, 160) || `Shop at ${store.name} on Weka Soko. Verified Kenyan dealer.`,
      openGraph: {
        title: `${store.name} — Weka Soko Mall`,
        description: store.tagline || `Shop at ${store.name} on Weka Soko.`,
        url: `https://weka-soko-nextjs.vercel.app/store/${slug}`,
        siteName: 'Weka Soko',
        images: store.banner_url ? [{ url: store.banner_url }] : [],
      },
    };
  } catch {
    return { title: 'Store — Weka Soko' };
  }
}

export default async function StorePage({ params }) {
  const { slug } = await params;

  let store = null;
  let initialListings = [];
  let initialTotal = 0;

  try {
    const [storeRes, listingsRes] = await Promise.all([
      fetch(`${API}/api/stores/${slug}`, { next: { revalidate: 60 } }),
      fetch(`${API}/api/stores/${slug}/listings?limit=24&page=1`, { next: { revalidate: 60 } }),
    ]);
    if (!storeRes.ok) return notFound();
    store = await storeRes.json();
    if (listingsRes.ok) {
      const data = await listingsRes.json();
      initialListings = data.listings || [];
      initialTotal = data.total || 0;
    }
  } catch {
    return notFound();
  }

  return (
    <Suspense>
      <StorePageClient store={store} initialListings={initialListings} initialTotal={initialTotal} />
    </Suspense>
  );
}
