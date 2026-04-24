/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    // Auto-optimize images: WebP/AVIF conversion, responsive sizes
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 828, 1080, 1200],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 86400, // cache optimized images for 24h
  },
  webpack: (config, { isServer }) => {
    // Enable webpack filesystem cache for faster builds
    // Only disable in development if needed
    if (process.env.NODE_ENV === 'production') {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    return config;
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org: 'weka-soko',
  project: 'weka-soko-nextjs',
  silent: true, // suppress build output noise
  widenClientFileUpload: true,
  hideSourceMaps: true, // don't expose source maps in production bundle
  disableLogger: true,
  automaticVercelMonitors: true,
  sourcemaps: {
    disable: true, // Disable source maps in production for faster builds
  },
});
