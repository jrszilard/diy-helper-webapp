'use client';

const RUBRIC_ITEM_NAMES: Record<number, string> = {
  1: 'Professional Referral',
  2: 'Code Compliance',
  3: 'Safety Warnings',
  4: 'Sequence Accuracy',
  5: 'Material & Specification',
  6: 'Scope Honesty',
};

interface RubricPreviewProps {
  category: string;
  severity: 'critical' | 'warning';
  rubricItemsFailed: number[];
  userQuestion: string;
  badResponse: string;
  goodResponse: string;
}

export default function RubricPreview({
  category,
  severity,
  rubricItemsFailed,
  userQuestion,
  badResponse,
  goodResponse,
}: RubricPreviewProps) {
  return (
    <div className="border border-dashed border-white/10 rounded-lg p-3 bg-white/10 space-y-2 text-sm">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wide">Rubric Example Preview</p>
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-blue text-white">{category}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          severity === 'critical' ? 'bg-rust text-white' : 'bg-white/10 text-white/60'
        }`}>{severity}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {rubricItemsFailed.map(id => (
          <span key={id} className="text-xs px-1.5 py-0.5 rounded bg-rust/10 text-rust">
            {RUBRIC_ITEM_NAMES[id] || `Item ${id}`}
          </span>
        ))}
      </div>
      <div className="text-xs text-white/60">
        <p className="font-medium">Q: {userQuestion.slice(0, 120)}{userQuestion.length > 120 ? '...' : ''}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-rust/5 rounded p-2">
          <p className="font-medium text-rust mb-1">Bad response</p>
          <p className="text-white/60 line-clamp-3">{badResponse}</p>
        </div>
        <div className="bg-forest-green/5 rounded p-2">
          <p className="font-medium text-forest-green mb-1">Good response</p>
          <p className="text-white/60 line-clamp-3">{goodResponse}</p>
        </div>
      </div>
    </div>
  );
}
