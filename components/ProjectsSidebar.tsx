'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { guestStorage } from '@/lib/guestStorage';
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
  CheckCircle2,
  Clock,
  Package,
  FlaskConical,
} from 'lucide-react';
import { Project } from '@/types';
import ProjectCard from './ProjectCard';

interface ProjectsSidebarProps {
  user: { id: string; email?: string } | null;
  onSelectProject: (project: Project | null) => void;
  isMobile?: boolean;
  refreshTrigger?: number;
}

// Auto-categorize based on project name
function categorizeProject(name: string): string {
  const patterns: Record<string, RegExp> = {
    electrical: /outlet|wire|circuit|switch|light|fan|electrical|panel|breaker|socket|volt/i,
    plumbing: /pipe|faucet|toilet|sink|drain|water|shower|bath|plumb/i,
    structural: /wall|beam|joist|foundation|drywall|frame|stud|ceiling/i,
    flooring: /tile|floor|carpet|laminate|hardwood|vinyl|grout/i,
    painting: /paint|prime|stain|finish|coat|brush|roller/i,
    outdoor: /deck|fence|patio|garden|landscap|yard|outdoor|pergola|shed/i
  };
  for (const [category, pattern] of Object.entries(patterns)) {
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

function getStatusStyle(status: string) {
  const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    research: { bg: 'bg-[#E8F0F5]', text: 'text-[#5D7B93]', icon: <FlaskConical className="w-3 h-3" /> },
    in_progress: { bg: 'bg-[#FDF3ED]', text: 'text-[#C67B5C]', icon: <Clock className="w-3 h-3" /> },
    waiting_parts: { bg: 'bg-[#F3EDF5]', text: 'text-[#9B7BA6]', icon: <Package className="w-3 h-3" /> },
    completed: { bg: 'bg-[#E8F3EC]', text: 'text-[#4A7C59]', icon: <CheckCircle2 className="w-3 h-3" /> }
  };
  return styles[status] || styles.research;
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
  const searchAndFilters = (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89880]" />
        <input
          type="text"
          placeholder={isMobile ? 'Search projects...' : 'Search...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full pl-9 ${isMobile ? 'pr-4 py-2' : 'pr-3 py-1.5'} border border-[#D4C8B8] rounded-lg text-sm focus:ring-2 focus:ring-[#C67B5C] focus:border-[#C67B5C] text-[#3E2723] placeholder-[#A89880] bg-white`}
          aria-label="Search projects"
        />
      </div>

      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`flex items-center gap-${isMobile ? '2' : '1'} text-${isMobile ? 'sm' : 'xs'} font-medium ${hasActiveFilters ? 'text-[#5D7B93]' : 'text-[#7D6B5D]'}`}
        aria-label="Toggle filters"
        aria-expanded={showFilters}
      >
        <Filter className={`w-${isMobile ? '4' : '3'} h-${isMobile ? '4' : '3'}`} />
        Filters
        {hasActiveFilters && (
          <span className={`bg-[#5D7B93] text-white text-xs px-1${isMobile ? '.5 py-0.5' : ''} rounded-full ${isMobile ? '' : 'ml-1'}`}>
            {isMobile ? '2' : '!'}
          </span>
        )}
        <ChevronDown className={`w-${isMobile ? '4' : '3'} h-${isMobile ? '4' : '3'} transition-transform ${showFilters ? 'rotate-180' : ''}`} />
      </button>

      {showFilters && (
        <div className={isMobile ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${isMobile ? '' : 'w-full'} px-${isMobile ? '3' : '2'} py-${isMobile ? '2' : '1'} border border-[#D4C8B8] rounded${isMobile ? '-lg' : ''} text-${isMobile ? 'sm' : 'xs'} focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] bg-white`}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`${isMobile ? '' : 'w-full'} px-${isMobile ? '3' : '2'} py-${isMobile ? '2' : '1'} border border-[#D4C8B8] rounded${isMobile ? '-lg' : ''} text-${isMobile ? 'sm' : 'xs'} focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] bg-white`}
          >
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );

  const emptyState = (
    <div className={`text-center ${isMobile ? 'py-12' : 'py-8'} text-[#A89880] ${isMobile ? '' : 'text-sm'}`}>
      <FolderOpen className={`${isMobile ? 'w-16 h-16' : 'w-12 h-12'} mx-auto mb-${isMobile ? '3' : '2'} opacity-50`} />
      <p className={`${isMobile ? 'text-lg' : ''} font-medium text-[#7D6B5D]`}>
        {searchQuery || hasActiveFilters ? 'No matching projects' : 'No projects yet'}
      </p>
      <p className={`text-${isMobile ? 'sm' : 'xs'} mt-1`}>
        {searchQuery || hasActiveFilters ? 'Try different filters' : 'Save your first conversation!'}
      </p>
    </div>
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
      statusStyle={getStatusStyle(project.status || 'research')}
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
        <div className="p-4 space-y-3 bg-[#FDFBF7] border-b border-[#D4C8B8] sticky top-0 z-10">
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
    <div className="w-64 bg-[#FDFBF7] border-r border-[#D4C8B8] flex flex-col h-full">
      <div className="p-4 border-b border-[#D4C8B8]">
        <h2 className="font-bold text-lg text-[#3E2723]">My Projects</h2>
        <p className="text-xs text-[#7D6B5D] mt-1">Saved conversations</p>
      </div>

      <div className="p-3 border-b border-[#D4C8B8]">
        {searchAndFilters}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.keys(groupedProjects).length === 0 ? emptyState : (
          Object.entries(groupedProjects).map(([category, categoryProjects]) => (
            <div key={category}>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#7D6B5D] uppercase tracking-wide mb-2">
                {getCategoryIcon(category)}
                <span>{category}</span>
                <span className="text-[#A89880]">({categoryProjects.length})</span>
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
