import './globals.css';

export const metadata = {
  title: 'Weka Soko — Buy & Sell in Kenya',
  description: "Kenya's trusted marketplace. Post free. Pay KSh 250 only when a serious buyer locks in. Safe anonymous chat, M-Pesa escrow.",
  keywords: 'buy sell Kenya, Nairobi marketplace, second hand Kenya, OLX Kenya alternative',
  openGraph: {
    title: 'Weka Soko — Buy & Sell in Kenya',
    description: "Post free. Pay KSh 250 only when a buyer locks in. Safe anonymous chat, M-Pesa escrow.",
    url: 'https://weka-soko-frontend-rho.vercel.app',
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
      </head>
      <body>{children}</body>
    </html>
  );
}
