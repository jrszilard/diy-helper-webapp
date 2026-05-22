'use client';

import { useState } from 'react';
import { MessageSquare, HardHat } from 'lucide-react';
import LandingQuickChat from './LandingQuickChat';
import LandingExpertForm from './LandingExpertForm';

type TabId = 'chat' | 'expert';

const TABS = [
  { id: 'chat' as TabId, icon: MessageSquare, label: 'Ask Anything' },
  { id: 'expert' as TabId, icon: HardHat, label: 'Talk to a Pro' },
];

const SUGGESTION_CHIPS = [
  { text: "I'm mid-project — my mortar isn't setting" },
  { text: 'Is my electrical panel safe for a hot tub?' },
  { text: 'Price out a bathroom remodel' },
  { text: 'What permits do I need for a deck?' },
];

interface LandingHeroProps {
  /** When true, hide the hero headline/chips and show only the chat */
  chatActive?: boolean;
  /** Called when the user sends their first message */
  onFirstMessage?: () => void;
  /** Conversation ID to resume */
  initialConversationId?: string;
  /** Called when materials are extracted (for header badge) */
  onMaterialsDetected?: (count: number) => void;
}

export default function LandingHero({
  chatActive = false,
  onFirstMessage,
  initialConversationId,
  onMaterialsDetected,
}: LandingHeroProps) {
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  return (
    <div>
      {/* Tab bar */}
      <div className="flex justify-center mb-[var(--space-m)]">
        <div className="inline-flex gap-1 bg-white/5 p-1 rounded-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-none text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>
        <div className={activeTab === 'chat' ? '' : 'hidden'} aria-hidden={activeTab !== 'chat'}>
          <LandingQuickChat
            initialConversationId={initialConversationId}
            onFirstMessage={onFirstMessage}
            onMaterialsDetected={onMaterialsDetected}
            suggestionChips={chatActive ? undefined : SUGGESTION_CHIPS}
          />
        </div>

        <div className={activeTab === 'expert' ? '' : 'hidden'} aria-hidden={activeTab !== 'expert'}>
          <LandingExpertForm />
        </div>
      </div>
    </div>
  );
}
