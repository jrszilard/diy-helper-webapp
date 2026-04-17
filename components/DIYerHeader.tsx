'use client';

import AppHeader from './AppHeader';

/**
 * Legacy wrapper — renders AppHeader.
 * Kept for backward compatibility with pages that import DIYerHeader directly.
 */
export default function DIYerHeader() {
  return <AppHeader />;
}
