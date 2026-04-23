import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
  // Don't bloat server logs with low-value noise
  ignoreErrors: ['ECONNREFUSED', 'AbortError'],
});
