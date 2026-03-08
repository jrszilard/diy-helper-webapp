'use client';

interface UsageCategory {
  used: number;
  limit: number;
}

interface UsageBannerProps {
  usage: {
    reports: UsageCategory;
    chatMessages: UsageCategory;
  };
  tier: string;
}

export default function UsageBanner({ usage, tier }: UsageBannerProps) {
  const reportsPercent = usage.reports.limit > 0 ? (usage.reports.used / usage.reports.limit) * 100 : 0;
  const messagesPercent = usage.chatMessages.limit > 0 ? (usage.chatMessages.used / usage.chatMessages.limit) * 100 : 0;

  const isReportsWarning = reportsPercent > 80;
  const isMessagesWarning = messagesPercent > 80;

  return (
    <div className="bg-[#FDFBF7] border border-[#D4C8B8] rounded-lg px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#3E2723]">Usage</span>
        {tier === 'pro' && (
          <span className="text-xs font-bold text-white bg-[#5D7B93] px-2 py-0.5 rounded-full">
            Pro
          </span>
        )}
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#7D6B5D]">Reports</span>
            <span className={`text-xs font-medium ${isReportsWarning ? 'text-[#C67B5C]' : 'text-[#7D6B5D]'}`}>
              {usage.reports.used} of {usage.reports.limit} used
            </span>
          </div>
          <div className="w-full bg-[#E8DFD0] rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${isReportsWarning ? 'bg-[#C67B5C]' : 'bg-[#4A7C59]'}`}
              style={{ width: `${Math.min(reportsPercent, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#7D6B5D]">Chat Messages</span>
            <span className={`text-xs font-medium ${isMessagesWarning ? 'text-[#C67B5C]' : 'text-[#7D6B5D]'}`}>
              {usage.chatMessages.used} of {usage.chatMessages.limit} used
            </span>
          </div>
          <div className="w-full bg-[#E8DFD0] rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${isMessagesWarning ? 'bg-[#C67B5C]' : 'bg-[#4A7C59]'}`}
              style={{ width: `${Math.min(messagesPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
