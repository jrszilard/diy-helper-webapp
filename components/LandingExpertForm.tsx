'use client';

import { useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import QASubmitForm from '@/components/marketplace/QASubmitForm';
import Button from '@/components/ui/Button';

export default function LandingExpertForm() {
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  if (submittedId) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-forest-green" />
        <div>
          <p className="text-white font-semibold text-lg">Question submitted!</p>
          <p className="text-white/60 text-sm mt-1">An expert will respond shortly.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            href={`/marketplace/qa/${submittedId}`}
            className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10"
          >
            View question <ArrowRight className="w-4 h-4 inline ml-1" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setSubmittedId(null)}
            className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10"
          >
            Ask another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <QASubmitForm onSuccess={setSubmittedId} />
  );
}
