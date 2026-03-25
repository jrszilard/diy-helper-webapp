'use client';

import { getFeaturedTemplates } from '@/lib/templates/index';

interface ProjectCardsProps {
  onSelectProject: (type: string, description: string, templateId?: string) => void;
}


export default function ProjectCards({ onSelectProject }: ProjectCardsProps) {
  const templates = getFeaturedTemplates(6);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelectProject(template.category, template.starterPrompt, template.id)}
          className="group rounded-2xl bg-white/10 hover:bg-white/15 text-left transition-all p-4"
        >
          <p className="text-white font-semibold text-sm leading-tight">{template.name}</p>
        </button>
      ))}
    </div>
  );
}
