'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AppHeader from '@/components/AppHeader';
import ShoppingListView from '@/components/ShoppingListView';
import EmptyState from '@/components/ui/EmptyState';
import { ShoppingCart, ChevronLeft } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
}

export default function ShoppingPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const loadProjects = async (userId: string) => {
    const { data } = await supabase
      .from('projects').select('id, name, description')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setProjects(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ? { id: session.user.id } : null;
      setUser(u);
      setLoaded(true);
      if (u) loadProjects(u.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ? { id: session.user.id } : null;
      setUser(u);
      if (u) loadProjects(u.id);
      else setProjects([]);
    });
    return () => subscription.unsubscribe();
  }, []);
  if (loaded && !user) {
    return (
      <div className="min-h-screen bg-earth-night flex flex-col">
        <AppHeader />
        <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
          <h1 className="font-serif font-normal text-2xl text-white mb-6">Shopping</h1>
          <EmptyState icon={ShoppingCart} title="Sign in to view your shopping lists" description="Track materials and compare prices across your projects" className="py-16" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-night flex flex-col">
      <AppHeader />
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          {selectedProject && (
            <button
              onClick={() => setSelectedProject(null)}
              className="p-1.5 text-white/40 hover:text-white transition-colors"
              aria-label="Back to projects"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <h1 className="font-serif font-normal text-2xl text-white">
            {selectedProject ? selectedProject.name : 'Shopping'}
          </h1>
        </div>

        {selectedProject ? (
          <ShoppingListView project={selectedProject} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No shopping lists yet"
            description="Start a chat, ask for a materials list, then save it to a project."
            className="py-16"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p)}
                className="text-left px-4 py-4 bg-[var(--earth-brown-dark)] border border-white/[0.08] hover:border-[var(--rust)] transition-colors"
              >
                <p className="font-medium text-white" style={{ fontSize: 14 }}>{p.name}</p>
                {p.description && (
                  <p className="text-xs text-[var(--muted)] mt-1 truncate">{p.description}</p>
                )}
                <p className="text-xs text-white/30 mt-2">View shopping list →</p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
