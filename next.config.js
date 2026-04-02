/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  webpack: (config, { isServer }) => {
    // Disable webpack filesystem cache so Vercel always recompiles fresh
    config.cache = false;
    return config;
  },
};

module.exports = nextConfig;
