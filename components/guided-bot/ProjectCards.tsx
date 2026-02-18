'use client';

import { getFeaturedTemplates, projectTemplates } from '@/lib/templates/index';

interface ProjectCardsProps {
  onSelectProject: (type: string, description: string, templateId?: string) => void;
}

const DIFFICULTY_COLORS = {
  beginner: 'bg-[#E8F5E9] text-[#2E7D32]',
  intermediate: 'bg-[#FFF3E0] text-[#E65100]',
  advanced: 'bg-[#FFEBEE] text-[#C62828]',
};

export default function ProjectCards({ onSelectProject }: ProjectCardsProps) {
  // Show all 13 templates for maximum coverage
  const templates = projectTemplates;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelectProject(template.category, template.starterPrompt, template.id)}
          className="group flex flex-col items-start gap-2 p-3 bg-white border border-[#D4C8B8] rounded-xl hover:border-[#C67B5C] hover:bg-[#FDF8F3] transition-all text-left shadow-sm hover:shadow min-h-[48px]"
        >
          <div className="flex items-center gap-2 w-full">
            <span className="text-xl flex-shrink-0">{template.icon}</span>
            <span className="text-sm font-medium text-[#3E2723] leading-tight">{template.name}</span>
          </div>
          <div className="flex items-center gap-2 w-full">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[template.difficulty]}`}>
              {template.difficulty}
            </span>
            <span className="text-[10px] text-[#A89880]">{template.estimatedTime}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
