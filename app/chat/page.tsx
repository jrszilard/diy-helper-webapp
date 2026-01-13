'use client';

import { useEffect, useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import ProjectsSidebar from '@/components/ProjectsSidebar';
import ShoppingListView from '@/components/ShoppingListView';
import Link from 'next/link';
import { Home, Wrench, Menu, FolderOpen, ShoppingCart, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { guestStorage } from '@/lib/guestStorage';
import AuthButton from '@/components/AuthButton';
import InventoryPanel from '@/components/InventoryPanel';
import { Package } from 'lucide-react';

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const [showInventory, setShowInventory] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Mobile panel states
  const [showMobileProjects, setShowMobileProjects] = useState(false);
  const [showMobileShopping, setShowMobileShopping] = useState(false);

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

    // First check if it's a guest project
    const guestProject = guestStorage.getProject(projectId);
    if (guestProject) {
      // Format guest project for display
      setSelectedProject({
        id: guestProject.id,
        name: guestProject.name,
        description: guestProject.description,
        created_at: guestProject.createdAt,
        isGuest: true,
        materials: guestProject.materials
      });
      return;
    }

    // Otherwise fetch from Supabase for authenticated users
    supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
      .then(({ data }) => {
        if (data) setSelectedProject(data);
      });
  };

  // Handle project selection from sidebar
  const handleSelectProject = (project: any) => {
    setSelectedProject(project);
    setShowMobileProjects(false); // Close mobile panel after selection
  };

  // Close all mobile panels when clicking overlay
  const closeMobilePanels = () => {
    setShowMobileProjects(false);
    setShowMobileShopping(false);
  };

  return (
    <div className="flex h-screen blueprint-bg-subtle">
      {/* Desktop Projects Sidebar - hidden on mobile, shown for both guests and authenticated users */}
      <div className="hidden md:block">
        <ProjectsSidebar
          user={user}
          onSelectProject={handleSelectProject}
        />
      </div>

      {/* Mobile Projects Overlay - shown for both guests and authenticated users */}
      {showMobileProjects && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[#3E2723] bg-opacity-50" onClick={closeMobilePanels} />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#FDFBF7] shadow-xl animate-slide-in-left">
            <div className="flex items-center justify-between p-4 border-b border-[#D4C8B8] bg-[#5D7B93] text-white">
              <h2 className="font-bold text-lg">{user ? 'My Projects' : 'Local Projects'}</h2>
              <button
                onClick={() => setShowMobileProjects(false)}
                className="p-2 hover:bg-[#4A6275] rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <ProjectsSidebar
              user={user}
              onSelectProject={handleSelectProject}
              isMobile={true}
            />
          </div>
        </div>
      )}

      {/* Mobile Shopping List Overlay */}
      {showMobileShopping && selectedProject && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[#3E2723] bg-opacity-50" onClick={closeMobilePanels} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#FDFBF7] shadow-xl animate-slide-in-right overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-[#D4C8B8] bg-[#4A7C59] text-white z-10">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} />
                <h2 className="font-bold text-lg">Shopping List</h2>
              </div>
              <button
                onClick={() => setShowMobileShopping(false)}
                className="p-2 hover:bg-[#2D5A3B] rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <ShoppingListView project={selectedProject} isMobile={true} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#FDFBF7] border-b border-[#D4C8B8] shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              {/* Left side: Menu button (mobile) + Logo */}
              <div className="flex items-center gap-2">
                {/* Mobile Projects Menu Button - shown for both guests and authenticated users */}
                <button
                  onClick={() => setShowMobileProjects(true)}
                  className="md:hidden p-2 text-[#7D6B5D] hover:text-[#5D7B93] hover:bg-[#E8DFD0] rounded-lg transition"
                  title={user ? "My Projects" : "Local Projects"}
                >
                  <Menu size={22} />
                </button>

                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
                  <div className="bg-gradient-to-br from-[#C67B5C] to-[#A65D3F] p-1.5 rounded-lg">
                    <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-[#3E2723] hidden xs:inline">DIY Helper</span>
                </Link>
              </div>

              {/* Right side: Actions */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Mobile Shopping Cart Button */}
                {selectedProject && (
                  <button
                    onClick={() => setShowMobileShopping(true)}
                    className="md:hidden relative p-2 text-[#7D6B5D] hover:text-[#4A7C59] hover:bg-[#E8DFD0] rounded-lg transition"
                    title="Shopping List"
                  >
                    <ShoppingCart size={22} />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#4A7C59] text-white text-xs rounded-full flex items-center justify-center font-medium">
                      !
                    </span>
                  </button>
                )}

                <Link href="/" className="flex items-center gap-2 text-[#3E2723] hover:text-[#C67B5C] transition p-2 sm:p-0">
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
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-[#4A7C59] text-white rounded-lg hover:bg-[#2D5A3B] transition"
                  title="View your tool inventory"
                >
                  <Package size={18} />
                  <span className="hidden sm:inline">My Tools</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile context bar - shows selected project */}
        {selectedProject && (
          <div className="md:hidden bg-[#E8DFD0] border-b border-[#D4C8B8] px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="w-4 h-4 text-[#5D7B93] flex-shrink-0" />
              <span className="text-sm font-medium text-[#3E2723] truncate">{selectedProject.name}</span>
            </div>
            <button
              onClick={() => setShowMobileShopping(true)}
              className="flex items-center gap-1 text-xs text-[#5D7B93] font-medium flex-shrink-0"
            >
              <ShoppingCart size={14} />
              View List
            </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              userId={user?.id}
              projectId={selectedProject?.id}
              onProjectLinked={handleProjectLinked}
              onRequestAuth={() => setShowAuthModal(true)}
            />
          </div>

          {/* Desktop Shopping List Sidebar - hidden on mobile */}
          {selectedProject && (
            <div className="hidden md:block w-80 lg:w-96 bg-[#FDFBF7] border-l border-[#D4C8B8] overflow-y-auto flex-shrink-0">
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
