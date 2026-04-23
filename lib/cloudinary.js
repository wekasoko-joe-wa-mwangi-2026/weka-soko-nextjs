/**
 * Cloudinary image optimization helpers
 *
 * Transforms raw Cloudinary upload URLs into optimized delivery URLs
 * with automatic format (WebP/AVIF), quality compression, and resizing.
 *
 * Raw:      https://res.cloudinary.com/ddfikbhzq/image/upload/v.../photo.jpg
 * Optimized: https://res.cloudinary.com/ddfikbhzq/image/upload/f_auto,q_auto,w_800/v.../photo.jpg
 */

const CLOUD_NAME = 'ddfikbhzq';
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

/**
 * @param {string} url   — raw Cloudinary URL
 * @param {object} opts  — { width, height, quality, crop }
 * @returns {string}     — optimized URL
 */
export function cloudinaryUrl(url, opts = {}) {
  if (!url || !url.includes('res.cloudinary.com')) return url;

  const {
    width,
    height,
    quality = 'auto',
    crop = 'fill',
    format = 'auto',
  } = opts;

  // Build transformation string
  const transforms = [`f_${format}`, `q_${quality}`];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  const t = transforms.join(',');

  // Insert transforms after /upload/
  return url.replace('/image/upload/', `/image/upload/${t}/`);
}

// Presets for common use cases
export const imgThumb   = url => cloudinaryUrl(url, { width: 400, height: 300, quality: 'auto:low' });
export const imgCard    = url => cloudinaryUrl(url, { width: 800, height: 600 });
export const imgFull    = url => cloudinaryUrl(url, { width: 1200, quality: 'auto:good' });
export const imgAvatar  = url => cloudinaryUrl(url, { width: 120, height: 120, crop: 'thumb', quality: 'auto:low' });
