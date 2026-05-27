'use client';

import { Menu } from 'lucide-react';

/**
 * Mobile hamburger that opens the AppSidebar drawer. Lives INSIDE the header bar
 * (beside the logo) so it rides with the sticky header through scroll — a
 * viewport-`fixed` button can't track the header as the BetaBanner scrolls away.
 * Decoupled from AppSidebar's drawer state via a window event (the codebase's
 * existing cross-component pattern), so any header can render it.
 */
export default function MobileNavToggle() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('diy:toggleMobileNav'))}
      className="md:hidden -ml-1 p-2 rounded-none text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  );
}
