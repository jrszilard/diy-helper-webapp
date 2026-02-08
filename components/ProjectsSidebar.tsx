'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { guestStorage } from '@/lib/guestStorage';
import {
  FolderOpen,
  Trash2,
  Edit2,
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
  User
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  category?: string;
  status?: string;
  isGuest?: boolean; // Flag to identify guest projects
  materials?: any[]; // For guest projects
}

interface ProjectsSidebarProps {
  user: any;
  onSelectProject: (project: any) => void;
  isMobile?: boolean;
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

// Get category icon
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

// Get status color and icon - updated with earthy colors
function getStatusStyle(status: string) {
  const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    research: {
      bg: 'bg-[#E8F0F5]',
      text: 'text-[#5D7B93]',
      icon: <FlaskConical className="w-3 h-3" />
    },
    in_progress: {
      bg: 'bg-[#FDF3ED]',
      text: 'text-[#C67B5C]',
      icon: <Clock className="w-3 h-3" />
    },
    waiting_parts: {
      bg: 'bg-[#F3EDF5]',
      text: 'text-[#9B7BA6]',
      icon: <Package className="w-3 h-3" />
    },
    completed: {
      bg: 'bg-[#E8F3EC]',
      text: 'text-[#4A7C59]',
      icon: <CheckCircle2 className="w-3 h-3" />
    }
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

export default function ProjectsSidebar({ user, onSelectProject, isMobile = false }: ProjectsSidebarProps) {
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
    if (user) {
      loadProjects();
    } else {
      // Load guest projects from localStorage
      loadGuestProjects();
    }
  }, [user]);

  const loadGuestProjects = () => {
    const guestProjects = guestStorage.getProjects();
    const formattedProjects: Project[] = guestProjects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      created_at: p.createdAt,
      category: categorizeProject(p.name),
      status: 'research',
      isGuest: true,
      materials: p.materials
    }));
    setProjects(formattedProjects);
  };

  const loadProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      // Auto-categorize projects that don't have a category
      const categorizedProjects = data.map(project => ({
        ...project,
        category: project.category || categorizeProject(project.name),
        status: project.status || 'research'
      }));
      setProjects(categorizedProjects);
    }
  };

  const deleteProject = async (id: string, e: any, isGuest: boolean = false) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;

    if (isGuest) {
      guestStorage.deleteProject(id);
      loadGuestProjects();
    } else {
      await supabase.from('projects').delete().eq('id', id);
      loadProjects();
    }

    if (selectedId === id) {
      setSelectedId(null);
      onSelectProject(null);
    }
  };

  const updateProjectStatus = async (id: string, status: string, e: any) => {
    e.stopPropagation();
    await supabase
      .from('projects')
      .update({ status })
      .eq('id', id);
    loadProjects();
  };

  const startEditing = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project.id);
    setEditName(project.name);
    setEditDescription(project.description || '');
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(null);
    setEditName('');
    setEditDescription('');
  };

  const saveEditing = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editName.trim()) return;

    if (projects.find(p => p.id === id)?.isGuest) {
      // Guest project - update in localStorage
      guestStorage.updateProject(id, { name: editName.trim(), description: editDescription.trim() });
      loadGuestProjects();
    } else {
      await supabase
        .from('projects')
        .update({ name: editName.trim(), description: editDescription.trim() })
        .eq('id', id);
      loadProjects();
    }
    setEditingProject(null);
  };

  const selectProject = (project: any) => {
    setSelectedId(project.id);
    onSelectProject(project);
  };

  // Filtered and searched projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = project.name.toLowerCase().includes(query);
        const matchesDesc = project.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && project.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [projects, searchQuery, statusFilter, categoryFilter]);

  // Group projects by category
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

  // Mobile view - just the content without wrapper
  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto">
        {/* Search and Filter */}
        <div className="p-4 space-y-3 bg-[#FDFBF7] border-b border-[#D4C8B8] sticky top-0 z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89880]" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#D4C8B8] rounded-lg text-sm focus:ring-2 focus:ring-[#C67B5C] focus:border-[#C67B5C] text-[#3E2723] placeholder-[#A89880] bg-white"
              aria-label="Search projects"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 text-sm font-medium ${hasActiveFilters ? 'text-[#5D7B93]' : 'text-[#7D6B5D]'}`}
            aria-label="Toggle filters"
            aria-expanded={showFilters}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && <span className="bg-[#5D7B93] text-white text-xs px-1.5 py-0.5 rounded-full">2</span>}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-[#D4C8B8] rounded-lg text-sm focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] bg-white"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-[#D4C8B8] rounded-lg text-sm focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] bg-white"
              >
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 text-[#A89880]">
              <FolderOpen className="w-16 h-16 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium text-[#7D6B5D]">
                {searchQuery || hasActiveFilters ? 'No matching projects' : 'No projects yet'}
              </p>
              <p className="text-sm mt-1">
                {searchQuery || hasActiveFilters ? 'Try different filters' : 'Save your first conversation!'}
              </p>
            </div>
          ) : (
            filteredProjects.map((project) => {
              const statusStyle = getStatusStyle(project.status || 'research');
              return (
                <div
                  key={project.id}
                  onClick={() => selectProject(project)}
                  className={`relative p-4 rounded-xl cursor-pointer transition active:scale-[0.98] ${
                    selectedId === project.id
                      ? 'bg-[#FDF3ED] border-2 border-[#C67B5C]'
                      : 'bg-[#FDFBF7] border-2 border-transparent active:bg-[#F5F0E6]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {editingProject === project.id ? (
                        <div className="space-y-2 ml-6" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg text-sm focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] bg-white"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg text-xs focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] placeholder-[#A89880] bg-white"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => saveEditing(project.id, e)}
                              className="px-3 py-1.5 text-sm bg-[#4A7C59] text-white rounded-lg hover:bg-[#2D5A3B]"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-3 py-1.5 text-sm bg-[#E8DFD0] text-[#5C4D42] rounded-lg hover:bg-[#D4C8B8]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[#5D7B93]">
                              {getCategoryIcon(project.category || 'other')}
                            </span>
                            <span className="font-semibold text-base truncate text-[#3E2723]">{project.name}</span>
                          </div>
                          {project.description && (
                            <p className="text-sm text-[#7D6B5D] line-clamp-2 ml-6">{project.description}</p>
                          )}
                        </>
                      )}
                      <div className="flex items-center gap-2 mt-2 ml-6 flex-wrap">
                        {project.isGuest && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#F5F0E6] text-[#7D6B5D]">
                            <User className="w-3 h-3" />
                            Local
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.icon}
                          {project.status?.replace('_', ' ') || 'Research'}
                        </span>
                        <span className="text-xs text-[#A89880]">
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {editingProject !== project.id && (
                        <button
                          onClick={(e) => startEditing(project, e)}
                          className="p-2 hover:bg-[#E8F0F5] active:bg-[#D4E4ED] rounded-lg transition"
                          title="Edit project"
                          aria-label="Edit project"
                        >
                          <Edit2 className="w-5 h-5 text-[#5D7B93]" />
                        </button>
                      )}
                      <button
                        onClick={(e) => deleteProject(project.id, e, project.isGuest)}
                        className="p-2 hover:bg-[#FDF3ED] active:bg-[#FADDD0] rounded-lg transition"
                        title="Delete project"
                        aria-label="Delete project"
                      >
                        <Trash2 className="w-5 h-5 text-[#B8593B]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Desktop view - enhanced layout with grouping
  return (
    <div className="w-64 bg-[#FDFBF7] border-r border-[#D4C8B8] flex flex-col h-full">
      <div className="p-4 border-b border-[#D4C8B8]">
        <h2 className="font-bold text-lg text-[#3E2723]">My Projects</h2>
        <p className="text-xs text-[#7D6B5D] mt-1">Saved conversations</p>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-[#D4C8B8]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89880]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-[#D4C8B8] rounded-lg text-sm focus:ring-2 focus:ring-[#C67B5C] focus:border-[#C67B5C] text-[#3E2723] placeholder-[#A89880] bg-white"
            aria-label="Search projects"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 border-b border-[#D4C8B8] bg-[#F5F0E6]">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 text-xs font-medium ${hasActiveFilters ? 'text-[#5D7B93]' : 'text-[#7D6B5D]'}`}
          aria-label="Toggle filters"
          aria-expanded={showFilters}
        >
          <Filter className="w-3 h-3" />
          Filters
          {hasActiveFilters && <span className="bg-[#5D7B93] text-white text-xs px-1 rounded-full ml-1">!</span>}
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {showFilters && (
          <div className="mt-2 space-y-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2 py-1 border border-[#D4C8B8] rounded text-xs focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] bg-white"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2 py-1 border border-[#D4C8B8] rounded text-xs focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] bg-white"
            >
              {categoryOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.keys(groupedProjects).length === 0 ? (
          <div className="text-center py-8 text-[#A89880] text-sm">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{searchQuery || hasActiveFilters ? 'No matching projects' : 'No projects yet'}</p>
            <p className="text-xs mt-1">
              {searchQuery || hasActiveFilters ? 'Try different filters' : 'Save your first conversation!'}
            </p>
          </div>
        ) : (
          Object.entries(groupedProjects).map(([category, categoryProjects]) => (
            <div key={category}>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#7D6B5D] uppercase tracking-wide mb-2">
                {getCategoryIcon(category)}
                <span>{category}</span>
                <span className="text-[#A89880]">({categoryProjects.length})</span>
              </div>
              <div className="space-y-2">
                {categoryProjects.map((project) => {
                  const statusStyle = getStatusStyle(project.status || 'research');
                  return (
                    <div
                      key={project.id}
                      onClick={() => selectProject(project)}
                      className={`group relative p-3 rounded-lg cursor-pointer transition ${
                        selectedId === project.id
                          ? 'bg-[#FDF3ED] border-2 border-[#C67B5C]'
                          : 'bg-[#F5F0E6] hover:bg-[#E8DFD0] border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {editingProject === project.id ? (
                            <div className="space-y-1" onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-[#D4C8B8] rounded focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] bg-white"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditing(project.id, e as any);
                                  if (e.key === 'Escape') cancelEditing(e as any);
                                }}
                              />
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Description (optional)"
                                className="w-full px-2 py-1 text-xs border border-[#D4C8B8] rounded focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] placeholder-[#A89880] bg-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditing(project.id, e as any);
                                  if (e.key === 'Escape') cancelEditing(e as any);
                                }}
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => saveEditing(project.id, e)}
                                  className="px-2 py-0.5 text-xs bg-[#4A7C59] text-white rounded hover:bg-[#2D5A3B]"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="px-2 py-0.5 text-xs bg-[#E8DFD0] text-[#5C4D42] rounded hover:bg-[#D4C8B8]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
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
                            <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                              {statusStyle.icon}
                              {(project.status || 'research').replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition">
                          {editingProject !== project.id && (
                            <button
                              onClick={(e) => startEditing(project, e)}
                              className="p-1 hover:bg-[#E8F0F5] rounded transition"
                              title="Edit project"
                              aria-label="Edit project"
                            >
                              <Edit2 className="w-4 h-4 text-[#5D7B93]" />
                            </button>
                          )}
                          <button
                            onClick={(e) => deleteProject(project.id, e, project.isGuest)}
                            className="p-1 hover:bg-[#FDF3ED] rounded transition"
                            title="Delete project"
                            aria-label="Delete project"
                          >
                            <Trash2 className="w-4 h-4 text-[#B8593B]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
