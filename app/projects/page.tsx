'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AppHeader from '@/components/AppHeader';
import ProjectsSidebar from '@/components/ProjectsSidebar';
import type { Project } from '@/types';

export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSelectProject = (project: Project | null) => {
    if (!project) return;
    window.dispatchEvent(new CustomEvent('diy:projectSelect', { detail: project }));
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-earth-night flex flex-col">
      <AppHeader />
      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-6 py-8">
        <h1 className="font-serif font-normal text-2xl text-white mb-6">My Projects</h1>
        <div className="flex-1 flex flex-col">
          <ProjectsSidebar
            user={user}
            onSelectProject={handleSelectProject}
            isMobile={true}
          />
        </div>
      </main>
    </div>
  );
}
