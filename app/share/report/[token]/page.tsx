'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReportView from '@/components/ReportView';
import type { ProjectReportRecord } from '@/lib/agents/types';

export default function SharedReportPage() {
  const params = useParams();
  const token = params.token as string;

  const [report, setReport] = useState<ProjectReportRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/reports/share/${token}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.error || 'Report not found');
          return;
        }
        const data = await response.json();
        setReport(data.report);
      } catch {
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchReport();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-cream">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-earth-brown">Loading shared report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-cream">
        <div className="text-center max-w-md px-6">
          <h1 className="text-xl font-bold text-foreground mb-2">Report Not Found</h1>
          <p className="text-sm text-earth-brown mb-6">
            {error || 'This shared report link may have expired or been disabled.'}
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-terracotta text-white font-semibold rounded-lg hover:bg-terracotta-dark transition-colors"
          >
            Create Your Own Project Plan
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-cream">
      <ReportView
        report={report}
        onApplyToProject={() => {}}
        onBack={() => { window.location.href = '/'; }}
        isSharedView={true}
      />
    </div>
  );
}
