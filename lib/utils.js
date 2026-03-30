// ── API ───────────────────────────────────────────────────────────────────────
export const API = (process.env.NEXT_PUBLIC_API_URL || 'https://wekasokobackend.up.railway.app').replace(/\/$/, '');

export const PER_PAGE = 24;

// ── API HELPER ────────────────────────────────────────────────────────────────
export async function apiCall(path, opts = {}, token = null) {
  const isForm = opts.body instanceof FormData;
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isForm ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

// ── FORMATTERS ────────────────────────────────────────────────────────────────
export const fmtKES = n => 'KSh ' + Number(n || 0).toLocaleString('en-KE');

export const ago = ts => {
  if (!ts) return '';
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return 'just now';
  if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
  if (d < 604800000) return Math.floor(d / 86400000) + 'd ago';
  return new Date(ts).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};

// ── CATEGORIES ────────────────────────────────────────────────────────────────
export const CATS = [
  { name: 'Electronics', icon: '📱', sub: ['Phones & Tablets', 'Laptops', 'TVs & Audio', 'Cameras', 'Gaming', 'Accessories'] },
  { name: 'Vehicles', icon: '🚗', sub: ['Cars', 'Motorcycles', 'Trucks', 'Buses', 'Boats', 'Vehicle Parts'] },
  { name: 'Property', icon: '🏠', sub: ['Houses for Sale', 'Land', 'Commercial', 'Short Stays'] },
  { name: 'Fashion', icon: '👗', sub: ["Men's Clothing", "Women's Clothing", 'Shoes', 'Bags', 'Watches', 'Jewellery'] },
  { name: 'Furniture', icon: '🛋️', sub: ['Sofas', 'Beds & Mattresses', 'Tables', 'Wardrobes', 'Office'] },
  { name: 'Home & Garden', icon: '🏡', sub: ['Kitchen Appliances', 'Home Décor', 'Garden', 'Cleaning', 'Lighting'] },
  { name: 'Sports', icon: '⚽', sub: ['Fitness', 'Bicycles', 'Outdoor Gear', 'Team Sports', 'Water Sports'] },
  { name: 'Baby & Kids', icon: '🍼', sub: ['Baby Gear', 'Toys', 'Kids Clothing', 'Kids Furniture', 'School'] },
  { name: 'Books', icon: '📚', sub: ['Textbooks', 'Fiction', 'Non-Fiction', 'Courses', 'Instruments'] },
  { name: 'Agriculture', icon: '🌾', sub: ['Livestock', 'Farm Equipment', 'Seeds', 'Produce', 'Irrigation'] },
  { name: 'Services', icon: '🔧', sub: ['Home Services', 'Business', 'Tech', 'Transport', 'Events'] },
  { name: 'Jobs', icon: '💼', sub: ['Full-time', 'Part-time', 'Freelance', 'Internship'] },
  { name: 'Food', icon: '🍽️', sub: ['Catering Equipment', 'Food Products', 'Restaurant Supplies'] },
  { name: 'Health & Beauty', icon: '💊', sub: ['Health', 'Beauty & Skincare', 'Gym', 'Medical'] },
  { name: 'Pets', icon: '🐾', sub: ['Dogs', 'Cats', 'Birds', 'Fish', 'Pet Supplies'] },
  { name: 'Other', icon: '📦', sub: ['Miscellaneous'] },
];

// ── KENYA COUNTIES ────────────────────────────────────────────────────────────
export const KENYA_COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kiambu',
  'Machakos', 'Kajiado', "Murang'a", 'Nyeri', 'Meru', 'Embu', 'Kirinyaga',
  'Nyandarua', 'Laikipia', 'Baringo', 'Nandi', 'Uasin Gishu', 'Trans Nzoia',
  'Elgeyo Marakwet', 'West Pokot', 'Turkana', 'Samburu', 'Isiolo', 'Marsabit',
  'Mandera', 'Wajir', 'Garissa', 'Tana River', 'Lamu', 'Taita Taveta',
  'Kilifi', 'Kwale', 'Vihiga', 'Bungoma', 'Busia', 'Kakamega', 'Siaya',
  'Homabay', 'Migori', 'Kisii', 'Nyamira',
];

// ── CATEGORY PHOTOS ───────────────────────────────────────────────────────────
export const CAT_PHOTOS = {
  Electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=140&h=140&fit=crop',
  Vehicles: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=140&h=140&fit=crop',
  Property: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=140&h=140&fit=crop',
  Fashion: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=140&h=140&fit=crop',
  Furniture: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=140&h=140&fit=crop',
  'Home & Garden': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=140&h=140&fit=crop',
  Sports: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=140&h=140&fit=crop',
  'Baby & Kids': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=140&h=140&fit=crop',
  Books: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=140&h=140&fit=crop',
  Agriculture: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=140&h=140&fit=crop',
  Services: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=140&h=140&fit=crop',
  Jobs: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=140&h=140&fit=crop',
  Food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=140&h=140&fit=crop',
  'Health & Beauty': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=140&h=140&fit=crop',
  Pets: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=140&h=140&fit=crop',
  Other: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=140&h=140&fit=crop',
};
