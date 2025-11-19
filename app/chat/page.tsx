'use client';

import { useEffect, useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import Link from 'next/link';
import { Home, Wrench, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthButton from '@/components/AuthButton';

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        loadProjects(user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProjects(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProjects = async (userId: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (data) setProjects(data);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {user && (
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg mb-4">My Projects</h2>
            <button
              onClick={() => setSelectedProject(null)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
            >
              + New Project
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project.id)}
                className={`w-full text-left p-3 rounded-lg transition ${
                  selectedProject === project.id
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-sm">{project.name}</span>
                </div>
                {project.description && (
                  <p className="text-xs text-gray-500 truncate">{project.description}</p>
                )}
              </button>
            ))}

            {projects.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                No projects yet. Start chatting to create one!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
                <Wrench className="w-6 h-6 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">DIY Helper</span>
              </Link>
              
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition">
                  <Home className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Home</span>
                </Link>
                <AuthButton user={user} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <ChatInterface 
            user={user} 
            projectId={selectedProject}
            onProjectCreated={(projectId) => {
              setSelectedProject(projectId);
              if (user) loadProjects(user.id);
            }}
          />
        </div>
      </div>
    </div>
  );
}