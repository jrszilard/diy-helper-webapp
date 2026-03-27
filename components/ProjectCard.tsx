'use client';

import React from 'react';
import { Trash2, Edit2, User } from 'lucide-react';
import { Project } from '@/types';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import StatusBadge from '@/components/ui/StatusBadge';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import IconButton from '@/components/ui/IconButton';

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
      <Card
        padding="md"
        rounded="xl"
        onClick={onSelect}
        className={cn(
          'cursor-pointer transition active:scale-[0.98]',
          isSelected
            ? 'bg-terracotta/15 border-terracotta'
            : 'bg-white/5 border-transparent active:bg-white/10',
        )}
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
                  <span className="text-[var(--earth-sand)]">{categoryIcon}</span>
                  <span className="font-semibold text-base truncate text-white">{project.name}</span>
                </div>
                {project.description && (
                  <p className="text-sm text-[var(--earth-sand)]/70 line-clamp-2 ml-6">{project.description}</p>
                )}
              </>
            )}
            <div className="flex items-center gap-2 mt-2 ml-6 flex-wrap">
              {project.isGuest && (
                <Badge icon={User} size="sm" className="bg-white/10 text-[var(--earth-sand)]">Local</Badge>
              )}
              <StatusBadge status={project.status} />
              <span className="text-xs text-[var(--earth-sand)]/50">
                {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            {!isEditing && (
              <IconButton
                icon={Edit2}
                iconSize={20}
                label="Edit project"
                onClick={onStartEditing}
                className="hover:bg-white/10 text-[var(--earth-sand)]"
              />
            )}
            <IconButton
              icon={Trash2}
              iconSize={20}
              label="Delete project"
              onClick={onDelete}
              className="hover:bg-white/10 text-rust"
            />
          </div>
        </div>
      </Card>
    );
  }

  // Desktop view
  return (
    <Card
      padding="sm"
      rounded="lg"
      onClick={onSelect}
      className={cn(
        'group cursor-pointer transition',
        isSelected
          ? 'bg-terracotta/15 border-terracotta'
          : 'bg-white/5 border-transparent hover:bg-white/10',
      )}
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
              <span className="font-semibold text-sm text-white block truncate">
                {project.name}
              </span>
              {project.description && (
                <p className="text-xs text-[var(--earth-sand)]/70 line-clamp-1 mt-0.5">{project.description}</p>
              )}
            </>
          )}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {project.isGuest && (
              <Badge icon={User} size="sm" className="bg-white/10 text-[var(--earth-sand)]">Local</Badge>
            )}
            <StatusBadge status={project.status} size="sm" />
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition">
          {!isEditing && (
            <IconButton
              icon={Edit2}
              iconSize={16}
              label="Edit project"
              onClick={onStartEditing}
              className="hover:bg-white/10 text-[var(--earth-sand)]"
            />
          )}
          <IconButton
            icon={Trash2}
            iconSize={16}
            label="Delete project"
            onClick={onDelete}
            className="hover:bg-white/10 text-rust"
          />
        </div>
      </div>
    </Card>
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
        className="bg-white/10 text-white border-white/20"
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
        className="text-xs bg-white/10 text-white border-white/20"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(e);
          if (e.key === 'Escape') onCancel(e);
        }}
      />
      <div className={`flex gap-${isMobile ? '2' : '1'}`}>
        <Button variant="secondary" size={isMobile ? 'sm' : 'xs'} onClick={onSave}>
          Save
        </Button>
        <Button variant="ghost" size={isMobile ? 'sm' : 'xs'} onClick={onCancel} className="text-[var(--earth-sand)] hover:bg-white/10 hover:text-white">
          Cancel
        </Button>
      </div>
    </div>
  );
}
