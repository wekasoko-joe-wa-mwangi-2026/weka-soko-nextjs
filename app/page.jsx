import { API, PER_PAGE } from '@/lib/utils';
import HomeClient from './HomeClient';

async function getInitialData(searchParams) {
  const { category = '', search = '', county = '', sort = 'newest', page = '1' } = searchParams || {};
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
  const { category, search } = searchParams || {};
  let title = 'Weka Soko — Buy & Sell in Kenya';
  let description = "Kenya's trusted marketplace. Post free. Pay KSh 250 only when a serious buyer locks in.";
  if (category) {
    title = `${category} for Sale in Kenya — Weka Soko`;
    description = `Browse ${category} listings in Kenya. Buy and sell safely on Weka Soko.`;
  } else if (search) {
    title = `"${search}" — Weka Soko Kenya`;
    description = `Find "${search}" listings in Kenya on Weka Soko marketplace.`;
  }
  return { title, description, openGraph: { title, description } };
}

export default async function HomePage({ searchParams }) {
  const { listings, stats, counties } = await getInitialData(searchParams);
  return (
    <HomeClient
      initialListings={listings.listings || []}
      initialTotal={listings.total || 0}
      initialStats={stats}
      initialCounties={counties}
      initialFilter={{
        cat: searchParams?.category || '',
        q: searchParams?.search || '',
        county: searchParams?.county || '',
        minPrice: searchParams?.minPrice || '',
        maxPrice: searchParams?.maxPrice || '',
        sort: searchParams?.sort || 'newest',
      }}
      initialPage={parseInt(searchParams?.page || '1')}
    />
  );
}
