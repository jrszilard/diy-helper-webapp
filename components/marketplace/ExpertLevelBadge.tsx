'use client';

import { Award } from 'lucide-react';

export type ExpertLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

const LEVEL_STYLES: Record<ExpertLevel, { bg: string; text: string; icon: string }> = {
  bronze: { bg: 'bg-amber-100', text: 'text-amber-800', icon: 'text-amber-600' },
  silver: { bg: 'bg-gray-200', text: 'text-gray-700', icon: 'text-gray-500' },
  gold: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'text-yellow-600' },
  platinum: { bg: 'bg-purple-100', text: 'text-purple-800', icon: 'text-purple-600' },
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
