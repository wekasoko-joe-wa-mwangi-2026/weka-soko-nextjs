import { API, fmtKES } from '@/lib/utils';
import ListingPageClient from './ListingPageClient';
import { notFound } from 'next/navigation';

const BASE = 'https://weka-soko-nextjs.vercel.app';

async function getListing(id) {
  try {
    const res = await fetch(`${API}/api/listings/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: 'Listing Not Found — Weka Soko' };

  const photos = Array.isArray(listing.photos)
    ? listing.photos.map(p => typeof p === 'string' ? p : p?.url).filter(Boolean)
    : [];
  const photo = photos[0] || null;
  const location = listing.county || listing.location || 'Kenya';
  const title = `${listing.title} — ${fmtKES(listing.price)} | Weka Soko`;
  const description = `${listing.title} for ${fmtKES(listing.price)} in ${location}. ${listing.description?.slice(0, 120) || "Buy safely on Weka Soko — Kenya's trusted marketplace with M-Pesa escrow."}`;
  const url = `${BASE}/listings/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Weka Soko',
      images: photo ? [{ url: photo, width: 800, height: 600, alt: listing.title }] : [],
      type: 'website',
      locale: 'en_KE',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: photo ? [photo] : [],
    },
  };
}

function JsonLd({ data }) {
  // Safe: data is JSON.stringify of an object we construct — not user HTML
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default async function ListingPage({ params }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const photos = Array.isArray(listing.photos)
    ? listing.photos.map(p => typeof p === 'string' ? p : p?.url).filter(Boolean)
    : [];
  const location = listing.county || listing.location || 'Kenya';
  const url = `${BASE}/listings/${id}`;

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description || `${listing.title} for sale in ${location} on Weka Soko.`,
    image: photos,
    url,
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: 'KES',
      availability: listing.status === 'active'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      url,
      seller: { '@type': 'Organization', name: 'Weka Soko', url: BASE },
    },
    ...(listing.category ? { category: listing.category } : {}),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: listing.category || 'Listings', item: `${BASE}/?cat=${encodeURIComponent(listing.category || '')}` },
      { '@type': 'ListItem', position: 3, name: listing.title, item: url },
    ],
  };

  return (
    <>
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />

      {/*
        SEO article layer — real HTML visible to Googlebot even without JS.
        ListingPageClient renders the interactive DetailModal on top (position:fixed).
      */}
      <article style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px', fontFamily: 'sans-serif', color: '#1A1A1A' }}>
        <nav style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          <a href={BASE} style={{ color: '#1428A0', textDecoration: 'none' }}>Weka Soko</a>
          {listing.category && <> &rsaquo; <a href={`${BASE}/?cat=${encodeURIComponent(listing.category)}`} style={{ color: '#1428A0', textDecoration: 'none' }}>{listing.category}</a></>}
          <> &rsaquo; <span>{listing.title}</span></>
        </nav>

        {photos.length > 0 && (
          <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', background: '#F5F5F5' }}>
            <img src={photos[0]} alt={listing.title} style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>{listing.title}</h1>
        <p style={{ fontSize: 28, fontWeight: 800, color: '#1428A0', marginBottom: 16 }}>{fmtKES(listing.price)}</p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#636363', marginBottom: 20 }}>
          {listing.category && <span style={{ background: '#F5F5F5', padding: '4px 10px', borderRadius: 6 }}>{listing.category}</span>}
          {location && <span>{location}</span>}
          {listing.status === 'active' && <span style={{ color: '#16a34a', fontWeight: 700 }}>Available</span>}
        </div>

        {listing.description && (
          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Description</h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>{listing.description}</p>
          </section>
        )}

        <p style={{ fontSize: 14, color: '#636363', marginTop: 24, padding: '16px', background: '#F0F4FF', borderRadius: 10 }}>
          Buy and sell safely on <a href={BASE} style={{ color: '#1428A0', fontWeight: 700 }}>Weka Soko</a> — Kenya's trusted marketplace with anonymous chat and M-Pesa escrow protection.
        </p>
      </article>

      <ListingPageClient initialListing={listing} listingId={id} />
    </>
  );
}
