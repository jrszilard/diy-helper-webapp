'use client';

import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

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
    <Card surface padding="none" className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Usage</span>
        {tier === 'pro' && (
          <Badge variant="solid">Pro</Badge>
        )}
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-earth-brown">Reports</span>
            <span className={`text-xs font-medium ${isReportsWarning ? 'text-terracotta' : 'text-earth-brown'}`}>
              {usage.reports.used} of {usage.reports.limit} used
            </span>
          </div>
          <div className="w-full bg-earth-tan rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${isReportsWarning ? 'bg-terracotta' : 'bg-forest-green'}`}
              style={{ width: `${Math.min(reportsPercent, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-earth-brown">Chat Messages</span>
            <span className={`text-xs font-medium ${isMessagesWarning ? 'text-terracotta' : 'text-earth-brown'}`}>
              {usage.chatMessages.used} of {usage.chatMessages.limit} used
            </span>
          </div>
          <div className="w-full bg-earth-tan rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${isMessagesWarning ? 'bg-terracotta' : 'bg-forest-green'}`}
              style={{ width: `${Math.min(messagesPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
