/**
 * Persistent AI safety / liability disclaimer, shown wherever Fixerator gives advice.
 *
 * DIY guidance can be safety-critical (electrical, gas, structural), and the AI can be
 * wrong, so we make the "not a substitute for a licensed professional, use at your own
 * risk" boundary explicit and always visible rather than buried in a terms page.
 *
 * Default styling suits the dark chat surface; pass `className` to adjust placement or
 * restyle for a light background.
 */
export default function AiDisclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-snug text-white/40 ${className}`}>
      Fixerator is AI and can make mistakes — it&apos;s not a substitute for a licensed
      professional. For electrical, gas, structural, or other safety-critical work,
      consult a qualified pro and follow your local codes and permits. Use at your own risk.
    </p>
  );
}
