'use client';

import { useState } from 'react';
import { Zap, ClipboardList, HardHat } from 'lucide-react';
import LandingQuickChat from './LandingQuickChat';
import LandingExpertForm from './LandingExpertForm';
import GuidedBot from './guided-bot/GuidedBot';

type TabId = 'quick' | 'plan' | 'expert';

const TABS = [
  { id: 'quick' as TabId, icon: Zap, label: 'Quick Answer' },
  { id: 'plan' as TabId, icon: ClipboardList, label: 'Plan a Project' },
  { id: 'expert' as TabId, icon: HardHat, label: 'Ask an Expert' },
];

export default function LandingHero() {
  const [activeTab, setActiveTab] = useState<TabId>('plan');
  const [planMounted, setPlanMounted] = useState(true);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'plan' && !planMounted) {
      setPlanMounted(true);
    }
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-[var(--space-m)]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div>
        <div className={activeTab === 'quick' ? '' : 'hidden'} aria-hidden={activeTab !== 'quick'}>
          <LandingQuickChat />
        </div>

        {planMounted && (
          <div className={activeTab === 'plan' ? '' : 'hidden'} aria-hidden={activeTab !== 'plan'}>
            <GuidedBot />
          </div>
        )}

        <div className={activeTab === 'expert' ? '' : 'hidden'} aria-hidden={activeTab !== 'expert'}>
          <LandingExpertForm />
        </div>
      </div>
    </div>
  );
}
