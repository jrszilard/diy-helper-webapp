'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FolderOpen, Trash2 } from 'lucide-react';

interface ProjectsSidebarProps {
  user: any;
  onSelectProject: (project: any) => void;
  isMobile?: boolean;
}

export default function ProjectsSidebar({ user, onSelectProject, isMobile = false }: ProjectsSidebarProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  const loadProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setProjects(data);
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

  const selectProject = (project: any) => {
    setSelectedId(project.id);
    onSelectProject(project);
  };

  // Mobile view - just the content without wrapper
  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {projects.map((project) => (
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
                    <FolderOpen className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="font-semibold text-base truncate text-gray-900">{project.name}</span>
                  </div>
                  {project.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 ml-7">{project.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2 ml-7">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
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
          ))}

          {projects.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen className="w-16 h-16 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium text-gray-500">No projects yet</p>
              <p className="text-sm mt-1">Save your first conversation!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop view - original layout
  return (
    <div className="w-64 bg-white border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg text-gray-900">My Projects</h2>
        <p className="text-xs text-gray-500 mt-1">Saved conversations</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {projects.map((project) => (
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
                <div className="flex items-center gap-2 mb-1">
                  <FolderOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="font-semibold text-sm truncate text-gray-900">{project.name}</span>
                </div>
                {project.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{project.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(project.created_at).toLocaleDateString()}
                </p>
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
        ))}

        {projects.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No projects yet</p>
            <p className="text-xs mt-1">Save your first conversation!</p>
          </div>
        )}
      </div>
    </div>
  );
}