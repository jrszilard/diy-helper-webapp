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
  beginner: { bg: 'bg-[#E8F3EC]', text: 'text-[#4A7C59]' },
  intermediate: { bg: 'bg-[#FDF3ED]', text: 'text-[#C67B5C]' },
  advanced: { bg: 'bg-[#FADDD0]', text: 'text-[#B8593B]' }
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
      router.push('/chat');
    }
  };

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        {displayTemplates.slice(0, maxItems || 4).map(template => (
          <button
            key={template.id}
            onClick={() => handleStartProject(template)}
            className="w-full flex items-center gap-3 p-3 bg-[#FDFBF7] rounded-lg border border-[#D4C8B8] hover:border-[#C67B5C] hover:bg-[#FDF8F3] transition-all text-left"
          >
            <span className="text-2xl">{template.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#3E2723] truncate">{template.name}</p>
              <p className="text-xs text-[#7D6B5D]">{template.estimatedTime}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#A89880]" />
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
              className="bg-[#FDFBF7] rounded-xl border border-[#D4C8B8] p-5 hover:border-[#C67B5C] hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{template.icon}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diffStyle.bg} ${diffStyle.text}`}>
                  {template.difficulty}
                </span>
              </div>
              <h3 className="font-bold text-[#3E2723] mb-1">{template.name}</h3>
              <p className="text-sm text-[#7D6B5D] mb-3 line-clamp-2">{template.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-[#7D6B5D]">
                  <Clock className="w-4 h-4" />
                  {template.estimatedTime}
                </span>
                <span className="flex items-center gap-1 text-[#C67B5C] font-medium group-hover:translate-x-1 transition-transform">
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
                ? 'bg-[#C67B5C] text-white'
                : 'bg-[#FDFBF7] text-[#5C4D42] border border-[#D4C8B8] hover:border-[#C67B5C]'
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
                  ? 'bg-[#C67B5C] text-white'
                  : 'bg-[#FDFBF7] text-[#5C4D42] border border-[#D4C8B8] hover:border-[#C67B5C]'
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
              className="bg-[#FDFBF7] rounded-xl border border-[#D4C8B8] overflow-hidden hover:border-[#C67B5C] transition-all"
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
                      <h3 className="font-bold text-[#3E2723]">{template.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diffStyle.bg} ${diffStyle.text}`}>
                        {template.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-[#7D6B5D] mt-1">{template.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-[#7D6B5D]">
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
                  <ChevronDown className={`w-5 h-5 text-[#A89880] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[#E8DFD0] pt-4">
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    {template.commonMaterials && (
                      <div>
                        <h4 className="text-sm font-semibold text-[#5C4D42] mb-2">Common Materials:</h4>
                        <ul className="text-sm text-[#7D6B5D] space-y-1">
                          {template.commonMaterials.map((material, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-[#C67B5C] rounded-full"></span>
                              {material}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {template.safetyNotes && (
                      <div>
                        <h4 className="text-sm font-semibold text-[#5C4D42] mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-[#C67B5C]" />
                          Safety Notes:
                        </h4>
                        <ul className="text-sm text-[#7D6B5D] space-y-1">
                          {template.safetyNotes.map((note, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-[#C67B5C] rounded-full mt-1.5 flex-shrink-0"></span>
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
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#C67B5C] text-white rounded-lg font-semibold hover:bg-[#A65D3F] transition-all"
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
