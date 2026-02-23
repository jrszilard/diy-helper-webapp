'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ExpertRegistrationForm from '@/components/marketplace/ExpertRegistrationForm';
import { Wrench, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ExpertRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/chat');
        return;
      }
      setAuthenticated(true);

      // Check if already registered
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch('/api/experts/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.expert) {
            router.push('/experts/dashboard');
            return;
          }
        }
      } catch {
        // not registered, continue
      }

      setLoading(false);
    }
    check();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="bg-[#FDFBF7] border-b border-[#D4C8B8] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-[#C67B5C] to-[#A65D3F] p-1.5 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#3E2723]">DIY Helper</span>
          </Link>
          <h1 className="text-sm font-semibold text-[#7D6B5D]">Expert Registration</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#3E2723]">Become an Expert</h1>
          <p className="text-sm text-[#7D6B5D] mt-2">
            Share your expertise with DIYers and earn money answering questions.
          </p>
        </div>
        <ExpertRegistrationForm />
      </main>
    </div>
  );
}
