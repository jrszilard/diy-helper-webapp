'use client';

import { useState } from 'react';
import { Edit, X, CheckCircle } from 'lucide-react';
import EditApproveModal from './EditApproveModal';

interface Reporter {
  role: 'expert' | 'diy_user';
  name: string;
  specialties: string[];
}

interface CorrectionItem {
  id: string;
  source: string;
  category: string | null;
  userQuestion: string;
  aiResponse: string;
  correctionText: string | null;
  flagType: string | null;
  severity: string | null;
  reporter: Reporter;
  createdAt: string;
}

interface AdminCorrectionCardProps {
  item: CorrectionItem;
  onApprove: (id: string, data: {
    editedCorrection?: string;
    severity: 'critical' | 'warning';
    rubricItemsFailed: number[];
  }) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

const SOURCE_LABELS: Record<string, string> = {
  user_flag: 'User Flag',
  expert_correction: 'Expert Correction',
  expert_review: 'Expert Review',
};

export default function AdminCorrectionCard({ item, onApprove, onReject }: AdminCorrectionCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [processed, setProcessed] = useState<'approved' | 'rejected' | null>(null);

  if (processed) {
    return (
      <div className={`bg-white/6 border rounded-lg p-4 text-sm flex items-center gap-2 ${
        processed === 'approved' ? 'border-forest-green text-forest-green' : 'border-white/10 text-white/40'
      }`}>
        <CheckCircle className="w-4 h-4" />
        {processed === 'approved' ? 'Approved and promoted to rubric' : 'Rejected'}
      </div>
    );
  }

  const handleApprove = async (data: {
    editedCorrection?: string;
    severity: 'critical' | 'warning';
    rubricItemsFailed: number[];
  }) => {
    await onApprove(item.id, data);
    setShowModal(false);
    setProcessed('approved');
  };

  const handleReject = async () => {
    await onReject(item.id);
    setProcessed('rejected');
  };

  return (
    <>
      <div className="bg-white/6 border border-white/10 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-rust/20 text-rust font-medium">
            {SOURCE_LABELS[item.source] || item.source}
          </span>
          {item.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-blue text-white">
              {item.category}
            </span>
          )}
          {item.flagType && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-rust/10 text-rust">
              {item.flagType}
            </span>
          )}
          <span className="text-xs text-white/40 ml-auto">
            {item.reporter.role === 'expert'
              ? `${item.reporter.name} (${item.reporter.specialties.join(', ')})`
              : 'DIY User'}
          </span>
        </div>

        <p className="text-sm font-medium text-foreground">{item.userQuestion}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-rust/5 rounded-lg p-3">
            <p className="text-xs font-semibold text-rust mb-1">AI Response</p>
            <p className="text-sm text-white/60 whitespace-pre-wrap line-clamp-6">{item.aiResponse}</p>
          </div>
          <div className="bg-forest-green/5 rounded-lg p-3">
            <p className="text-xs font-semibold text-forest-green mb-1">Correction</p>
            <p className="text-sm text-white/60 whitespace-pre-wrap line-clamp-6">
              {item.correctionText || '(no correction text provided)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-forest-green text-white rounded-lg hover:bg-forest-green/90 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" /> Edit & Approve
          </button>
          <button
            onClick={handleReject}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-white/60 hover:text-[var(--rust)] border border-white/10 rounded-lg hover:border-[var(--rust)] transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      </div>

      {showModal && (
        <EditApproveModal
          correctionText={item.correctionText || ''}
          userQuestion={item.userQuestion}
          aiResponse={item.aiResponse}
          category={item.category || 'other'}
          onApprove={handleApprove}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
