'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

// Route-segment error boundary. Catches render/runtime errors in the page tree
// while keeping the root layout (sidebar/header) intact, and offers recovery.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to Sentry (no-op until a DSN is configured) and keep a local
    // console trace for dev, where Sentry stays dormant.
    Sentry.captureException(error);
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-earth-night flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-3">
          Something went wrong
        </p>
        <h1 className="font-serif italic font-normal text-white text-3xl mb-3">
          Well, that&apos;s not supposed to happen.
        </h1>
        <p className="text-white/50 text-sm mb-6">
          Fix hit a snag loading this page. Try again — if it keeps happening, let us know.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-rust text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-white/15 text-white/70 px-5 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Go home
          </Link>
        </div>
        {error.digest && (
          <p className="text-white/20 text-xs mt-6">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
