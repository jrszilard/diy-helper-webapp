import Link from 'next/link';
import { Wrench } from 'lucide-react';

interface AppLogoProps {
  showLabel?: boolean;
  variant?: 'light' | 'dark';
}

export default function AppLogo({ showLabel = true, variant = 'light' }: AppLogoProps) {
  return (
    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
      <div className="bg-gradient-to-br from-terracotta to-terracotta-dark p-1.5 rounded-lg">
        <Wrench className="w-5 h-5 text-white" />
      </div>
      {showLabel && (
        <span className={`text-lg font-bold hidden xs:inline ${variant === 'dark' ? 'text-white' : 'text-foreground'}`}>
          DIY Helper
        </span>
      )}
    </Link>
  );
}
