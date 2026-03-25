'use client';

interface PreferenceCardsProps {
  type: 'experience' | 'budget';
  onSelect: (value: string) => void;
}

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', title: 'Beginner', description: 'First timer — I need step-by-step guidance' },
  { value: 'intermediate', title: 'Intermediate', description: 'Some experience — I know the basics' },
  { value: 'advanced', title: 'Advanced', description: 'Experienced — just need codes and materials' },
];

const BUDGET_OPTIONS = [
  { value: 'budget', title: 'Budget', description: 'Keep it affordable — best value picks' },
  { value: 'mid-range', title: 'Mid-Range', description: 'Balance cost and quality' },
  { value: 'premium', title: 'Premium', description: 'Go premium — best materials available' },
];

export default function PreferenceCards({ type, onSelect }: PreferenceCardsProps) {
  const options = type === 'experience' ? EXPERIENCE_OPTIONS : BUDGET_OPTIONS;

  return (
    <div className="space-y-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onSelect(option.value)}
          className="w-full flex items-center gap-3 p-3.5 bg-white/10 border border-white/20 rounded-xl hover:bg-white/15 hover:border-terracotta transition-all text-left min-h-[48px]"
        >
          <div className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-white">{option.title}</span>
            <span className="block text-xs text-white/60">{option.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
