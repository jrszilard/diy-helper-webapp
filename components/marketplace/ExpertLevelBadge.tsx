'use client';

import { Award } from 'lucide-react';

export type ExpertLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

const LEVEL_STYLES: Record<ExpertLevel, { bg: string; text: string; icon: string }> = {
  bronze: { bg: 'bg-copper/20', text: 'text-copper', icon: 'text-copper' },
  silver: { bg: 'bg-white/10', text: 'text-white/70', icon: 'text-white/50' },
  gold: { bg: 'bg-gold/20', text: 'text-gold', icon: 'text-gold' },
  platinum: { bg: 'bg-[var(--status-waiting)]/20', text: 'text-[var(--status-waiting)]', icon: 'text-[var(--status-waiting)]' },
};

const LEVEL_LABELS: Record<ExpertLevel, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

interface ExpertLevelBadgeProps {
  level: ExpertLevel;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export default function ExpertLevelBadge({ level, size = 'sm', showLabel = true }: ExpertLevelBadgeProps) {
  const style = LEVEL_STYLES[level] || LEVEL_STYLES.bronze;
  const label = LEVEL_LABELS[level] || 'Bronze';
  const iconSize = size === 'sm' ? 10 : 14;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text} ${
      size === 'sm' ? 'text-[10px]' : 'text-xs'
    }`}>
      <Award size={iconSize} className={style.icon} />
      {showLabel && label}
    </span>
  );
}
