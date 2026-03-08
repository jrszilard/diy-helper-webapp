'use client';

export default function BetaBanner() {
  const isBeta = process.env.NEXT_PUBLIC_BETA_MODE === 'true';
  if (!isBeta) return null;

  return (
    <div className="bg-[var(--terracotta)] text-white text-center py-1.5 px-4 text-sm font-medium z-50 relative">
      <span className="font-bold">Beta</span> &mdash; All features are free during testing. No real charges apply.{' '}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-beta-feedback'))}
        className="underline font-bold hover:text-[var(--earth-tan)] transition-colors"
      >
        Share feedback
      </button>
    </div>
  );
}
