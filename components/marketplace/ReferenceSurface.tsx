'use client';

import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, AlertTriangle, ShieldX } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-[#C67B5C]" />
        <span className="ml-2 text-xs text-[#7D6B5D]">Checking licensing...</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-red-600 py-2">{error}</p>
    );
  }

  if (!result) return null;

  // No licenses on file
  if (result.noLicensesOnFile) {
    return (
      <div className="flex items-start gap-2 py-2">
        <ShieldX size={16} className="text-[#7D6B5D] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-[#3E2723]">No verified licenses on file</p>
          <p className="text-[10px] text-[#A89880] mt-0.5">
            Add your licenses in your expert profile to enable licensing checks.
          </p>
        </div>
      </div>
    );
  }

  // No gap — all clear
  if (!result.hasLicensingGap) {
    return (
      <div className="flex items-start gap-2 py-2">
        <ShieldCheck size={16} className="text-[#4A7C59] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-[#3E2723]">Your licenses cover this trade category</p>
          {result.questionTrade && (
            <p className="text-[10px] text-[#A89880] mt-0.5">
              Trade: {result.questionTrade}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Licensing gap detected
  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-amber-800">Licensing gap detected</p>
          {result.advisory && (
            <p className="text-xs text-amber-700 mt-1">{result.advisory}</p>
          )}
          {result.questionTrade && (
            <p className="text-[10px] text-amber-600 mt-1.5">
              Question trade: {result.questionTrade}
              {result.expertTrades && result.expertTrades.length > 0 && (
                <> &middot; Your trades: {result.expertTrades.join(', ')}</>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
