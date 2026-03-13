'use client';

import { useState } from 'react';
import { Zap, ClipboardList, HardHat } from 'lucide-react';
import LandingQuickChat from './LandingQuickChat';
import LandingExpertForm from './LandingExpertForm';
import GuidedBot from './guided-bot/GuidedBot';

type PathType = 'quick' | 'plan' | 'expert';

const PATHS = [
  {
    id: 'quick' as PathType,
    icon: Zap,
    title: 'Quick Answer',
    description: 'Get instant help with local codes & safety',
  },
  {
    id: 'plan' as PathType,
    icon: ClipboardList,
    title: 'Plan a Project',
    description: 'Full plan with costs, codes, and materials',
  },
  {
    id: 'expert' as PathType,
    icon: HardHat,
    title: 'Ask an Expert',
    description: "Get a pro's verified opinion on your project",
  },
];

export default function LandingHero() {
  const [activePath, setActivePath] = useState<PathType>('quick');
  const [planMounted, setPlanMounted] = useState(false);

  const handlePathChange = (path: PathType) => {
    setActivePath(path);
    if (path === 'plan' && !planMounted) {
      setPlanMounted(true);
    }
  };

  return (
    <div>
      {/* Headline */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#3E2723] mb-2">
          Your DIY project starts here
        </h1>
        <p className="text-lg text-[#5C4D42]">
          From quick answers to complete projects, backed by real experts
        </p>
      </div>

      {/* Path tabs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {PATHS.map(path => (
          <button
            key={path.id}
            onClick={() => handlePathChange(path.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              activePath === path.id
                ? 'border-[#C67B5C] bg-[#FFF8F2] shadow-sm'
                : 'border-[#D4C8B8] bg-white hover:bg-[#FDFBF7]'
            }`}
          >
            <path.icon
              size={24}
              className={activePath === path.id ? 'text-[#C67B5C]' : 'text-[#7D6B5D]'}
            />
            <span className={`text-sm font-semibold ${
              activePath === path.id ? 'text-[#3E2723]' : 'text-[#7D6B5D]'
            }`}>
              {path.title}
            </span>
            <span className="text-xs text-[#A89880] text-center hidden sm:block">
              {path.description}
            </span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <div>
        {/* Quick Answer — always mounted */}
        <div className={activePath === 'quick' ? '' : 'hidden'} aria-hidden={activePath !== 'quick'}>
          <LandingQuickChat />
        </div>

        {/* Plan a Project — lazy mounted */}
        {planMounted && (
          <div className={activePath === 'plan' ? '' : 'hidden'} aria-hidden={activePath !== 'plan'}>
            <GuidedBot />
          </div>
        )}

        {/* Ask an Expert — always mounted */}
        <div className={activePath === 'expert' ? '' : 'hidden'} aria-hidden={activePath !== 'expert'}>
          <LandingExpertForm />
        </div>
      </div>
    </div>
  );
}
