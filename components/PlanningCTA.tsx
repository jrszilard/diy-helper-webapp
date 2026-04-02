'use client';

import { Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';

interface PlanningCTAProps {
  onStartPlanning: () => void;
  isPlanning: boolean;
}

export default function PlanningCTA({ onStartPlanning, isPlanning }: PlanningCTAProps) {
  if (isPlanning) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      leftIcon={Sparkles}
      iconSize={16}
      onClick={onStartPlanning}
      className="bg-white/8 text-white/70 hover:text-white hover:bg-white/15 border border-white/10"
    >
      Plan This Project
    </Button>
  );
}
