import Link from 'next/link';
import FixBot from './FixBot';

interface AppLogoProps {
  href?: string;
  /** Background surface this logo sits on. Defaults to dark (sidebar/header). */
  theme?: 'light' | 'dark';
  /** Visual size — controls bot height and wordmark font size. */
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { bot: 22, word: 'text-sm' },
  md: { bot: 28, word: 'text-base' },
  lg: { bot: 36, word: 'text-xl' },
} as const;

export default function AppLogo({ href = '/', theme = 'dark', size = 'md' }: AppLogoProps) {
  const { bot, word } = SIZES[size];
  const wordColor = theme === 'dark' ? 'text-white' : 'text-[var(--foreground)]';
  const tmColor = theme === 'dark' ? 'text-[var(--gold)]' : 'text-[var(--rust)]';

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 hover:opacity-80 transition"
      aria-label="Fixerator — home"
    >
      <FixBot size={bot} theme={theme} />
      <span className={`font-extrabold tracking-wide leading-none ${word} ${wordColor}`}>
        FIXERATOR
        <span className={`ml-0.5 align-super text-[0.5em] font-semibold font-mono ${tmColor}`}>
          ™
        </span>
      </span>
    </Link>
  );
}
