'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ExpertRegistrationForm from '@/components/marketplace/ExpertRegistrationForm';
import AuthButton from '@/components/AuthButton';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';

export default function ExpertRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);

  const checkExpertStatus = useCallback(async () => {
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
    setShowRegistration(true);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? undefined });
        checkExpertStatus();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? undefined });
        setLoading(true);
        checkExpertStatus();
      } else {
        setUser(null);
        setShowRegistration(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkExpertStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-earth-night flex items-center justify-center">
        <Spinner size="lg" className="text-rust" />
      </div>
    );
  }

  if (user && showRegistration) {
    return (
      <div className="min-h-screen bg-earth-night">
        <main className="max-w-3xl mx-auto px-4 py-[var(--space-3xl)]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-normal text-white">Expert Application</h1>
            <p className="text-sm text-white/50 mt-2">
              Tell us about your trade background and experience.
            </p>
          </div>
          <ExpertRegistrationForm />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-night">
      <main className="max-w-3xl mx-auto px-4 py-[var(--space-3xl)]">

        {/* Hero */}
        <div className="text-center mb-[var(--space-2xl)]">
          <h1 className="text-3xl font-serif font-normal text-white mb-3">
            Apply as a Trade Expert
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">
            Put your trade knowledge to work. Help homeowners navigate projects you&apos;ve done a hundred times.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              title: 'Answer questions in your trade',
              desc: 'Review project questions from homeowners and respond to the ones that fit your expertise. You choose which ones to answer.',
            },
            {
              title: 'Build a verified profile',
              desc: 'Every answered question earns a review. Your rating and response history are visible to homeowners before they reach out.',
            },
            {
              title: 'Work on your schedule',
              desc: 'Set your availability, per-question rate, and trade categories. No minimum hours or commitments required.',
            },
          ].map((item, idx) => (
            <Card key={idx} padding="lg" className="text-center flex flex-col">
              <h3 className="text-base font-serif font-normal text-white mb-2">{item.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
            </Card>
          ))}
        </div>

        {/* How it works */}
        <div className="mb-[var(--space-xl)]">
          <h2 className="text-xl font-serif font-normal text-white mb-6 text-center">How the application works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Create an account',
                desc: 'Sign up and fill out your trade background, license info, and service area.',
              },
              {
                step: '2',
                title: 'We review your application',
                desc: 'We verify your credentials and trade experience before you go live.',
              },
              {
                step: '3',
                title: 'Start answering questions',
                desc: 'Browse open questions in your trade and respond to the ones you can help with.',
              },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.08] text-white/60 font-bold text-sm mb-3">
                  {item.step}
                </div>
                <h3 className="text-sm font-serif font-normal text-white mb-1">{item.title}</h3>
                <p className="text-sm text-white/50">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sign-in CTA */}
        <div className="text-center pt-[var(--space-xl)] border-t border-white/[0.08]">
          <h2 className="text-xl font-serif font-normal text-white mb-3">Create an account to apply</h2>
          <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto">
            The application takes about 5 minutes. We&apos;ll need your trade background and license information.
          </p>
          <AuthButton user={user} />
        </div>

      </main>
    </div>
  );
}
