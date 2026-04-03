'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, AlertTriangle, Wrench, Eye, Edit3, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, Textarea, Spinner, Modal } from '@/components/ui';
import ExpertCoPilot from './ExpertCoPilot';

interface QAAnswerFormProps {
  questionId: string;
  onSuccess: () => void;
}

export default function QAAnswerForm({ questionId, onSuccess }: QAAnswerFormProps) {
  const [answerText, setAnswerText] = useState('');
  const [photoUrls, setPhotoUrls] = useState('');
  const [recommendsPro, setRecommendsPro] = useState(false);
  const [proReason, setProReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const charCount = answerText.length;
  const isValid = charCount >= 50 && charCount <= 5000;

  const handleSubmit = async () => {
    if (!isValid) return;

    setSubmitting(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in.');
        setSubmitting(false);
        return;
      }

      const photos = photoUrls
        .split('\n')
        .map(u => u.trim())
        .filter(Boolean);

      const res = await fetch(`/api/qa/${questionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answerText: answerText.trim(),
          photoUrls: photos,
          recommendsProfessional: recommendsPro,
          proRecommendationReason: recommendsPro ? proReason.trim() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to submit answer.');
        setSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-earth-sand rounded-lg p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">Your Answer</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${!showPreview ? 'bg-earth-tan text-foreground' : 'text-earth-brown hover:text-foreground'}`}
              >
                <Edit3 size={12} className="inline mr-1" />Write
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${showPreview ? 'bg-earth-tan text-foreground' : 'text-earth-brown hover:text-foreground'}`}
              >
                <Eye size={12} className="inline mr-1" />Preview
              </button>
            </div>
            <Button
              variant="tertiary"
              size="sm"
              leftIcon={Wrench}
              onClick={() => setIsToolsOpen(true)}
            >
              Expert Tools
            </Button>
          </div>
          {showPreview ? (
            <div className="border border-earth-sand rounded-lg p-4 min-h-[150px] prose prose-sm max-w-none">
              {answerText ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answerText}</ReactMarkdown>
              ) : (
                <p className="text-earth-brown italic">Nothing to preview yet...</p>
              )}
            </div>
          ) : (
            <Textarea
              value={answerText}
              onChange={e => setAnswerText(e.target.value)}
              rows={8}
              fullWidth
              resize="none"
              placeholder="Provide a detailed answer. You can use **bold**, *italic*, - lists, and ## headings."
            />
          )}
          <p className={`text-xs mt-1 ${
            charCount < 50 ? 'text-terracotta' : charCount > 5000 ? 'text-red-600' : 'text-muted'
          }`}>
            {charCount}/5,000 characters (minimum 50)
          </p>
        </div>

        {/* Answer Photos */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Photos (optional, max 3)</label>
          <div className="flex flex-wrap gap-2">
            {photoUrls.split('\n').filter(Boolean).map((url, i) => (
              <div key={i} className="relative w-16 h-16">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} className="w-16 h-16 rounded object-cover border border-earth-sand" />
                <button
                  type="button"
                  onClick={() => setPhotoUrls(photoUrls.split('\n').filter((_, j) => j !== i).join('\n'))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
                >
                  x
                </button>
              </div>
            ))}
            {photoUrls.split('\n').filter(Boolean).length < 3 && (
              <label className="w-16 h-16 border-2 border-dashed border-earth-sand rounded flex items-center justify-center cursor-pointer hover:border-terracotta transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const token = (await supabase.auth.getSession()).data.session?.access_token;
                    if (!token) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await fetch('/api/messages/upload', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                      body: formData,
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const existing = photoUrls.split('\n').filter(Boolean);
                      setPhotoUrls([...existing, data.url].join('\n'));
                    }
                  }}
                />
                <Plus size={16} className="text-earth-brown" />
              </label>
            )}
          </div>
          <p className="text-xs text-earth-brown mt-1">JPG, PNG, or WebP. Max 5 MB each.</p>
        </div>

        <div className="border border-earth-sand rounded-lg p-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={recommendsPro}
              onChange={e => setRecommendsPro(e.target.checked)}
              className="w-4 h-4 accent-terracotta"
            />
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-[var(--warning)]" />
              <span className="text-sm font-medium text-foreground">Recommend hiring a professional</span>
            </div>
          </label>
          {recommendsPro && (
            <Textarea
              value={proReason}
              onChange={e => setProReason(e.target.value)}
              rows={2}
              fullWidth
              resize="none"
              placeholder="Why should they hire a professional?"
              className="mt-2"
            />
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="secondary"
            size="lg"
            leftIcon={submitting ? undefined : Send}
            iconSize={16}
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {submitting ? <><Spinner size="sm" color="default" className="text-white" /> Submitting...</> : 'Submit Answer'}
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
        title="Expert Tools"
        position="right"
        className="max-w-lg"
      >
        <ExpertCoPilot
          questionId={questionId}
          onInsertDraft={(draft) => {
            setAnswerText(draft);
            setIsToolsOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}
