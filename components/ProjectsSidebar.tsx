'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  FolderOpen,
  Trash2,
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
  FlaskConical
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  category?: string;
  status?: string;
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

// Get status color and icon
function getStatusStyle(status: string) {
  const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    research: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      icon: <FlaskConical className="w-3 h-3" />
    },
    in_progress: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      icon: <Clock className="w-3 h-3" />
    },
    waiting_parts: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      icon: <Package className="w-3 h-3" />
    },
    completed: {
      bg: 'bg-green-100',
      text: 'text-green-700',
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

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

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

  const deleteProject = async (id: string, e: any) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;

    await supabase.from('projects').delete().eq('id', id);
    loadProjects();
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
        <div className="p-4 space-y-3 bg-white border-b sticky top-0 z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 text-sm font-medium ${hasActiveFilters ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">2</span>}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
            <div className="text-center py-12 text-gray-400">
              <FolderOpen className="w-16 h-16 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium text-gray-500">
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
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-transparent active:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-blue-600">
                          {getCategoryIcon(project.category || 'other')}
                        </span>
                        <span className="font-semibold text-base truncate text-gray-900">{project.name}</span>
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 ml-6">{project.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 ml-6">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.icon}
                          {project.status?.replace('_', ' ') || 'Research'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteProject(project.id, e)}
                      className="p-2 hover:bg-red-100 active:bg-red-200 rounded-lg transition"
                      title="Delete project"
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
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
    <div className="w-64 bg-white border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg text-gray-900">My Projects</h2>
        <p className="text-xs text-gray-500 mt-1">Saved conversations</p>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 border-b bg-gray-50">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 text-xs font-medium ${hasActiveFilters ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <Filter className="w-3 h-3" />
          Filters
          {hasActiveFilters && <span className="bg-blue-600 text-white text-xs px-1 rounded-full ml-1">!</span>}
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {showFilters && (
          <div className="mt-2 space-y-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-blue-500"
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
          <div className="text-center py-8 text-gray-400 text-sm">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{searchQuery || hasActiveFilters ? 'No matching projects' : 'No projects yet'}</p>
            <p className="text-xs mt-1">
              {searchQuery || hasActiveFilters ? 'Try different filters' : 'Save your first conversation!'}
            </p>
          </div>
        ) : (
          Object.entries(groupedProjects).map(([category, categoryProjects]) => (
            <div key={category}>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {getCategoryIcon(category)}
                <span>{category}</span>
                <span className="text-gray-400">({categoryProjects.length})</span>
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
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm text-gray-900 block truncate">
                            {project.name}
                          </span>
                          {project.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{project.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                              {statusStyle.icon}
                              {(project.status || 'research').replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => deleteProject(project.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition"
                          title="Delete project"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
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
