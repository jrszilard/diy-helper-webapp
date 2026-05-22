'use client';

import { useState, useEffect } from 'react';

type Expression = 'default' | 'winking' | 'computing' | 'terminator';

interface FixBotProps {
  size?: number;
  theme?: 'light' | 'dark'; // kept for API compat — new bot looks same on both surfaces
  expression?: Expression;
  withNailgun?: boolean; // kept for API compat — new bot has no arms
  floating?: boolean;
  withShadow?: boolean;
  className?: string;
  ariaLabel?: string;
}

// Palette
const cream    = '#F1ECE5';
const creamHi  = '#FBF8F2';
const outline  = '#2A211A';
const visor    = '#2E2823';
const eyeOuter = '#E8C2B6';
const eyeMid   = '#C77A66';

export default function FixBot({
  size = 64,
  expression = 'default',
  floating = false,
  withShadow = false,
  className = '',
  ariaLabel,
}: FixBotProps) {
  const W = size;
  const vbW = 80, vbH = 110;
  const eye = expression === 'terminator' ? '#FF1A1A' : '#E83A2C';
  const wink = expression === 'winking';

  // Randomized begin offset so multiple bots don't blink in unison.
  // Must be deferred to after mount so SSR and client hydration produce the same value.
  const [glanceBegin, setGlanceBegin] = useState('0s');
  useEffect(() => { setGlanceBegin(`${-Math.random() * 7}s`); }, []);

  const a11yProps = ariaLabel
    ? { role: 'img' as const, 'aria-label': ariaLabel }
    : { 'aria-hidden': true as const };

  const svg = (
    <svg
      className={className || undefined}
      width={W}
      height={Math.round(W * vbH / vbW)}
      viewBox={`30 0 ${vbW} ${vbH}`}
      style={{
        display: 'block',
        overflow: 'visible',
        animation: floating ? 'fixfloat 3.6s ease-in-out infinite' : undefined,
        filter: expression === 'terminator' ? 'drop-shadow(0 0 8px rgba(255,68,56,.5))' : undefined,
      }}
      {...a11yProps}
    >
      {/* antenna stem */}
      <line x1="70" y1="12" x2="70" y2="26" stroke={outline} strokeWidth="2" strokeLinecap="round" />

      {/* head */}
      <rect x="40" y="26" width="60" height="46" rx="8" fill={cream} stroke={outline} strokeWidth="2" />

      {/* antenna base + ball */}
      <rect x="64" y="22" width="12" height="6" rx="1.5" fill={cream} stroke={outline} strokeWidth="1.6" />
      <circle cx="70" cy="10" r="3.8" fill={eye} stroke={outline} strokeWidth="1.4" />

      {/* visor */}
      <rect x="46" y="34" width="48" height="18" rx="3" fill={visor} stroke={outline} strokeWidth="1.2" />

      {/* eye — expression-aware */}
      {expression === 'computing' ? (
        <>
          <line x1="48" x2="92" stroke={eye} strokeWidth="1.6" opacity=".95">
            <animate attributeName="y1" values="36;50;36" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="y2" values="36;50;36" dur="1.6s" repeatCount="indefinite" />
          </line>
          <text x="70" y="46" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="5" fontWeight="600" fill={eye} opacity=".55">10110</text>
        </>
      ) : wink ? (
        <path d="M62 44 q8 -5 16 0" stroke={eyeOuter} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      ) : (
        <g>
          {/* open eye — blinks off during wink */}
          <g>
            <circle cx="70" cy="43" r="6.8" fill={eyeOuter} />
            <circle cx="70" cy="43" r="4.2" fill={eyeMid} />
            <circle cx="70" cy="43" r="2.2" fill={eye} />
            <circle cx="70.8" cy="42.2" r=".9" fill={creamHi} />
            <animate
              attributeName="opacity"
              values="1;1;0;0;1;1"
              keyTimes="0;.66;.67;.71;.72;1"
              dur="7s"
              begin={glanceBegin}
              repeatCount="indefinite"
            />
          </g>
          {/* closed-eye arc — visible only during wink */}
          <path d="M62 44 q8 -5 16 0" stroke={eyeOuter} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0">
            <animate
              attributeName="opacity"
              values="0;0;1;1;0;0"
              keyTimes="0;.66;.67;.71;.72;1"
              dur="7s"
              begin={glanceBegin}
              repeatCount="indefinite"
            />
          </path>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,0; 6,1; 6,1; 0,0; 0,0; -6,1; -6,1; 0,0; 0,0; 3,-2; 3,-2; -4,-1.5; -4,-1.5; 0,0"
            keyTimes="0; .12; .15; .28; .31; .42; .45; .58; .61; .72; .75; .83; .86; .94; 1"
            dur="7s"
            begin={glanceBegin}
            repeatCount="indefinite"
          />
        </g>
      )}

      {/* smile */}
      <path d="M 55 60 Q 70 67 85 60" stroke={outline} strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* chin plate */}
      <rect x="58" y="74" width="24" height="9" rx="2" fill={cream} stroke={outline} strokeWidth="1.6" />
      <circle cx="64" cy="78.5" r=".9" fill={outline} />
      <circle cx="76" cy="78.5" r=".9" fill={outline} />

      {/* body */}
      <rect x="54" y="83" width="32" height="18" rx="3" fill={cream} stroke={outline} strokeWidth="2" />
      <circle cx="64" cy="92" r="1" fill={outline} />
      <circle cx="76" cy="92" r="1" fill={outline} />
    </svg>
  );

  if (floating && withShadow) {
    return <span className="fix-float-stage">{svg}</span>;
  }
  return svg;
}

/* ── Head-only logo glyph — used in AppLogo and wherever brand mark is needed ── */
export function FixMark({ size = 32 }: { size?: number }) {
  const eye = '#E83A2C';
  return (
    <svg width={size} height={size} viewBox="30 12 80 80" aria-hidden style={{ display: 'block' }}>
      {/* antenna stem + ball */}
      <line x1="70" y1="12" x2="70" y2="26" stroke={outline} strokeWidth="2.4" strokeLinecap="round" />
      {/* head */}
      <rect x="40" y="26" width="60" height="46" rx="8" fill={cream} stroke={outline} strokeWidth="2.4" />
      {/* antenna base & ball */}
      <rect x="64" y="22" width="12" height="6" rx="1.5" fill={cream} stroke={outline} strokeWidth="2" />
      <circle cx="70" cy="10" r="4" fill={eye} stroke={outline} strokeWidth="1.5" />
      {/* visor */}
      <rect x="46" y="34" width="48" height="18" rx="3" fill={visor} stroke={outline} strokeWidth="1.4" />
      {/* target eye */}
      <circle cx="70" cy="43" r="6.8" fill={eyeOuter} />
      <circle cx="70" cy="43" r="4.2" fill={eyeMid} />
      <circle cx="70" cy="43" r="2.2" fill={eye} />
      <circle cx="70.8" cy="42.2" r=".9" fill={creamHi} />
      {/* smile */}
      <path d="M 55 60 Q 70 67 85 60" stroke={outline} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ── Visor spinner — Cylon-style sliding eye used as the loading indicator ── */
interface FixSpinnerProps {
  size?: number;   // width in px; height is size/2
  color?: string;  // hex color for the eye
  className?: string;
}

export function FixSpinner({ size = 28, color = '#E83A2C', className }: FixSpinnerProps) {
  const w = size;
  const h = Math.round(size * 0.5);
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg width={w} height={h} viewBox="0 0 40 20" aria-label="Loading">
        <rect x="0" y="0" width="40" height="20" fill="#2E2823" stroke="#2A211A" strokeWidth="1" />
        {/* glow trail */}
        <circle cy="10" r="5.5" fill={color} opacity=".22">
          <animate
            attributeName="cx"
            values="8;32;8"
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </circle>
        {/* sliding eye */}
        <circle cy="10" r="3" fill={color}>
          <animate
            attributeName="cx"
            values="8;32;8"
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </circle>
        {/* highlight pip */}
        <circle cy="9" r="1.1" fill="#F8F1E0" opacity=".85">
          <animate
            attributeName="cx"
            values="9;33;9"
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </span>
  );
}
