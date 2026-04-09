import { API, CATS } from '@/lib/utils';

const BASE = 'https://weka-soko-nextjs.vercel.app';

export default async function sitemap() {
  const staticPages = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE}/sold`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    // Category pages — each gets its own indexable URL
    ...CATS.map(cat => ({
      url: `${BASE}/?cat=${encodeURIComponent(cat.name)}`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    })),
  ];

  // Fetch all active listings in batches of 500
  const listingPages = [];
  try {
    let offset = 0;
    const limit = 500;
    while (true) {
      const res = await fetch(
        `${API}/api/listings?limit=${limit}&page=${Math.floor(offset / limit) + 1}&sort=newest`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) break;
      const data = await res.json();
      const batch = data.listings || [];
      if (!batch.length) break;
      batch.forEach(l => {
        listingPages.push({
          url: `${BASE}/listings/${l.id}`,
          lastModified: new Date(l.updated_at || l.created_at),
          changeFrequency: 'daily',
          priority: 0.9,
        });
      });
      if (batch.length < limit) break;
      offset += limit;
      if (offset > 10000) break; // safety cap
    }
  } catch {}

  return [...staticPages, ...listingPages];
}
