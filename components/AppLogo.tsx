import Link from 'next/link';
import { FixMark } from './FixBot';

interface AppLogoProps {
  href?: string;
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { mark: 26, wordPx: 16 },
  md: { mark: 36, wordPx: 20 },
  lg: { mark: 52, wordPx: 28 },
} as const;

export default function AppLogo({ href = '/', size = 'md' }: AppLogoProps) {
  const { mark, wordPx } = SIZES[size];

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 hover:opacity-80 transition"
      aria-label="Fixerator — home"
    >
      <FixMark size={mark} />
      <span
        className="font-serif font-medium leading-none text-white"
        style={{ fontSize: wordPx, letterSpacing: '-0.01em' }}
      >
        Fixerator
      </span>
    </Link>
  );
}
