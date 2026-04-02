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
  { emoji: '🔧', text: "I'm mid-project \u2014 my mortar isn't setting" },
  { emoji: '🔌', text: 'Is my electrical panel safe for a hot tub?' },
  { emoji: '🛁', text: 'Price out a bathroom remodel' },
  { emoji: '📋', text: 'What permits do I need for a deck?' },
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
      {/* Hero headline — hidden when chat is active */}
      {!chatActive && (
        <div className="text-center mb-[var(--space-l)]">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            Plan it. Price it. Ask a pro. Build it right.
          </h1>
          <p className="text-base text-white/50 max-w-lg mx-auto leading-relaxed">
            Quick answers when you&apos;re mid-build. Full project plans when you&apos;re starting fresh. Real material pricing. Real tradespeople.
          </p>
        </div>
      )}

      {/* Value bar — visible only in hero state */}
      {!chatActive && (
        <div className="flex justify-center gap-5 sm:gap-6 py-2.5 mb-[var(--space-m)] max-w-[520px] mx-auto border-t border-b border-white/[0.06] flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-white/55 font-medium">
            <span className="text-sm">🛒</span> Local store prices
          </span>
          <span className="flex items-center gap-1.5 text-xs text-white/55 font-medium">
            <span className="text-sm">📋</span> Smart shopping lists
          </span>
          <span className="flex items-center gap-1.5 text-xs text-white/55 font-medium">
            <span className="text-sm">🔧</span> Tool inventory
          </span>
          <span className="flex items-center gap-1.5 text-xs text-white/55 font-medium">
            <span className="text-sm">🏠</span> Building codes
          </span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex justify-center mb-[var(--space-m)]">
        <div className="inline-flex gap-1 bg-white/5 p-1 rounded-2xl">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-white/15 text-white'
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
