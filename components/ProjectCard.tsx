'use client';

import React from 'react';
import {
  Trash2,
  Edit2,
  User,
} from 'lucide-react';
import { Project } from '@/types';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import StatusBadge from '@/components/ui/StatusBadge';

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  isMobile?: boolean;
  isEditing: boolean;
  editName: string;
  editDescription: string;
  categoryIcon: React.ReactNode;
  onSelect: () => void;
  onStartEditing: (e: React.MouseEvent) => void;
  onSaveEditing: (e: React.SyntheticEvent) => void;
  onCancelEditing: (e: React.SyntheticEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onEditNameChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
}

export default function ProjectCard({
  project,
  isSelected,
  isMobile = false,
  isEditing,
  editName,
  editDescription,
  categoryIcon,
  onSelect,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
  onDelete,
  onEditNameChange,
  onEditDescriptionChange,
}: ProjectCardProps) {
  if (isMobile) {
    return (
      <div
        onClick={onSelect}
        className={`relative p-4 rounded-xl cursor-pointer transition active:scale-[0.98] ${
          isSelected
            ? 'bg-[var(--status-progress-bg)] border-2 border-[#C67B5C]'
            : 'bg-surface border-2 border-transparent active:bg-[#F5F0E6]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <EditForm
                editName={editName}
                editDescription={editDescription}
                onEditNameChange={onEditNameChange}
                onEditDescriptionChange={onEditDescriptionChange}
                onSave={onSaveEditing}
                onCancel={onCancelEditing}
                isMobile
              />
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#5D7B93]">{categoryIcon}</span>
                  <span className="font-semibold text-base truncate text-[#3E2723]">{project.name}</span>
                </div>
                {project.description && (
                  <p className="text-sm text-[#7D6B5D] line-clamp-2 ml-6">{project.description}</p>
                )}
              </>
            )}
            <div className="flex items-center gap-2 mt-2 ml-6 flex-wrap">
              {project.isGuest && <GuestBadge />}
              <StatusBadge status={project.status} />
              <span className="text-xs text-[#A89880]">
                {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            {!isEditing && (
              <button
                onClick={onStartEditing}
                className="p-2 hover:bg-[var(--status-research-bg)] active:bg-[#D4E4ED] rounded-lg transition"
                title="Edit project"
                aria-label="Edit project"
              >
                <Edit2 className="w-5 h-5 text-[#5D7B93]" />
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-2 hover:bg-[var(--status-progress-bg)] active:bg-[#FADDD0] rounded-lg transition"
              title="Delete project"
              aria-label="Delete project"
            >
              <Trash2 className="w-5 h-5 text-[#B8593B]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div
      onClick={onSelect}
      className={`group relative p-3 rounded-lg cursor-pointer transition ${
        isSelected
          ? 'bg-[var(--status-progress-bg)] border-2 border-[#C67B5C]'
          : 'bg-[#F5F0E6] hover:bg-[#E8DFD0] border-2 border-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <EditForm
              editName={editName}
              editDescription={editDescription}
              onEditNameChange={onEditNameChange}
              onEditDescriptionChange={onEditDescriptionChange}
              onSave={onSaveEditing}
              onCancel={onCancelEditing}
            />
          ) : (
            <>
              <span className="font-semibold text-sm text-[#3E2723] block truncate">
                {project.name}
              </span>
              {project.description && (
                <p className="text-xs text-[#7D6B5D] line-clamp-1 mt-0.5">{project.description}</p>
              )}
            </>
          )}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {project.isGuest && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[#F5F0E6] text-[#7D6B5D]">
                <User className="w-2.5 h-2.5" />
                Local
              </span>
            )}
            <StatusBadge status={project.status} size="sm" />
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition">
          {!isEditing && (
            <button
              onClick={onStartEditing}
              className="p-1 hover:bg-[var(--status-research-bg)] rounded transition"
              title="Edit project"
              aria-label="Edit project"
            >
              <Edit2 className="w-4 h-4 text-[#5D7B93]" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 hover:bg-[var(--status-progress-bg)] rounded transition"
            title="Delete project"
            aria-label="Delete project"
          >
            <Trash2 className="w-4 h-4 text-[#B8593B]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function GuestBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#F5F0E6] text-[#7D6B5D]">
      <User className="w-3 h-3" />
      Local
    </span>
  );
}


function EditForm({
  editName,
  editDescription,
  onEditNameChange,
  onEditDescriptionChange,
  onSave,
  onCancel,
  isMobile = false,
}: {
  editName: string;
  editDescription: string;
  onEditNameChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onSave: (e: React.SyntheticEvent) => void;
  onCancel: (e: React.SyntheticEvent) => void;
  isMobile?: boolean;
}) {
  return (
    <div className={`space-y-${isMobile ? '2' : '1'} ${isMobile ? 'ml-6' : ''}`} onClick={e => e.stopPropagation()}>
      <TextInput
        type="text"
        value={editName}
        onChange={(e) => onEditNameChange(e.target.value)}
        inputSize={isMobile ? 'md' : 'sm'}
        fullWidth
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(e);
          if (e.key === 'Escape') onCancel(e);
        }}
      />
      <TextInput
        type="text"
        value={editDescription}
        onChange={(e) => onEditDescriptionChange(e.target.value)}
        placeholder="Description (optional)"
        inputSize={isMobile ? 'md' : 'sm'}
        fullWidth
        className="text-xs"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(e);
          if (e.key === 'Escape') onCancel(e);
        }}
      />
      <div className={`flex gap-${isMobile ? '2' : '1'}`}>
        <Button variant="secondary" size={isMobile ? 'sm' : 'xs'} onClick={onSave}>
          Save
        </Button>
        <Button variant="ghost" size={isMobile ? 'sm' : 'xs'} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
