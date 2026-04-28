'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');
    const actualRef = reference || trxref;

    if (!actualRef) {
      setStatus('error');
      setMessage('Invalid payment reference');
      setTimeout(() => router.push('/'), 3000);
      return;
    }

    // Check payment status
    const verifyPayment = async () => {
      try {
        const res = await fetch(`/api/payments/status/${actualRef}`);
        const data = await res.json();

        if (data.status === 'confirmed') {
          setStatus('success');
          setMessage('Payment successful! Redirecting...');

          // If it's an unlock payment, redirect to the listing
          if (data.payment?.listing_id) {
            setTimeout(() => {
              router.push(`/listings/${data.payment.listing_id}`);
            }, 1500);
          } else {
            setTimeout(() => router.push('/'), 2000);
          }
        } else {
          setStatus('pending');
          setMessage('Payment is being processed. You can close this page.');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage('Could not verify payment. Please check your email for confirmation.');
        setTimeout(() => router.push('/'), 4000);
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  const getIcon = () => {
    switch (status) {
      case 'success':
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1428A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#C03030" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        );
      default:
        return (
          <div style={{
            width: 64,
            height: 64,
            border: '4px solid #E8E8E8',
            borderTop: '4px solid #1428A0',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}/>
        );
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAFA',
      padding: '24px',
      textAlign: 'center'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        {getIcon()}
      </div>

      <h1 style={{
        fontSize: 24,
        fontWeight: 700,
        color: status === 'error' ? '#C03030' : '#111111',
        marginBottom: 12
      }}>
        {status === 'success' ? 'Payment Successful!' :
         status === 'error' ? 'Payment Issue' :
         'Processing Payment...'}
      </h1>

      <p style={{
        fontSize: 16,
        color: '#666666',
        maxWidth: 400,
        lineHeight: 1.6
      }}>
        {message}
      </p>

      {status === 'success' && (
        <button
          onClick={() => router.push('/')}
          style={{
            marginTop: 32,
            padding: '12px 24px',
            background: '#1428A0',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Continue Shopping
        </button>
      )}

      {status === 'error' && (
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            marginTop: 32,
            padding: '12px 24px',
            background: '#1428A0',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Go to Dashboard
        </button>
      )}
    </div>
  );
}

// Loading fallback while suspense resolves
function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAFA',
      padding: '24px'
    }}>
      <div style={{
        width: 64,
        height: 64,
        border: '4px solid #E8E8E8',
        borderTop: '4px solid #1428A0',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}/>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ marginTop: 24, fontSize: 16, color: '#666666' }}>Loading...</p>
    </div>
  );
}

// Main export with Suspense boundary
export default function PaymentCallback() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
