'use client';

import { useEffect, useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import ProjectsSidebar from '@/components/ProjectsSidebar';
import ShoppingListView from '@/components/ShoppingListView';
import { FolderOpen, ShoppingCart, X, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { guestStorage } from '@/lib/guestStorage';
import { Project } from '@/types';
import type { User } from '@supabase/supabase-js';
import AppHeader from '@/components/AppHeader';
import Button from '@/components/ui/Button';

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectRefreshTrigger, setProjectRefreshTrigger] = useState(0);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [migrationToast, setMigrationToast] = useState<string | null>(null);
  const [showMobileShopping, setShowMobileShopping] = useState(false);

  useEffect(() => {
    const storedProjectId = sessionStorage.getItem('diy-helper-project-id');
    if (storedProjectId) {
      sessionStorage.removeItem('diy-helper-project-id');
      supabase.from('projects').select('*').eq('id', storedProjectId).single()
        .then(({ data }) => { if (data) setSelectedProject(data); });
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);

      // Trigger guest-to-auth migration when user signs in
      if (newUser && _event === 'SIGNED_IN') {
        if (guestStorage.hasProjects()) {
          try {
            const result = await guestStorage.migrateToUser(newUser.id, supabase);
            if (result.migrated > 0) {
              const msg = result.partialMigration
                ? `Migrated ${result.migrated} project${result.migrated > 1 ? 's' : ''}, but ${result.failed} failed. Local copies preserved.`
                : `Migrated ${result.migrated} project${result.migrated > 1 ? 's' : ''} to your account`;
              setMigrationToast(msg);
              setTimeout(() => setMigrationToast(null), 5000);
            }
            if (result.failed > 0) {
              console.error(`Failed to migrate ${result.failed} project(s)`);
            }
          } catch (err) {
            console.error('Migration error:', err);
          }
        }

        // Redirect to Q&A if user signed up via expert callout
        const referral = localStorage.getItem('expert-callout-referral');
        if (referral) {
          localStorage.removeItem('expert-callout-referral');
          router.push('/marketplace/qa');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleProjectLinked = (projectId: string) => {
    // When chat links to a project, update the selected project + refresh sidebar
    setProjectRefreshTrigger(prev => prev + 1);

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

  const handleSelectProject = (project: Project | null) => {
    setSelectedProject(project);
  };

  const closeMobilePanels = () => {
    setShowMobileShopping(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--earth-brown-dark)]">
      {/* Migration Toast */}
      {migrationToast && (
        <div className="fixed top-20 right-4 bg-forest-green text-white px-4 py-3 rounded-lg shadow-lg z-[60] flex items-center gap-3 animate-slide-in max-w-sm">
          <Package size={20} className="flex-shrink-0" />
          <p className="font-medium text-sm">{migrationToast}</p>
          <button
            onClick={() => setMigrationToast(null)}
            className="ml-2 hover:bg-forest-green-dark p-1 rounded flex-shrink-0"
            aria-label="Dismiss migration notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mobile Shopping List Overlay */}
      {showMobileShopping && selectedProject && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={closeMobilePanels} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-surface shadow-xl animate-slide-in-right overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-earth-sand bg-forest-green text-white z-10">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} />
                <h2 className="font-bold text-lg">Shopping List</h2>
              </div>
              <button
                onClick={() => setShowMobileShopping(false)}
                className="p-2 hover:bg-forest-green-dark rounded-lg transition-colors"
                aria-label="Close shopping list"
              >
                <X size={20} />
              </button>
            </div>
            <ShoppingListView project={selectedProject} isMobile={true} />
          </div>
        </div>
      )}

      <AppHeader
        onProjectSelect={handleSelectProject}
        projectsRefreshTrigger={projectRefreshTrigger}
        extraRight={selectedProject ? (
          <button
            onClick={() => setShowMobileShopping(true)}
            className="md:hidden relative p-2 text-[var(--earth-sand)] hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Shopping List"
            aria-label="Shopping List"
          >
            <ShoppingCart size={22} />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-forest-green text-white text-xs rounded-full flex items-center justify-center font-medium">!</span>
          </button>
        ) : undefined}
      />

      {/* Content row: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Projects Sidebar */}
        <div className="hidden md:block">
          <ProjectsSidebar
            user={user}
            onSelectProject={handleSelectProject}
            refreshTrigger={projectRefreshTrigger}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile context bar */}
          {selectedProject && (
            <div className="md:hidden border-b border-[var(--blueprint-grid-major)] px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="w-4 h-4 text-[var(--earth-sand)] flex-shrink-0" />
                <span className="text-sm font-medium text-white truncate">{selectedProject.name}</span>
              </div>
              <button
                onClick={() => setShowMobileShopping(true)}
                className="flex items-center gap-1 text-xs text-[var(--earth-sand)] font-medium flex-shrink-0"
              >
                <ShoppingCart size={14} />
                View List
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                userId={user?.id ?? ''}
                projectId={selectedProject?.id}
                onProjectLinked={handleProjectLinked}
                onRequestAuth={() => setShowAuthModal(true)}
              />
            </div>

            {/* Desktop Shopping List Sidebar */}
            {selectedProject && (
              <div className="hidden md:block w-80 lg:w-96 bg-surface border-l border-earth-sand overflow-y-auto flex-shrink-0">
                <ShoppingListView project={selectedProject} />
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
