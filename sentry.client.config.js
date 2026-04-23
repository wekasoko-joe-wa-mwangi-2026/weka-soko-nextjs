import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,       // capture 20% of transactions
  replaysOnErrorSampleRate: 1.0, // full replay on every error
  replaysSessionSampleRate: 0.05,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // Don't report errors from browser extensions or bots
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
  ],
  beforeSend(event) {
    // Drop events with no useful info
    if (!event.exception && !event.message) return null;
    return event;
  },
});
