import { API } from '@/lib/utils';
import SoldPageClient from './SoldPageClient';

export const metadata = {
  title: 'Sold Items — Weka Soko Kenya',
  description: 'Real items sold through Weka Soko marketplace in Kenya.',
};

async function getSoldItems() {
  try {
    const res = await fetch(`${API}/api/listings/sold?limit=50`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.listings || data || [];
  } catch { return []; }
}

export default async function SoldPage() {
  const items = await getSoldItems();
  return <SoldPageClient initialItems={items} />;
}
