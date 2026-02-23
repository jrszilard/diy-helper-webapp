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
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E6]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5D7B93] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#7D6B5D]">Loading shared report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E6]">
        <div className="text-center max-w-md px-6">
          <h1 className="text-xl font-bold text-[#3E2723] mb-2">Report Not Found</h1>
          <p className="text-sm text-[#7D6B5D] mb-6">
            {error || 'This shared report link may have expired or been disabled.'}
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-[#C67B5C] text-white font-semibold rounded-lg hover:bg-[#A65D3F] transition-colors"
          >
            Create Your Own Project Plan
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6]">
      <ReportView
        report={report}
        onApplyToProject={() => {}}
        onBack={() => { window.location.href = '/'; }}
        isSharedView={true}
      />
    </div>
  );
}
