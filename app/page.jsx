import { API, PER_PAGE } from '@/lib/utils';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

async function getInitialData(searchParams) {
  const { category = '', search = '', county = '', sort = 'newest', page = '1' } = await searchParams || {};
  const params = new URLSearchParams({ page, limit: PER_PAGE, sort });
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  if (county) params.set('county', county);

  const [listingsRes, statsRes, countiesRes] = await Promise.allSettled([
    fetch(`${API}/api/listings?${params}`, { next: { revalidate: 30 } }),
    fetch(`${API}/api/stats`, { next: { revalidate: 60 } }),
    fetch(`${API}/api/listings/counties`, { next: { revalidate: 3600 } }),
  ]);

  const listings = listingsRes.status === 'fulfilled' && listingsRes.value.ok
    ? await listingsRes.value.json() : { listings: [], total: 0 };
  const stats = statsRes.status === 'fulfilled' && statsRes.value.ok
    ? await statsRes.value.json() : { users: 0, activeAds: 0, sold: 0 };
  const counties = countiesRes.status === 'fulfilled' && countiesRes.value.ok
    ? await countiesRes.value.json() : [];

  return { listings, stats, counties };
}

export async function generateMetadata({ searchParams }) {
  const BASE = 'https://weka-soko-nextjs.vercel.app';
  const { category, search } = await searchParams || {};
  let title = 'Weka Soko — Buy & Sell in Kenya';
  let description = "Kenya's trusted marketplace. Post free. Pay KSh 260 only when a serious buyer locks in. Safe anonymous chat and M-Pesa escrow.";
  let canonical = BASE;
  if (category) {
    title = `${category} for Sale in Kenya — Weka Soko`;
    description = `Browse ${category} listings in Kenya. Buy and sell safely on Weka Soko — anonymous chat, M-Pesa escrow, no hidden fees.`;
    canonical = `${BASE}/?cat=${encodeURIComponent(category)}`;
  } else if (search) {
    title = `"${search}" for Sale in Kenya — Weka Soko`;
    description = `Find "${search}" listings in Kenya on Weka Soko. Post free, pay KSh 260 only when a serious buyer shows up.`;
  }
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: 'Weka Soko', locale: 'en_KE' },
  };
}

export default async function HomePage({ searchParams }) {
  const sp = await searchParams;
  const { listings, stats, counties } = await getInitialData(sp);
  return (
    <HomeClient
      initialListings={listings.listings || []}
      initialTotal={listings.total || 0}
      initialStats={stats}
      initialCounties={counties}
      initialFilter={{
        cat: sp?.category || '',
        q: sp?.search || '',
        county: sp?.county || '',
        minPrice: sp?.minPrice || '',
        maxPrice: sp?.maxPrice || '',
        sort: sp?.sort || 'newest',
      }}
      initialPage={parseInt(sp?.page || '1')}
    />
  );
}
