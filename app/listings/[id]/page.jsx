import { API, fmtKES } from '@/lib/utils';
import ListingPageClient from './ListingPageClient';
import { notFound } from 'next/navigation';

async function getListing(id) {
  try {
    const res = await fetch(`${API}/api/listings/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata({ params }) {
  const listing = await getListing(params.id);
  if (!listing) return { title: 'Listing Not Found — Weka Soko' };

  const photo = Array.isArray(listing.photos)
    ? (listing.photos[0]?.url || listing.photos[0] || null)
    : null;

  const title = `${listing.title} — ${fmtKES(listing.price)} | Weka Soko`;
  const description = `${listing.title} for ${fmtKES(listing.price)} in ${listing.county || listing.location || 'Kenya'}. ${listing.description?.slice(0, 120) || ''}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://weka-soko-frontend-rho.vercel.app/listings/${params.id}`,
      images: photo ? [{ url: photo, width: 800, height: 600, alt: listing.title }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: photo ? [photo] : [],
    },
  };
}

export default async function ListingPage({ params }) {
  const listing = await getListing(params.id);
  if (!listing) notFound();
  return <ListingPageClient initialListing={listing} listingId={params.id} />;
}
