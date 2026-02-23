'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ExpertRegistrationForm from '@/components/marketplace/ExpertRegistrationForm';
import AuthButton from '@/components/AuthButton';
import { Wrench, Loader2, DollarSign, Award, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ExpertRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

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
        // User is authenticated, check expert status
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

  const header = (
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
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        {header}
        <div className="flex items-center justify-center py-32">
          <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
        </div>
      </div>
    );
  }

  // Authenticated + ready for registration
  if (user && showRegistration) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        {header}
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

  // Unauthenticated — show value prop + sign-in CTA
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {header}

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#C67B5C] to-[#A65D3F] rounded-2xl mb-4 shadow-lg">
            <Award className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#3E2723] mb-3">
            Become an Expert on DIY Helper
          </h1>
          <p className="text-lg text-[#5C4D42] max-w-xl mx-auto">
            Share your trade knowledge, help DIYers succeed, and earn money on your own schedule.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid sm:grid-cols-3 gap-6 mb-10">
          {[
            {
              icon: DollarSign,
              title: 'Answer Questions & Earn',
              desc: 'Get paid for sharing your expertise. Answer DIY questions and provide consultations.',
              color: 'from-[#4A7C59] to-[#2D5A3B]',
            },
            {
              icon: Award,
              title: 'Build Your Reputation',
              desc: 'Earn verified reviews and ratings from satisfied DIYers. Stand out in your specialty.',
              color: 'from-[#C67B5C] to-[#A65D3F]',
            },
            {
              icon: CheckCircle,
              title: 'Set Your Terms',
              desc: 'Choose your own rates, availability, and areas of expertise. Work when it suits you.',
              color: 'from-[#5D7B93] to-[#4A6275]',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border border-[#E8DFD0] text-center"
            >
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${item.color} mb-4 shadow-lg`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-[#3E2723] mb-2">{item.title}</h3>
              <p className="text-sm text-[#5C4D42] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E8DFD0] mb-10">
          <h2 className="text-xl font-bold text-[#3E2723] mb-6 text-center">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Create your account', desc: 'Sign up for free and complete your expert profile.' },
              { step: '2', title: 'Get verified', desc: 'We review your credentials and activate your expert status.' },
              { step: '3', title: 'Start earning', desc: 'Answer questions, offer consultations, and get paid.' },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#C67B5C] text-white font-bold text-sm mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold text-[#3E2723] mb-1">{item.title}</h3>
                <p className="text-sm text-[#5C4D42]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sign-in CTA */}
        <div className="text-center bg-gradient-to-br from-[#C67B5C] via-[#B8593B] to-[#A65D3F] rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }} />
          <div className="relative">
            <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
            <p className="text-white/90 mb-6">
              Sign in or create an account to begin your expert registration.
            </p>
            <div className="inline-block">
              <AuthButton
                user={user}
                externalShowAuth={showAuth}
                onAuthToggle={setShowAuth}
              />
            </div>
            {!showAuth && (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-2 mx-auto mt-4 text-sm text-white/80 hover:text-white transition-colors"
              >
                <span>Sign in to continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Browse link */}
        <p className="text-center mt-6 text-sm text-[#7D6B5D]">
          Just looking?{' '}
          <Link href="/experts" className="text-[#C67B5C] hover:underline">
            Browse the expert directory →
          </Link>
        </p>
      </main>
    </div>
  );
}
