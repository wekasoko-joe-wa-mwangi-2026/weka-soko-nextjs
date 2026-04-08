import './globals.css';

export const metadata = {
  title: 'Weka Soko — Buy & Sell in Kenya',
  description: "Kenya's trusted marketplace. Post free. Pay KSh 250 only when a serious buyer locks in. Safe anonymous chat, M-Pesa escrow.",
  keywords: 'buy sell Kenya, Nairobi marketplace, second hand Kenya, OLX Kenya alternative',
  openGraph: {
    title: 'Weka Soko — Buy & Sell in Kenya',
    description: "Post free. Pay KSh 250 only when a buyer locks in. Safe anonymous chat, M-Pesa escrow.",
    url: 'https://weka-soko-nextjs.vercel.app',
    siteName: 'Weka Soko',
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weka Soko — Buy & Sell in Kenya',
    description: "Kenya's trusted marketplace.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#1428A0" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS PWA support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Weka Soko" />
        <link rel="apple-touch-icon" href="/icon.svg" />

        {/* Android / general */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Weka Soko" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
