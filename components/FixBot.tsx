/**
 * Fix — the FIX-3000 mascot. Geometric SVG bot, glowing red eye, optional
 * floating animation and nailgun rig. Sized via `size` (height in px); width
 * scales from the viewBox so the bot stays in proportion across uses.
 */

type Theme = 'light' | 'dark';
type Expression = 'default' | 'winking' | 'computing' | 'terminator';

interface FixBotProps {
  /** Height in pixels. Width is derived from viewBox. */
  size?: number;
  /** Background context — picks chrome/visor colors. */
  theme?: Theme;
  /** Eye / face variant. */
  expression?: Expression;
  /** Adds the nailgun rig and animates it. */
  withNailgun?: boolean;
  /** Apply the gentle floating animation. */
  floating?: boolean;
  /** Wrap with the floor-shadow stage (only meaningful when `floating`). */
  withShadow?: boolean;
  className?: string;
  /** Accessible label. Omit (or empty) to mark as decorative. */
  ariaLabel?: string;
}

export default function FixBot({
  size = 64,
  theme = 'light',
  expression = 'default',
  withNailgun = false,
  floating = false,
  withShadow = false,
  className = '',
  ariaLabel,
}: FixBotProps) {
  // Without nailgun: tight 56x66 bot. With nailgun: extend the canvas right
  // so the arm + gun + flying nail are not clipped.
  const viewBox = withNailgun ? '-2 -14 124 96' : '0 0 56 66';
  const aspect = withNailgun ? 124 / 96 : 56 / 66;
  const width = Math.round(size * aspect);

  const classes = [
    'fix-bot',
    theme === 'dark' ? 'on-dark' : 'on-light',
    withNailgun ? 'shooting' : '',
    floating ? 'fix-float' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const a11yProps = ariaLabel
    ? { role: 'img' as const, 'aria-label': ariaLabel }
    : { 'aria-hidden': true as const };

  const svg = (
    <svg
      className={classes}
      width={width}
      height={size}
      viewBox={viewBox}
      {...a11yProps}
    >
      {withNailgun ? (
        <NailgunBot expression={expression} />
      ) : (
        <PlainBot expression={expression} />
      )}
    </svg>
  );

  if (floating && withShadow) {
    return <span className="fix-float-stage">{svg}</span>;
  }
  return svg;
}

/* ──────────────── 56×66 plain bot — used in logos, cards, empty states ─────────────── */

function PlainBot({ expression }: { expression: Expression }) {
  return (
    <>
      {/* Antenna — tilts for the "computing" pose */}
      {expression === 'computing' ? (
        <>
          <line className="ant-line" x1="28" y1="1" x2="22" y2="9" />
          <circle className="ant-tip" cx="22" cy="2.5" r="3" />
        </>
      ) : (
        <>
          <line className="ant-line" x1="28" y1="1" x2="28" y2="10" />
          <circle className="ant-tip" cx="28" cy="2.5" r="3" />
        </>
      )}

      {/* Head */}
      <rect className="head" x="4" y="10" width="48" height="36" rx="6" />
      <rect className="visor" x="10" y="18" width="36" height="16" rx="3" />

      <Eyes expression={expression} />
      <Mouth expression={expression} />

      {/* Body */}
      <rect className="head" x="12" y="48" width="32" height="14" rx="4" />
      <circle className="bolt" cx="18" cy="55" r="1.5" />
      <circle className="bolt" cx="38" cy="55" r="1.5" />
    </>
  );
}

function Eyes({ expression }: { expression: Expression }) {
  switch (expression) {
    case 'winking':
      return (
        <>
          <rect className="eye" x="18" y="25" width="8" height="2.4" rx="1.2" />
          <circle className="bolt" cx="40" cy="26" r="1.7" />
        </>
      );
    case 'computing':
      return (
        <>
          <circle className="eye" cx="22" cy="26" r="3" />
          <rect className="eye" x="36" y="25" width="8" height="2.4" rx="1.2" />
        </>
      );
    case 'terminator':
      return (
        <>
          <circle className="eye-glow" cx="22" cy="26" r="9" style={{ opacity: 0.85 }} />
          <circle className="eye" cx="22" cy="26" r="3.6" />
          <circle className="eye-glow" cx="40" cy="26" r="6" style={{ opacity: 0.5 }} />
          <circle className="eye" cx="40" cy="26" r="2.2" />
        </>
      );
    default:
      return (
        <>
          <circle className="eye-glow" cx="22" cy="26" r="7" />
          <circle className="eye" cx="22" cy="26" r="3.2" />
          <circle className="bolt" cx="40" cy="26" r="1.7" />
        </>
      );
  }
}

function Mouth({ expression }: { expression: Expression }) {
  if (expression === 'terminator') {
    return <path className="mouth" d="M16 40 L40 40" />;
  }
  if (expression === 'computing') {
    return <path className="mouth" d="M18 41 Q24 38 28 41 Q32 44 38 41" />;
  }
  if (expression === 'winking') {
    return <path className="mouth" d="M16 40 Q28 44 40 38" />;
  }
  return <path className="mouth" d="M16 40 Q28 44 40 40" />;
}

/* ──────────────── 124×96 hero bot with nailgun rig ─────────────── */

function NailgunBot({ expression }: { expression: Expression }) {
  return (
    <>
      <line className="ant-line" x1="40" y1="1" x2="40" y2="10" />
      <circle className="ant-tip" cx="40" cy="2.5" r="3" />
      <rect className="head" x="16" y="10" width="48" height="36" rx="6" />
      <rect className="visor" x="22" y="18" width="36" height="16" rx="3" />

      {/* Eyes — shifted to head coords */}
      {expression === 'terminator' ? (
        <>
          <circle className="eye-glow" cx="34" cy="26" r="9" style={{ opacity: 0.85 }} />
          <circle className="eye" cx="34" cy="26" r="3.6" />
          <circle className="eye-glow" cx="52" cy="26" r="6" style={{ opacity: 0.5 }} />
          <circle className="eye" cx="52" cy="26" r="2.2" />
        </>
      ) : (
        <>
          <circle className="eye-glow" cx="34" cy="26" r="7" />
          <circle className="eye" cx="34" cy="26" r="3.2" />
          <circle className="bolt" cx="52" cy="26" r="1.7" />
        </>
      )}
      <path className="mouth" d="M28 40 Q40 44 52 40" />

      {/* Body */}
      <rect className="head" x="24" y="48" width="32" height="14" rx="4" />
      <circle className="bolt" cx="30" cy="55" r="1.5" />
      <circle className="bolt" cx="50" cy="55" r="1.5" />

      {/* Left arm — small wave */}
      <rect
        className="arm"
        x="6"
        y="36"
        width="14"
        height="6"
        rx="3"
        transform="rotate(-22 13 39)"
      />
      <circle className="hand" cx="6" cy="32" r="3.4" />

      {/* Right arm gripping the gun */}
      <rect className="arm" x="54" y="46" width="24" height="8" rx="4" />

      {/* Nailgun (recoils as a group) */}
      <g className="gun-recoil">
        <rect className="gun-dark" x="76" y="46" width="7" height="14" rx="1.5" />
        <path
          d="M 83 49 q 5 1.5 5 7 l -2 0 q 0 -4 -3 -5 z"
          fill="#1A1612"
          stroke="#1A1612"
          strokeWidth={1}
        />
        <rect className="gun-dark" x="73" y="50" width="4" height="4" rx="0.8" />
        <path
          d="M 73 53 q -3 2 -1 5 q 2 3 -1 5"
          stroke="#1A1612"
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />

        <rect className="gun-body" x="78" y="36" width="28" height="12" rx="2" />
        <line x1="82" y1="40" x2="82" y2="45" stroke="#1A1612" strokeWidth={1} strokeLinecap="round" opacity={0.7} />
        <line x1="84" y1="40" x2="84" y2="45" stroke="#1A1612" strokeWidth={1} strokeLinecap="round" opacity={0.7} />
        <line x1="86" y1="40" x2="86" y2="45" stroke="#1A1612" strokeWidth={1} strokeLinecap="round" opacity={0.7} />
        <circle cx="94" cy="42" r="1.6" fill="var(--bot-eye)" stroke="#1A1612" strokeWidth={0.6} />
        <circle cx="94" cy="42" r="0.6" fill="#FFD9D2" />

        <rect className="gun-dark" x="104" y="38" width="7" height="8" rx="1" />
        <rect x="110" y="40.5" width="2.5" height="3" rx="0.5" fill="#1A1612" />

        {/* Slanted nail magazine */}
        <g transform="translate(80 36) rotate(28)">
          <rect className="mag-housing" x="-4" y="-26" width="8" height="26" rx="1.2" />
          <rect x="-1.6" y="-25" width="3.2" height="24" rx="0.4" fill="#3A3027" />
          {[-25, -21, -17, -13, -9, -5].map((y) => (
            <rect key={y} className="nail-head" x="-1.4" y={y} width="2.8" height="1.8" rx="0.3" />
          ))}
          <rect className="gun-dark" x="-4.5" y="-28" width="9" height="3" rx="0.8" />
          <circle cx="0" cy="-26.5" r="0.8" fill="var(--bot-eye)" />
        </g>
      </g>

      {/* Hand over the grip */}
      <circle className="hand" cx="79.5" cy="50" r="4" />

      {/* "Pew" — muzzle flash + flying nail */}
      <g transform="translate(113 42)">
        <polygon className="muzzle" points="0,0 5,-3 3,-1 7,0 3,1 5,3" />
        <g className="nail-fly">
          <rect className="nail-shaft" x="2" y="-0.8" width="6" height="1.6" rx="0.3" />
          <rect className="nail-head" x="1" y="-1.5" width="2" height="3" rx="0.3" />
          <line x1="-2" y1="-2" x2="-6" y2="-2" stroke="#FFFFFF" strokeWidth={0.6} opacity={0.55} strokeLinecap="round" />
          <line x1="-2" y1="0"  x2="-7" y2="0"  stroke="#FFFFFF" strokeWidth={0.6} opacity={0.7}  strokeLinecap="round" />
          <line x1="-2" y1="2"  x2="-6" y2="2"  stroke="#FFFFFF" strokeWidth={0.6} opacity={0.55} strokeLinecap="round" />
        </g>
      </g>
    </>
  );
}
