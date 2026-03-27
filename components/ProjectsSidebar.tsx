'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { guestStorage } from '@/lib/guestStorage';
import { cn } from '@/lib/utils';
import TextInput from '@/components/ui/TextInput';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import {
  FolderOpen,
  Search,
  Filter,
  ChevronDown,
  Zap,
  Droplets,
  Hammer,
  PaintBucket,
  Fence,
  LayoutGrid,
} from 'lucide-react';
import { Project } from '@/types';
import ProjectCard from './ProjectCard';
import EmptyState from '@/components/ui/EmptyState';

interface ProjectsSidebarProps {
  user: { id: string; email?: string } | null;
  onSelectProject: (project: Project | null) => void;
  isMobile?: boolean;
  refreshTrigger?: number;
}

// Auto-categorize based on project name
function categorizeProject(name: string): string {
  const patterns: [string, RegExp][] = [
    ['electrical', /outlet|wire|circuit|switch|light|fan|electrical|panel|breaker|socket|volt/i],
    ['flooring', /tile|floor|carpet|laminate|hardwood|vinyl|grout/i],
    ['plumbing', /pipe|faucet|toilet|sink|drain|shower|bath|plumb/i],
    ['structural', /wall|beam|joist|foundation|drywall|frame|stud|ceiling/i],
    ['painting', /paint|prime|stain|finish|coat|brush|roller/i],
    ['outdoor', /deck|fence|patio|garden|landscap|yard|outdoor|pergola|shed/i],
  ];
  for (const [category, pattern] of patterns) {
    if (pattern.test(name)) return category;
  }
  return 'other';
}

function getCategoryIcon(category: string) {
  const icons: Record<string, React.ReactNode> = {
    electrical: <Zap className="w-4 h-4" />,
    plumbing: <Droplets className="w-4 h-4" />,
    structural: <Hammer className="w-4 h-4" />,
    flooring: <LayoutGrid className="w-4 h-4" />,
    painting: <PaintBucket className="w-4 h-4" />,
    outdoor: <Fence className="w-4 h-4" />,
    other: <FolderOpen className="w-4 h-4" />
  };
  return icons[category] || icons.other;
}


const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'research', label: 'Research' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_parts', label: 'Waiting on Parts' },
  { value: 'completed', label: 'Completed' }
];

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'structural', label: 'Structural' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'painting', label: 'Painting' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'other', label: 'Other' }
];

export default function ProjectsSidebar({ user, onSelectProject, isMobile = false, refreshTrigger = 0 }: ProjectsSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (user) loadProjects();
    else loadGuestProjects();
  }, [user, refreshTrigger]);

  const loadGuestProjects = () => {
    const guestProjects = guestStorage.getProjects();
    setProjects(guestProjects.map(p => ({
      id: p.id, name: p.name, description: p.description,
      created_at: p.createdAt, category: categorizeProject(p.name),
      status: 'research', isGuest: true, materials: p.materials
    })));
  };

  const loadProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('projects').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) {
      setProjects(data.map(project => ({
        ...project,
        category: project.category || categorizeProject(project.name),
        status: project.status || 'research'
      })));
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent, isGuest: boolean = false) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    if (isGuest) { guestStorage.deleteProject(id); loadGuestProjects(); }
    else { await supabase.from('projects').delete().eq('id', id); loadProjects(); }
    if (selectedId === id) { setSelectedId(null); onSelectProject(null); }
  };

  const startEditing = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project.id);
    setEditName(project.name);
    setEditDescription(project.description || '');
  };

  const cancelEditing = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setEditingProject(null);
    setEditName('');
    setEditDescription('');
  };

  const saveEditing = async (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (!editName.trim()) return;
    if (projects.find(p => p.id === id)?.isGuest) {
      guestStorage.updateProject(id, { name: editName.trim(), description: editDescription.trim() });
      loadGuestProjects();
    } else {
      await supabase.from('projects')
        .update({ name: editName.trim(), description: editDescription.trim() })
        .eq('id', id);
      loadProjects();
    }
    setEditingProject(null);
  };

  const selectProject = (project: Project) => {
    setSelectedId(project.id);
    onSelectProject(project);
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!project.name.toLowerCase().includes(query) &&
            !project.description?.toLowerCase().includes(query)) return false;
      }
      if (statusFilter !== 'all' && project.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && project.category !== categoryFilter) return false;
      return true;
    });
  }, [projects, searchQuery, statusFilter, categoryFilter]);

  const groupedProjects = useMemo(() => {
    const groups: Record<string, Project[]> = {};
    filteredProjects.forEach(project => {
      const category = project.category || 'other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(project);
    });
    return groups;
  }, [filteredProjects]);

  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all';

  // Shared search + filter UI
  const darkInput = !isMobile ? 'bg-white/10 text-white border-white/20 placeholder-white/40' : '';
  const searchAndFilters = (
    <>
      <TextInput
        type="text"
        placeholder={isMobile ? 'Search projects...' : 'Search...'}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leftIcon={Search}
        inputSize={isMobile ? 'md' : 'sm'}
        fullWidth
        aria-label="Search projects"
        className={darkInput}
      />

      <Button
        variant="ghost"
        size={isMobile ? 'sm' : 'xs'}
        onClick={() => setShowFilters(!showFilters)}
        aria-label="Toggle filters"
        aria-expanded={showFilters}
        className={cn(
          isMobile
            ? hasActiveFilters ? 'text-terracotta' : 'text-earth-brown'
            : hasActiveFilters ? 'text-terracotta hover:text-terracotta hover:bg-white/10' : 'text-[var(--earth-sand)]/70 hover:text-white hover:bg-white/10',
        )}
      >
        <Filter className={`w-${isMobile ? '4' : '3'} h-${isMobile ? '4' : '3'}`} />
        Filters
        {hasActiveFilters && (
          <span className="bg-terracotta text-white text-xs px-1.5 py-0.5 rounded-full">
            {(statusFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0)}
          </span>
        )}
        <ChevronDown className={`w-${isMobile ? '4' : '3'} h-${isMobile ? '4' : '3'} transition-transform ${showFilters ? 'rotate-180' : ''}`} />
      </Button>

      {showFilters && (
        <div className={isMobile ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            inputSize={isMobile ? 'md' : 'sm'}
            fullWidth={!isMobile}
            className={darkInput}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            inputSize={isMobile ? 'md' : 'sm'}
            fullWidth={!isMobile}
            className={darkInput}
          >
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
      )}
    </>
  );

  const emptyState = (
    <EmptyState
      icon={FolderOpen}
      iconSize={isMobile ? 64 : 48}
      iconClassName="opacity-50"
      title={searchQuery || hasActiveFilters ? 'No matching projects' : 'No projects yet'}
      description={searchQuery || hasActiveFilters ? 'Try different filters' : 'Save your first conversation!'}
      className={isMobile ? 'py-12' : 'py-8'}
    />
  );

  const renderProjectCard = (project: Project) => (
    <ProjectCard
      key={project.id}
      project={project}
      isSelected={selectedId === project.id}
      isMobile={isMobile}
      isEditing={editingProject === project.id}
      editName={editName}
      editDescription={editDescription}

      categoryIcon={getCategoryIcon(project.category || 'other')}
      onSelect={() => selectProject(project)}
      onStartEditing={(e) => startEditing(project, e)}
      onSaveEditing={(e) => saveEditing(project.id, e)}
      onCancelEditing={cancelEditing}
      onDelete={(e) => deleteProject(project.id, e, project.isGuest)}
      onEditNameChange={setEditName}
      onEditDescriptionChange={setEditDescription}
    />
  );

  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3 bg-[#1A1612] border-b border-[var(--blueprint-grid-major)] sticky top-0 z-10">
          {searchAndFilters}
        </div>
        <div className="p-4 space-y-3">
          {filteredProjects.length === 0 ? emptyState : filteredProjects.map(renderProjectCard)}
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="w-64 bg-[#1A1612] border-r border-[var(--blueprint-grid-major)] flex flex-col h-full">
      <div className="p-4 border-b border-[var(--blueprint-grid-major)]">
        <h2 className="font-bold text-lg text-white">My Projects</h2>
        <p className="text-xs text-[var(--earth-sand)]/60 mt-1">Saved conversations</p>
      </div>

      <div className="p-3 border-b border-[var(--blueprint-grid-major)]">
        {searchAndFilters}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.keys(groupedProjects).length === 0 ? emptyState : (
          Object.entries(groupedProjects).map(([category, categoryProjects]) => (
            <div key={category}>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--earth-sand)]/60 uppercase tracking-wide mb-2">
                {getCategoryIcon(category)}
                <span>{category}</span>
                <span className="text-white/30">({categoryProjects.length})</span>
              </div>
              <div className="space-y-2">
                {categoryProjects.map(renderProjectCard)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
