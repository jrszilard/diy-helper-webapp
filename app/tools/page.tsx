'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AppHeader from '@/components/AppHeader';
import InventoryPanel from '@/components/InventoryPanel';
import EmptyState from '@/components/ui/EmptyState';
import { Package } from 'lucide-react';

export default function ToolsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setLoaded(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-earth-night flex flex-col">
      <AppHeader />
      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-6 py-8">
        <h1 className="font-serif font-normal text-2xl text-white mb-6">My Tools</h1>
        {loaded && !userId ? (
          <EmptyState icon={Package} title="Sign in to access your tool inventory" description="Your tools will be saved across sessions" className="py-16" />
        ) : userId ? (
          <InventoryPanel userId={userId} standalone />
        ) : null}
      </main>
    </div>
  );
}
