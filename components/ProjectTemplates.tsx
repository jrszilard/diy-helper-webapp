'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  projectTemplates,
  getTemplatesByCategory,
  getFeaturedTemplates,
  getCategories,
  ProjectTemplate
} from '@/lib/templates';
import {
  Zap,
  Droplets,
  Hammer,
  PaintBucket,
  Fence,
  LayoutGrid,
  Clock,
  ArrowRight,
  ChevronDown,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

// Category icons
const categoryIcons: Record<string, React.ReactNode> = {
  electrical: <Zap className="w-5 h-5" />,
  plumbing: <Droplets className="w-5 h-5" />,
  structural: <Hammer className="w-5 h-5" />,
  flooring: <LayoutGrid className="w-5 h-5" />,
  painting: <PaintBucket className="w-5 h-5" />,
  outdoor: <Fence className="w-5 h-5" />
};

// Difficulty badges - earthy colors
const difficultyStyles: Record<string, { bg: string; text: string }> = {
  beginner: { bg: 'bg-[var(--status-complete-bg)]', text: 'text-forest-green' },
  intermediate: { bg: 'bg-[var(--status-progress-bg)]', text: 'text-rust' },
  advanced: { bg: 'bg-[#FADDD0]', text: 'text-rust' }
};

interface ProjectTemplatesProps {
  variant?: 'full' | 'compact' | 'grid';
  showCategories?: boolean;
  maxItems?: number;
  onSelectTemplate?: (template: ProjectTemplate) => void;
}

export default function ProjectTemplates({
  variant = 'full',
  showCategories = true,
  maxItems,
  onSelectTemplate
}: ProjectTemplatesProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const categories = getCategories();
  const displayTemplates = selectedCategory
    ? getTemplatesByCategory(selectedCategory)
    : maxItems
    ? getFeaturedTemplates(maxItems)
    : projectTemplates;

  const handleStartProject = (template: ProjectTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    } else {
      // Store the starter prompt and navigate to chat
      sessionStorage.setItem('initialChatMessage', template.starterPrompt);
      router.push('/');
    }
  };

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        {displayTemplates.slice(0, maxItems || 4).map(template => (
          <button
            key={template.id}
            onClick={() => handleStartProject(template)}
            className="w-full flex items-center gap-3 p-3 bg-white/6 rounded-lg border border-white/10 hover:border-rust hover:bg-white/10 transition-all text-left"
          >
            <span className="text-2xl">{template.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{template.name}</p>
              <p className="text-xs text-white/60">{template.estimatedTime}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/40" />
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayTemplates.map(template => {
          const diffStyle = difficultyStyles[template.difficulty];
          return (
            <div
              key={template.id}
              onClick={() => handleStartProject(template)}
              className="bg-white/6 rounded-xl border border-white/10 p-5 hover:border-rust hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{template.icon}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diffStyle.bg} ${diffStyle.text}`}>
                  {template.difficulty}
                </span>
              </div>
              <h3 className="font-bold text-foreground mb-1">{template.name}</h3>
              <p className="text-sm text-white/60 mb-3 line-clamp-2">{template.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-white/60">
                  <Clock className="w-4 h-4" />
                  {template.estimatedTime}
                </span>
                <span className="flex items-center gap-1 text-rust font-medium group-hover:translate-x-1 transition-transform">
                  Start
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Full variant with categories and expandable details
  return (
    <div className="space-y-6">
      {/* Category Filter */}
      {showCategories && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === null
                ? 'bg-rust text-white'
                : 'bg-white/6 text-warm-brown border border-white/10 hover:border-rust'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Featured
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                selectedCategory === category
                  ? 'bg-rust text-white'
                  : 'bg-white/6 text-warm-brown border border-white/10 hover:border-rust'
              }`}
            >
              {categoryIcons[category]}
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-3">
        {displayTemplates.map(template => {
          const diffStyle = difficultyStyles[template.difficulty];
          const isExpanded = expandedTemplate === template.id;

          return (
            <div
              key={template.id}
              className="bg-white/6 rounded-xl border border-white/10 overflow-hidden hover:border-rust transition-all"
            >
              {/* Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground">{template.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diffStyle.bg} ${diffStyle.text}`}>
                        {template.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 mt-1">{template.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {template.estimatedTime}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        {categoryIcons[template.category]}
                        {template.category}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-earth-tan pt-4">
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    {template.commonMaterials && (
                      <div>
                        <h4 className="text-sm font-semibold text-warm-brown mb-2">Common Materials:</h4>
                        <ul className="text-sm text-white/60 space-y-1">
                          {template.commonMaterials.map((material, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-rust rounded-full"></span>
                              {material}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {template.safetyNotes && (
                      <div>
                        <h4 className="text-sm font-semibold text-warm-brown mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-rust" />
                          Safety Notes:
                        </h4>
                        <ul className="text-sm text-white/60 space-y-1">
                          {template.safetyNotes.map((note, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-rust rounded-full mt-1.5 flex-shrink-0"></span>
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartProject(template);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-rust text-white rounded-lg font-semibold hover:bg-copper transition-all"
                  >
                    Start This Project
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
