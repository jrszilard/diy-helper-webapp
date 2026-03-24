'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ElementType } from 'react';

interface NavLinkProps {
  href: string;
  label: string;
  icon?: ElementType;
  iconSize?: number;
  onClick?: () => void;
  exact?: boolean; // if true, only active when pathname === href exactly
}

export default function NavLink({ href, label, icon: Icon, iconSize = 16, onClick, exact = true }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[var(--terracotta)]/10 text-[var(--terracotta)]'
          : 'text-[var(--earth-brown)] hover:bg-[var(--earth-tan)] hover:text-[var(--foreground)]'
      }`}
    >
      {Icon && <Icon size={iconSize} />}
      {label}
    </Link>
  );
}
