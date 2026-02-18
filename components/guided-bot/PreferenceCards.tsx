'use client';

interface PreferenceCardsProps {
  type: 'experience' | 'budget';
  onSelect: (value: string) => void;
}

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', title: 'Beginner', description: 'First timer — I need step-by-step guidance', icon: '🌱' },
  { value: 'intermediate', title: 'Intermediate', description: 'Some experience — I know the basics', icon: '🔨' },
  { value: 'advanced', title: 'Advanced', description: 'Experienced — just need codes and materials', icon: '⭐' },
];

const BUDGET_OPTIONS = [
  { value: 'budget', title: 'Budget', description: 'Keep it affordable — best value picks', icon: '💰' },
  { value: 'mid-range', title: 'Mid-Range', description: 'Balance cost and quality', icon: '⚖️' },
  { value: 'premium', title: 'Premium', description: 'Go premium — best materials available', icon: '✨' },
];

export default function PreferenceCards({ type, onSelect }: PreferenceCardsProps) {
  const options = type === 'experience' ? EXPERIENCE_OPTIONS : BUDGET_OPTIONS;

  return (
    <div className="space-y-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onSelect(option.value)}
          className="w-full flex items-center gap-3 p-3.5 bg-white border border-[#D4C8B8] rounded-xl hover:border-[#C67B5C] hover:bg-[#FDF8F3] transition-all text-left shadow-sm hover:shadow min-h-[48px]"
        >
          <span className="text-xl flex-shrink-0">{option.icon}</span>
          <div className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-[#3E2723]">{option.title}</span>
            <span className="block text-xs text-[#7D6B5D]">{option.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
