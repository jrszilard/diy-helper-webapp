'use client';

import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import RubricPreview from './RubricPreview';

const RUBRIC_ITEM_NAMES: Record<number, string> = {
  1: 'Professional Referral',
  2: 'Code Compliance',
  3: 'Safety Warnings',
  4: 'Sequence Accuracy',
  5: 'Material & Specification',
  6: 'Scope Honesty',
};

interface EditApproveModalProps {
  correctionText: string;
  userQuestion: string;
  aiResponse: string;
  category: string;
  onApprove: (data: {
    editedCorrection?: string;
    severity: 'critical' | 'warning';
    rubricItemsFailed: number[];
  }) => Promise<void>;
  onClose: () => void;
}

export default function EditApproveModal({
  correctionText,
  userQuestion,
  aiResponse,
  category,
  onApprove,
  onClose,
}: EditApproveModalProps) {
  const [editedText, setEditedText] = useState(correctionText);
  const [severity, setSeverity] = useState<'critical' | 'warning'>('warning');
  const [rubricItems, setRubricItems] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRubricItem = (id: number) => {
    setRubricItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApprove = async () => {
    if (rubricItems.length === 0) {
      setError('Select at least one rubric item');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const edited = editedText.trim() !== correctionText.trim() ? editedText.trim() : undefined;
      await onApprove({ editedCorrection: edited, severity, rubricItemsFailed: rubricItems });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-earth-sand">
          <h2 className="text-lg font-bold text-foreground">Edit & Approve Correction</h2>
          <button onClick={onClose} className="text-earth-brown-light hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-earth-brown block mb-1">Correction text</label>
            <textarea
              value={editedText}
              onChange={e => setEditedText(e.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full text-sm border border-earth-sand rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-terracotta"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-earth-brown block mb-1">Severity</label>
            <div className="flex gap-2">
              {(['critical', 'warning'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    severity === s
                      ? s === 'critical' ? 'bg-rust text-white border-rust' : 'bg-earth-sand text-earth-brown border-earth-sand'
                      : 'border-earth-sand text-earth-brown hover:bg-earth-tan/30'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-earth-brown block mb-1">Rubric items failed</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(RUBRIC_ITEM_NAMES).map(([id, label]) => {
                const numId = parseInt(id, 10);
                const selected = rubricItems.includes(numId);
                return (
                  <button
                    key={id}
                    onClick={() => toggleRubricItem(numId)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      selected
                        ? 'bg-rust text-white border-rust'
                        : 'border-earth-sand text-earth-brown hover:border-rust'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {rubricItems.length > 0 && (
            <RubricPreview
              category={category || 'general'}
              severity={severity}
              rubricItemsFailed={rubricItems}
              userQuestion={userQuestion}
              badResponse={aiResponse}
              goodResponse={editedText}
            />
          )}

          {error && <p className="text-sm text-rust">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-earth-sand">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-earth-brown hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting || rubricItems.length === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm bg-forest-green text-white rounded-lg hover:bg-forest-green/90 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Approve & Promote
          </button>
        </div>
      </div>
    </div>
  );
}
