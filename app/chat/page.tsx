'use client';

import { useEffect, useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import ProjectsSidebar from '@/components/ProjectsSidebar';
import ShoppingListView from '@/components/ShoppingListView';
import Link from 'next/link';
import { Home, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthButton from '@/components/AuthButton';

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleProjectLinked = (projectId: string) => {
    // When chat links to a project, update the selected project
    // This will show the shopping list sidebar
    supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
      .then(({ data }) => {
        if (data) setSelectedProject(data);
      });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {user && (
        <ProjectsSidebar 
          user={user} 
          onSelectProject={setSelectedProject} 
        />
      )}

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

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-hidden">
            <ChatInterface 
              projectId={selectedProject?.id}
              onProjectLinked={handleProjectLinked}
            />
          </div>
          
          {selectedProject && (
            <div className="w-96 bg-gray-50 border-l overflow-y-auto">
              <ShoppingListView project={selectedProject} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}