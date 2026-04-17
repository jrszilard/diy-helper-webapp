import Link from 'next/link';
import Image from 'next/image';

interface AppLogoProps {
  href?: string;
}

export default function AppLogo({ href = '/' }: AppLogoProps) {
  return (
    <Link href={href} className="flex items-center hover:opacity-80 transition">
      <Image
        src="/crafted-logo.png"
        alt="Logo"
        width={140}
        height={32}
        className="h-8 w-auto object-contain"
      />
    </Link>
  );
}
