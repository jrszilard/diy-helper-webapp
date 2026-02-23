'use client';

import { DollarSign, TrendingUp, Star, MessageSquare, Clock, CreditCard } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalEarnings: number;
    monthEarnings: number;
    totalReviews: number;
    avgRating: number;
    activeQuestions: number;
    pendingPayouts: number;
  };
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const cards = [
    {
      label: 'Total Earnings',
      value: `$${(stats.totalEarnings / 100).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-[#4A7C59]',
      bgColor: 'bg-[#4A7C59]/10',
    },
    {
      label: 'This Month',
      value: `$${(stats.monthEarnings / 100).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-[#5D7B93]',
      bgColor: 'bg-[#5D7B93]/10',
    },
    {
      label: 'Avg Rating',
      value: stats.totalReviews > 0 ? stats.avgRating.toFixed(1) : 'N/A',
      icon: Star,
      color: 'text-[#C67B5C]',
      bgColor: 'bg-[#C67B5C]/10',
      subtitle: `${stats.totalReviews} review${stats.totalReviews !== 1 ? 's' : ''}`,
    },
    {
      label: 'Active Questions',
      value: stats.activeQuestions.toString(),
      icon: MessageSquare,
      color: 'text-[#5D7B93]',
      bgColor: 'bg-[#5D7B93]/10',
    },
    {
      label: 'Pending Payouts',
      value: `$${(stats.pendingPayouts / 100).toFixed(2)}`,
      icon: Clock,
      color: 'text-[#7D6B5D]',
      bgColor: 'bg-[#7D6B5D]/10',
    },
    {
      label: 'Total Reviews',
      value: stats.totalReviews.toString(),
      icon: CreditCard,
      color: 'text-[#4A7C59]',
      bgColor: 'bg-[#4A7C59]/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bgColor, subtitle }) => (
        <div
          key={label}
          className="bg-white border border-[#D4C8B8] rounded-lg p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <span className="text-xs text-[#7D6B5D] font-medium">{label}</span>
          </div>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-[#B0A696] mt-0.5">{subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}
