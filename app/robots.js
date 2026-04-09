export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api/'],
      },
    ],
    sitemap: 'https://weka-soko-nextjs.vercel.app/sitemap.xml',
    host: 'https://weka-soko-nextjs.vercel.app',
  };
}
