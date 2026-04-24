import { API, PER_PAGE } from '@/lib/utils';
import HomeClient from './HomeClient';

// Use auto to allow static generation when possible, dynamic when needed
export const dynamic = 'auto';
export const revalidate = 30; // Revalidate page every 30 seconds

async function getInitialData(searchParams) {
  const { cat = '', search = '', county = '', sort = 'newest', page = '1', min_price = '', max_price = '' } = await searchParams || {};
  const params = new URLSearchParams({ page, limit: PER_PAGE, sort });
  if (cat) params.set('category', cat);
  if (search) params.set('search', search);
  if (county) params.set('county', county);
  if (min_price) params.set('min_price', min_price);
  if (max_price) params.set('max_price', max_price);

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
  const { cat, search } = await searchParams || {};
  let title = 'Weka Soko — Buy & Sell in Kenya';
  let description = "Kenya's trusted marketplace. Post free. Pay KSh 250 only when a serious buyer locks in. Safe anonymous chat and M-Pesa escrow.";
  let canonical = BASE;
  if (cat) {
    title = `${cat} for Sale in Kenya — Weka Soko`;
    description = `Browse ${cat} listings in Kenya. Buy and sell safely on Weka Soko — anonymous chat, M-Pesa escrow, no hidden fees.`;
    canonical = `${BASE}/?cat=${encodeURIComponent(cat)}`;
  } else if (search) {
    title = `"${search}" for Sale in Kenya — Weka Soko`;
    description = `Find "${search}" listings in Kenya on Weka Soko. Post free, pay KSh 250 only when a serious buyer shows up.`;
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
      cat: sp?.cat || '',
      q: sp?.search || '',
      county: sp?.county || '',
      minPrice: sp?.min_price || '',
      maxPrice: sp?.max_price || '',
      sort: sp?.sort || 'newest',
    }}
      initialPage={parseInt(sp?.page || '1')}
    />
  );
}
