import { API, CATS } from '@/lib/utils';

export default async function sitemap() {
  const baseUrl = 'https://weka-soko-frontend-rho.vercel.app';

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${baseUrl}/sold`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
    ...CATS.map(cat => ({
      url: `${baseUrl}/?category=${encodeURIComponent(cat.name)}`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    })),
  ];

  try {
    const res = await fetch(`${API}/api/listings?limit=500&sort=newest`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const listingPages = (data.listings || []).map(l => ({
        url: `${baseUrl}/listings/${l.id}`,
        lastModified: new Date(l.updated_at || l.created_at),
        changeFrequency: 'daily',
        priority: 0.9,
      }));
      return [...staticPages, ...listingPages];
    }
  } catch {}

  return staticPages;
}
