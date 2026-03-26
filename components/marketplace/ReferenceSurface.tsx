'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Spinner, Alert } from '@/components/ui';

interface ReferenceSurfaceProps {
  questionId: string;
}

interface ReferenceResult {
  hasLicensingGap: boolean;
  noLicensesOnFile?: boolean;
  advisory: string | null;
  questionTrade?: string;
  expertTrades?: string[];
}

export default function ReferenceSurface({ questionId }: ReferenceSurfaceProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ReferenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchReferences = async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) {
          setError('Please sign in.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/experts/tools/references', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ questionId }),
        });

        if (cancelled) return;

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Failed to load licensing info.');
          setLoading(false);
          return;
        }

        const data: ReferenceResult = await res.json();
        setResult(data);
      } catch {
        if (!cancelled) {
          setError('Something went wrong loading references.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchReferences();
    return () => { cancelled = true; };
  }, [questionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <Spinner size="sm" color="primary" />
        <span className="text-xs text-[var(--earth-brown)]">Checking licensing...</span>
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!result) return null;

  if (result.noLicensesOnFile) {
    return (
      <Alert variant="info" title="No licenses on file">
        Add your licenses in your expert profile to enable licensing checks.
      </Alert>
    );
  }

  if (!result.hasLicensingGap) {
    return (
      <Alert variant="success" title="No licensing gaps detected">
        {result.questionTrade
          ? `Your licenses cover the "${result.questionTrade}" trade category.`
          : 'Your licenses cover this trade category.'}
      </Alert>
    );
  }

  return (
    <Alert variant="warning" title="Licensing gap detected">
      {result.advisory && <p>{result.advisory}</p>}
      {result.questionTrade && (
        <p className="text-xs mt-1">
          Question trade: {result.questionTrade}
          {result.expertTrades && result.expertTrades.length > 0 && (
            <> &middot; Your trades: {result.expertTrades.join(', ')}</>
          )}
        </p>
      )}
    </Alert>
  );
}
