'use client';

import { useState } from 'react';
import { Zap, ClipboardList, HardHat } from 'lucide-react';
import Button from '@/components/ui/Button';
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
  const [activeTab, setActiveTab] = useState<TabId>('quick');
  const [planMounted, setPlanMounted] = useState(false);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'plan' && !planMounted) {
      setPlanMounted(true);
    }
  };

  return (
    <div>
      {/* Headline */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
          Your DIY project starts here
        </h1>
        <p className="text-lg text-warm-brown">
          From quick answers to complete projects, backed by real experts
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b-2 border-earth-sand mb-6">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'primary' : 'ghost'}
            size="md"
            leftIcon={tab.icon}
            onClick={() => handleTabChange(tab.id)}
            className={
              activeTab !== tab.id
                ? 'text-earth-brown hover:text-foreground'
                : undefined
            }
          >
            {tab.label}
          </Button>
        ))}
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
