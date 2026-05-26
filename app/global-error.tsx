'use client';

import { useEffect } from 'react';

// Last-resort boundary for errors thrown in the root layout itself. It replaces
// the whole document, so it must render its own <html>/<body> and cannot rely on
// globals.css — styles are inlined.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO(B2): forward to error monitoring (Sentry) once configured in prod.
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1A1612',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>
            Fixerator hit an unexpected error. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: '#C67B5C',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '10px 20px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 24 }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
