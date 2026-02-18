'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileText, Printer, FolderPlus, ArrowLeft, ExternalLink,
  Shield, Hammer, DollarSign, ShoppingCart, Video, Calendar,
  ClipboardCopy, CheckCircle2, Share2, Link,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ReportSection, ProjectReportRecord } from '@/lib/agents/types';

interface ReportViewProps {
  report: ProjectReportRecord;
  onApplyToProject: () => void;
  onBack: () => void;
  isApplying?: boolean;
  appliedProjectId?: string | null;
  isSharedView?: boolean;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  overview: <FileText size={18} />,
  codes: <Shield size={18} />,
  safety: <Shield size={18} className="text-[#B8593B]" />,
  plan: <Hammer size={18} />,
  materials: <ShoppingCart size={18} />,
  tools: <Hammer size={18} />,
  cost: <DollarSign size={18} />,
  shopping: <ShoppingCart size={18} />,
  videos: <Video size={18} />,
  timeline: <Calendar size={18} />,
  resources: <Video size={18} />,
};

export default function ReportView({
  report,
  onApplyToProject,
  onBack,
  isApplying = false,
  appliedProjectId = null,
  isSharedView = false,
}: ReportViewProps) {
  const sections = (report.sections as ReportSection[]).sort((a, b) => a.order - b.order);
  const [activeTab, setActiveTab] = useState(sections[0]?.id || 'overview');
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'shared'>('idle');

  const activeSection = sections.find(s => s.id === activeTab);

  const handleCopyMarkdown = useCallback(() => {
    const fullReport = sections
      .map(s => `# ${s.title}\n\n${s.content}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(fullReport).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [sections]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleShare = useCallback(async () => {
    if (isSharedView) return;
    setShareStatus('sharing');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/reports/${report.id}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const fullUrl = `${window.location.origin}${data.shareUrl}`;
        await navigator.clipboard.writeText(fullUrl);
        setShareStatus('shared');
        setTimeout(() => setShareStatus('idle'), 3000);
      } else {
        setShareStatus('idle');
      }
    } catch {
      setShareStatus('idle');
    }
  }, [report.id, isSharedView]);

  return (
    <div className="flex flex-col h-full bg-[#F5F0E6]">
      {/* Header */}
      <div className="bg-[#FDFBF7] border-b border-[#D4C8B8] p-4 print:hidden">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-[#5D7B93] hover:text-[#4A6578] transition-colors"
          >
            <ArrowLeft size={16} />
            {isSharedView ? 'Home' : 'Back'}
          </button>
          <div className="flex items-center gap-2">
            {!isSharedView && (
              <button
                onClick={handleShare}
                disabled={shareStatus === 'sharing'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#7D6B5D] hover:bg-[#E8E0D4] rounded-lg transition-colors"
                title="Share report link"
              >
                {shareStatus === 'shared' ? (
                  <>
                    <CheckCircle2 size={14} className="text-[#4A7C59]" />
                    Link Copied!
                  </>
                ) : shareStatus === 'sharing' ? (
                  <>
                    <Share2 size={14} className="animate-pulse" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Link size={14} />
                    Share
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#7D6B5D] hover:bg-[#E8E0D4] rounded-lg transition-colors"
              title="Copy as markdown"
            >
              {copied ? <CheckCircle2 size={14} className="text-[#4A7C59]" /> : <ClipboardCopy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#7D6B5D] hover:bg-[#E8E0D4] rounded-lg transition-colors"
              title="Print / Save as PDF"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>

        <h1 className="text-xl font-bold text-[#3E2723]">{report.title}</h1>
        {report.summary && (
          <p className="text-sm text-[#7D6B5D] mt-1">{report.summary}</p>
        )}
        {report.total_cost && (
          <p className="text-sm font-semibold text-[#5D7B93] mt-1">
            Estimated Total: ${Number(report.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1 mt-4 overflow-x-auto pb-1 -mb-1 scrollbar-thin print:hidden">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                activeTab === section.id
                  ? 'bg-white text-[#3E2723] border border-b-0 border-[#D4C8B8]'
                  : 'text-[#7D6B5D] hover:text-[#3E2723] hover:bg-[#E8E0D4]'
              }`}
            >
              {SECTION_ICONS[section.type] || <FileText size={14} />}
              <span className="hidden sm:inline">{section.title}</span>
              <span className="sm:hidden">{getShortLabel(section.type)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Print-only header (visible only when printing) */}
      <div className="hidden print:block p-6 border-b border-gray-300">
        <h1 className="text-2xl font-bold text-black">{report.title}</h1>
        {report.summary && (
          <p className="text-sm text-gray-600 mt-1">{report.summary}</p>
        )}
        {report.total_cost && (
          <p className="text-sm font-semibold text-gray-800 mt-1">
            Estimated Total: ${Number(report.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Screen content (single tab) */}
      <div className="flex-1 overflow-y-auto p-5 print:hidden">
        {activeSection && (
          <div className="bg-white rounded-lg border border-[#D4C8B8] p-6 max-w-4xl mx-auto">
            <MarkdownContent content={activeSection.content} />
          </div>
        )}
      </div>

      {/* Print content: all sections (hidden on screen, visible when printing) */}
      <div className="hidden print:block">
        {sections.map(section => (
          <div key={section.id} className="p-6 break-inside-avoid-page">
            <h2 className="text-lg font-bold text-black mb-3 border-b border-gray-300 pb-2">
              {section.title}
            </h2>
            <MarkdownContent content={section.content} isPrint />
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="bg-[#FDFBF7] border-t border-[#D4C8B8] p-4 print:hidden">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <p className="text-xs text-[#B0A696]">
            Generated {new Date(report.created_at).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </p>
          {isSharedView ? (
            <a
              href="/"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-[#C67B5C] hover:bg-[#A65D3F] transition-colors shadow-md"
            >
              <FolderPlus size={18} />
              Create Your Own Project Plan
            </a>
          ) : appliedProjectId ? (
            <div className="flex items-center gap-2 text-sm text-[#4A7C59] font-medium">
              <CheckCircle2 size={18} />
              Materials saved to project
            </div>
          ) : (
            <button
              onClick={onApplyToProject}
              disabled={isApplying}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white transition-colors shadow-md ${
                isApplying
                  ? 'bg-[#B0A696] cursor-not-allowed'
                  : 'bg-[#C67B5C] hover:bg-[#A65D3F]'
              }`}
            >
              <FolderPlus size={18} />
              {isApplying ? 'Saving...' : 'Save to Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MarkdownContent({ content, isPrint = false }: { content: string; isPrint?: boolean }) {
  return (
    <div className={`prose prose-sm max-w-none
      ${isPrint
        ? '[&_*]:!text-black'
        : `prose-headings:font-bold prose-p:leading-relaxed
           [&_a]:!text-[#5D7B93] prose-a:no-underline hover:prose-a:underline`
      }
      prose-table:border-collapse
      ${isPrint
        ? 'prose-th:bg-gray-100 prose-th:p-2 prose-th:border prose-th:border-gray-300 prose-td:p-2 prose-td:border prose-td:border-gray-300'
        : 'prose-th:bg-[#F5F0E6] prose-th:p-2 prose-th:border prose-th:border-[#D4C8B8] prose-td:p-2 prose-td:border prose-td:border-[#D4C8B8]'
      }
      print:[&_*]:!text-black
    `}>
      <ReactMarkdown
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
              {...props}
            >
              {children}
              {!isPrint && <ExternalLink size={12} className="inline flex-shrink-0" />}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function getShortLabel(type: string): string {
  const labels: Record<string, string> = {
    overview: 'Overview',
    codes: 'Codes',
    safety: 'Safety',
    plan: 'Plan',
    materials: 'Materials',
    tools: 'Tools',
    cost: 'Cost',
    shopping: 'Shop',
    videos: 'Videos',
    timeline: 'Timeline',
    resources: 'Resources',
  };
  return labels[type] || type;
}
