import './globals.css';

const BASE = 'https://weka-soko-nextjs.vercel.app';

export const metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'Weka Soko — Buy & Sell in Kenya',
    template: '%s | Weka Soko',
  },
  description: "Kenya's trusted marketplace. Post free. Pay KSh 250 only when a serious buyer locks in. Safe anonymous chat, M-Pesa escrow.",
  keywords: 'buy sell Kenya, Nairobi marketplace, second hand Kenya, OLX Kenya alternative, declutter Kenya, sell phone Kenya, sell clothes Kenya',
  alternates: { canonical: BASE },
  openGraph: {
    title: 'Weka Soko — Buy & Sell in Kenya',
    description: "Post free. Pay KSh 250 only when a buyer locks in. Safe anonymous chat, M-Pesa escrow.",
    url: BASE,
    siteName: 'Weka Soko',
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weka Soko — Buy & Sell in Kenya',
    description: "Kenya's trusted marketplace. Post free, pay only when a buyer shows up.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

// Safe JSON-LD: these are static objects we define, not user content
const orgLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Weka Soko',
  url: BASE,
  description: "Kenya's trusted buy and sell marketplace with M-Pesa escrow and anonymous chat.",
  foundingLocation: { '@type': 'Place', name: 'Nairobi, Kenya' },
  areaServed: { '@type': 'Country', name: 'Kenya' },
});

const websiteLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Weka Soko',
  url: BASE,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#1428A0" />
        <meta name="geo.region" content="KE" />
        <meta name="geo.placename" content="Kenya" />

        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Weka Soko" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Weka Soko" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgLd }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: websiteLd }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
