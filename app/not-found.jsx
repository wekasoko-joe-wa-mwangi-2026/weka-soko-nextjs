import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAFA',
      padding: '24px',
      textAlign: 'center',
      fontFamily: 'var(--fn, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)'
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: '#F0F4FF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1428A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      
      <h1 style={{
        fontSize: 28,
        fontWeight: 800,
        color: '#1A1A1A',
        marginBottom: 12,
        letterSpacing: '-0.02em'
      }}>
        Page Not Found
      </h1>
      
      <p style={{
        fontSize: 16,
        color: '#666666',
        marginBottom: 32,
        maxWidth: 400,
        lineHeight: 1.6
      }}>
        The page you are looking for does not exist or has been moved.
      </p>
      
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" style={{
          padding: '12px 24px',
          background: '#1428A0',
          color: '#fff',
          borderRadius: 8,
          textDecoration: 'none',
          fontSize: 15,
          fontWeight: 600
        }}>
          Go Home
        </Link>
        <Link href="/listings" style={{
          padding: '12px 24px',
          background: '#fff',
          color: '#1428A0',
          border: '1.5px solid #1428A0',
          borderRadius: 8,
          textDecoration: 'none',
          fontSize: 15,
          fontWeight: 600
        }}>
          Browse Listings
        </Link>
      </div>
    </div>
  );
}
