'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileText, Printer, FolderPlus, ArrowLeft, ExternalLink,
  Shield, Hammer, DollarSign, ShoppingCart, Video, Calendar,
  ClipboardCopy, CheckCircle2, Share2, Link, LogIn, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ReportSection, ProjectReportRecord, ReportOutput } from '@/lib/agents/types';
import { sanitizeHref } from '@/lib/security';
import ContextualHint from '@/components/ui/ContextualHint';
import ExpertHelpDropdown from '@/components/marketplace/ExpertHelpDropdown';
import ProjectTimeline from '@/components/marketplace/ProjectTimeline';

interface ReportViewProps {
  report: ProjectReportRecord | ReportOutput;
  onBack: () => void;
  reportId?: string;
  applyToProject?: (reportId: string) => Promise<{ success: boolean; projectId: string; itemCount: number; message: string } | null>;
  onApplyToProject?: () => void;
  isApplying?: boolean;
  appliedProjectId?: string | null;
  isSharedView?: boolean;
  isAuthenticated?: boolean;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  overview: <FileText size={18} />,
  codes: <Shield size={18} />,
  safety: <Shield size={18} className="text-rust" />,
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
  onBack,
  reportId,
  applyToProject,
  onApplyToProject,
  isApplying: externalIsApplying = false,
  appliedProjectId: externalAppliedProjectId = null,
  isSharedView = false,
  isAuthenticated = true,
}: ReportViewProps) {
  // Normalize fields between ProjectReportRecord (snake_case) and ReportOutput (camelCase)
  const totalCost = 'total_cost' in report ? (report as ProjectReportRecord).total_cost : ('totalCost' in report ? (report as ReportOutput).totalCost : null);
  const createdAt = 'created_at' in report ? report.created_at : ('generatedAt' in report ? report.generatedAt : null);

  const sections = (report.sections as ReportSection[]).sort((a, b) => a.order - b.order);
  const [activeTab, setActiveTab] = useState(sections[0]?.id || 'overview');
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'shared'>('idle');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Self-contained save state
  const [internalIsApplying, setInternalIsApplying] = useState(false);
  const [internalAppliedProjectId, setInternalAppliedProjectId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  const isApplying = applyToProject ? internalIsApplying : externalIsApplying;
  const appliedProjectId = applyToProject ? internalAppliedProjectId : externalAppliedProjectId;

  const handleSave = useCallback(async () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    if (applyToProject && reportId) {
      setInternalIsApplying(true);
      const result = await applyToProject(reportId);
      setInternalIsApplying(false);
      if (result?.success) {
        setInternalAppliedProjectId(result.projectId);
        setToast({ message: `Saved ${result.itemCount} items to your project!`, visible: true });
        setTimeout(() => setToast(null), 5000);
      }
    } else if (onApplyToProject) {
      onApplyToProject();
    }
  }, [applyToProject, reportId, onApplyToProject, isAuthenticated]);

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
    <div className="flex flex-col h-full bg-earth-cream">
      {/* Save confirmation toast */}
      {toast?.visible && (
        <div className="fixed top-20 right-4 bg-forest-green text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 max-w-sm animate-slide-in">
          <CheckCircle2 size={20} className="flex-shrink-0" />
          <p className="font-medium text-sm">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-auto hover:opacity-80">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Feature hint */}
      <div className="px-4 pt-2 print:hidden">
        <ContextualHint hintKey="report">
          You can save this project and come back to it anytime from <strong>Projects</strong> ↑
        </ContextualHint>
      </div>

      {/* Header */}
      <div className="bg-surface border-b border-earth-sand p-4 print:hidden">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-blue hover:text-slate-blue-dark transition-colors"
          >
            <ArrowLeft size={16} />
            {isSharedView ? 'Home' : 'Back'}
          </button>
          <div className="flex items-center gap-2">
            {!isSharedView && (
              <button
                onClick={handleShare}
                disabled={shareStatus === 'sharing'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-earth-brown hover:bg-[#E8E0D4] rounded-lg transition-colors"
                title="Share report link"
              >
                {shareStatus === 'shared' ? (
                  <>
                    <CheckCircle2 size={14} className="text-forest-green" />
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-earth-brown hover:bg-[#E8E0D4] rounded-lg transition-colors"
              title="Copy as markdown"
            >
              {copied ? <CheckCircle2 size={14} className="text-forest-green" /> : <ClipboardCopy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-earth-brown hover:bg-[#E8E0D4] rounded-lg transition-colors"
              title="Print / Save as PDF"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground">{report.title}</h1>
        {report.summary && (
          <p className="text-sm text-earth-brown mt-1">{report.summary}</p>
        )}
        {totalCost && (
          <p className="text-sm font-semibold text-slate-blue mt-1">
            Estimated Total: ${Number(totalCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  ? 'bg-white text-foreground border border-b-0 border-earth-sand'
                  : 'text-earth-brown hover:text-foreground hover:bg-[#E8E0D4]'
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
        {totalCost && (
          <p className="text-sm font-semibold text-gray-800 mt-1">
            Estimated Total: ${Number(totalCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Screen content (single tab) */}
      <div className="flex-1 overflow-y-auto p-5 print:hidden">
        <div className="max-w-4xl mx-auto space-y-4">
          {activeSection && (
            <div className="bg-white rounded-lg border border-earth-sand p-6">
              <MarkdownContent content={activeSection.content} />
            </div>
          )}

          {/* Expert activity timeline — shows Q&A interactions for this report */}
          {!isSharedView && isAuthenticated && reportId && (
            <ProjectTimeline reportId={reportId} />
          )}
        </div>
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

      {/* Login prompt overlay */}
      {showLoginPrompt && (
        <div className="bg-[#FDF8F3] border-t border-earth-sand p-4 print:hidden">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Sign in to save your plan</p>
              <p className="text-xs text-warm-brown mt-0.5">
                Create a free account to save this project, track materials, and access your plans anytime.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/chat"
                className="flex items-center gap-2 px-4 py-2 bg-terracotta text-white text-sm font-semibold rounded-lg hover:bg-terracotta-dark transition-colors whitespace-nowrap"
              >
                <LogIn size={16} />
                Sign In
              </a>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="p-1.5 text-earth-brown hover:bg-[#E8E0D4] rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="bg-surface border-t border-earth-sand p-4 print:hidden">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <p className="text-xs text-muted">
            Generated {createdAt ? new Date(createdAt).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            }) : 'just now'}
          </p>
          <div className="flex items-center gap-3">
            {!isSharedView && report.id && (
              <ExpertHelpDropdown
                reportId={report.id}
                totalCost={totalCost ?? undefined}
                isAuthenticated={isAuthenticated}
              />
            )}
            {isSharedView ? (
              <a
                href="/"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-terracotta hover:bg-terracotta-dark transition-colors shadow-md"
              >
                <FolderPlus size={18} />
                Create Your Own Project Plan
              </a>
            ) : appliedProjectId ? (
              <div className="flex items-center gap-2 text-sm text-forest-green font-medium">
                <CheckCircle2 size={18} />
                Materials saved to project
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={isApplying}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white transition-colors shadow-md ${
                  isApplying
                    ? 'bg-muted cursor-not-allowed'
                    : 'bg-terracotta hover:bg-terracotta-dark'
                }`}
              >
                <FolderPlus size={18} />
                {isApplying ? 'Saving...' : 'Save to Project'}
              </button>
            )}
          </div>
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
           [&_a]:!text-slate-blue prose-a:no-underline hover:prose-a:underline`
      }
      prose-table:border-collapse
      ${isPrint
        ? 'prose-th:bg-gray-100 prose-th:p-2 prose-th:border prose-th:border-gray-300 prose-td:p-2 prose-td:border prose-td:border-gray-300'
        : 'prose-th:bg-earth-cream prose-th:p-2 prose-th:border prose-th:border-earth-sand prose-td:p-2 prose-td:border prose-td:border-earth-sand'
      }
      prose-li:my-0.5
      [&_ul]:space-y-1
      [&_ul_ul]:mt-1
      [&_strong]:text-foreground
      print:[&_*]:!text-black
    `}>
      <ReactMarkdown
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={sanitizeHref(href)}
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
