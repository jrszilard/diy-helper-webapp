'use client';

import { useEffect, useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import ProjectsSidebar from '@/components/ProjectsSidebar';
import ShoppingListView from '@/components/ShoppingListView';
import Link from 'next/link';
import { Home, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthButton from '@/components/AuthButton';
import InventoryPanel from '@/components/InventoryPanel';
import { Package } from 'lucide-react';

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const [showInventory, setShowInventory] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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
                <Link href="/" className="flex items-center gap-2 text-gray-900 hover:text-blue-600 transition">
                  <Home className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Home</span>
                </Link>
                <AuthButton
                  user={user}
                  externalShowAuth={showAuthModal}
                  onAuthToggle={setShowAuthModal}
                />
                <button
                  onClick={() => setShowInventory(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  title="View your tool inventory"
                >
                  <Package size={18} />
                  <span className="hidden sm:inline">My Tools</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              userId={user?.id}
              projectId={selectedProject?.id}
              onProjectLinked={handleProjectLinked}
              onRequestAuth={() => setShowAuthModal(true)}
            />
          </div>
          
          {selectedProject && (
            <div className="w-96 bg-gray-50 border-l overflow-y-auto">
              <ShoppingListView project={selectedProject} />
            </div>
          )}
        </div>
      </div>
        <InventoryPanel
          userId={user?.id}
          isOpen={showInventory}
          onClose={() => setShowInventory(false)}
        />
    </div>
  );
}