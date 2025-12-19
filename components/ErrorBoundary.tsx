'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress Chrome extension accessibility tree errors
    const originalError = console.error;
    console.error = (...args) => {
      const message = args[0]?.toString?.() || '';
      if (
        message.includes('Accessibility tree') ||
        message.includes('accessibility tree function not found')
      ) {
        // Suppress this specific error from Chrome extensions
        return;
      }
      originalError.apply(console, args);
    };

    // Global error handler for uncaught errors
    const handleError = (event: ErrorEvent) => {
      if (
        event.message?.includes('Accessibility tree') ||
        event.message?.includes('accessibility tree function not found')
      ) {
        event.preventDefault();
        return;
      }
    };

    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || event.reason?.toString?.() || '';
      if (
        message.includes('Accessibility tree') ||
        message.includes('accessibility tree function not found')
      ) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return <>{children}</>;
}
