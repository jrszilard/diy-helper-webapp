'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  ArrowRight,
  Zap,
  BookOpen,
  ShoppingCart,
  Video,
  MapPin,
  Package,
  Ruler,
} from 'lucide-react';
import WhyDIYHelper from '@/components/WhyDIYHelper';
import ProjectTemplates from '@/components/ProjectTemplates';
import GuidedBot from '@/components/guided-bot/GuidedBot';
import AuthButton from '@/components/AuthButton';
import { supabase } from '@/lib/supabase';

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: BookOpen,
      title: "Building Codes",
      description: "Instant access to NEC, IRC, and local codes. No more searching through confusing documents.",
      color: "from-[#C67B5C] to-[#A65D3F]"
    },
    {
      icon: Video,
      title: "Video Tutorials",
      description: "Curated tutorial videos for your specific project. Learn from the pros before you start.",
      color: "from-[#B87333] to-[#8B5A2B]"
    },
    {
      icon: ShoppingCart,
      title: "Smart Shopping Lists",
      description: "Auto-generated materials lists with local store pricing. Never over-buy again.",
      color: "from-[#4A7C59] to-[#2D5A3B]"
    },
    {
      icon: Package,
      title: "Tool Inventory",
      description: "Track what you own. We'll exclude items you already have from shopping lists.",
      color: "from-[#5D7B93] to-[#4A6275]"
    },
    {
      icon: MapPin,
      title: "Local Store Finder",
      description: "Find materials at Home Depot, Lowe's, and Ace Hardware near you with real-time pricing.",
      color: "from-[#7D6B5D] to-[#5C4D42]"
    },
    {
      icon: Zap,
      title: "Smart Calculations",
      description: "Wire sizing, outlet counts, tile quantities—calculated correctly the first time.",
      color: "from-[#9B7BA6] to-[#7A5C87]"
    }
  ];

  return (
    <div className="min-h-screen blueprint-bg">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#2A2520]/95 border-b border-[#4A4238]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-[#C67B5C] blur-lg opacity-30" />
                <div className="relative bg-gradient-to-br from-[#C67B5C] to-[#A65D3F] p-2.5 rounded-xl shadow-lg shadow-[#C67B5C]/20">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                DIY Helper
              </span>
            </div>
            <div className="flex items-center gap-4">
              <AuthButton user={user} variant="dark" />
              <Link
                href="/experts"
                className="hidden md:inline-flex text-[#D4C8B8] hover:text-white font-medium transition-colors"
              >
                Find an Expert
              </Link>
              <Link
                href="/chat"
                className="hidden sm:flex items-center gap-2 text-[#D4C8B8] hover:text-white font-medium transition-colors"
              >
                <span>Open Full Chat</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/chat"
                className="bg-[#C67B5C] text-white px-5 py-2.5 rounded-xl hover:bg-[#A65D3F] font-semibold transition-all hover:shadow-lg hover:shadow-[#C67B5C]/30 hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Guided Bot */}
      <section className="relative pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Blueprint corner markers */}
        <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-white/20" />
        <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-white/20" />
        <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-white/20" />
        <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-white/20" />

        <div className="relative max-w-4xl mx-auto">
          <div className="content-card">
            <GuidedBot />
          </div>
          {/* Skip link */}
          <p className="text-center mt-4 text-sm text-[#5C4D42]">
            Already know what you need?{' '}
            <Link href="/chat" className="text-[#C67B5C] hover:underline">
              Skip to full chat →
            </Link>
          </p>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[#FDFBF7] rounded-2xl py-6 px-8 shadow-lg border border-[#E8DFD0]">
            <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16 text-[#7D6B5D]">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#3E2723]">Free</span>
                <span className="text-sm">to use</span>
              </div>
              <div className="h-8 w-px bg-[#D4C8B8] hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#3E2723]">Instant</span>
                <span className="text-sm">answers</span>
              </div>
              <div className="h-8 w-px bg-[#D4C8B8] hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#3E2723]">No signup</span>
                <span className="text-sm">required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why DIY Helper Comparison */}
      <WhyDIYHelper />

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="content-card">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <Ruler className="w-5 h-5 text-[#5D7B93]" />
                <span className="text-sm font-medium text-[#5D7B93] uppercase tracking-wider">Features</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#3E2723] mb-4">
                Everything you need to DIY with confidence
              </h2>
              <p className="text-lg text-[#5C4D42] max-w-2xl mx-auto">
                From planning to purchasing, we've got you covered
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="group relative bg-white rounded-2xl p-6 border border-[#E8DFD0] hover:border-[#C67B5C] transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-[#3E2723] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[#5C4D42] text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Demo Conversation Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#4A3F35] text-white relative overflow-hidden">
        {/* Blueprint pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              See how it works
            </h2>
            <p className="text-[#D4C8B8] text-lg">
              A real conversation with DIY Helper
            </p>
          </div>

          {/* Chat Demo */}
          <div className="bg-[#3E3530]/50 rounded-2xl p-6 sm:p-8 border border-[#5C4D42]">
            <div className="space-y-6">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-[#C67B5C] text-white rounded-2xl rounded-br-md px-5 py-3 max-w-[85%]">
                  <p>What size wire do I need for a 20-amp kitchen circuit that's 35 feet from the panel?</p>
                </div>
              </div>

              {/* Assistant message */}
              <div className="flex justify-start">
                <div className="bg-[#5C4D42] rounded-2xl rounded-bl-md px-5 py-4 max-w-[90%]">
                  <p className="mb-4">For a 20-amp circuit at 35 feet, you'll need <span className="text-[#C67B5C] font-semibold">12-gauge wire</span> per NEC 210.19.</p>

                  {/* Product card */}
                  <div className="bg-[#4A3F35]/50 rounded-xl p-4 border border-[#6B5D4F]">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-[#6B5D4F] rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                        🔌
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">Southwire 250ft 12/2 NM-B Romex</p>
                        <p className="text-sm text-[#A89880] mt-1">Copper with Ground • In Stock</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[#C67B5C] font-bold text-lg">$87.43</span>
                          <span className="text-xs text-[#A89880] bg-[#5C4D42] px-2 py-1 rounded">Home Depot</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-[#D4C8B8] text-sm">
                    Would you like me to add this to your shopping list, or see some installation videos first?
                  </p>
                </div>
              </div>
            </div>

            {/* Demo input (non-functional, just for show) */}
            <div className="mt-6 pt-6 border-t border-[#5C4D42]">
              <div
                className="bg-[#5C4D42]/50 rounded-xl px-5 py-4 text-[#A89880] cursor-pointer hover:bg-[#5C4D42] transition-colors"
                onClick={() => router.push('/chat')}
              >
                Try asking your own question...
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="content-card">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#3E2723] mb-4">
                From question to completion
              </h2>
              <p className="text-lg text-[#5C4D42]">
                A streamlined workflow designed for DIYers
              </p>
            </div>

            <div className="grid sm:grid-cols-4 gap-8">
              {[
                { step: "1", title: "Ask", desc: "Describe your project or ask a question", emoji: "💬" },
                { step: "2", title: "Learn", desc: "Get codes, tutorials, and expert guidance", emoji: "📚" },
                { step: "3", title: "Plan", desc: "Generate a complete materials list", emoji: "📋" },
                { step: "4", title: "Shop", desc: "Find the best prices at local stores", emoji: "🛒" }
              ].map((item, idx) => (
                <div key={idx} className="relative text-center">
                  {idx < 3 && (
                    <div className="hidden sm:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#C67B5C] to-transparent" />
                  )}
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl text-3xl mb-4 border border-[#E8DFD0] shadow-sm">
                    {item.emoji}
                  </div>
                  <div className="text-xs font-bold text-[#C67B5C] mb-1">STEP {item.step}</div>
                  <h3 className="text-lg font-bold text-[#3E2723] mb-1">{item.title}</h3>
                  <p className="text-sm text-[#5C4D42]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Project Templates Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="content-card">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#3E2723] mb-4">
                Popular Project Templates
              </h2>
              <p className="text-lg text-[#5C4D42] max-w-2xl mx-auto">
                Get started quickly with step-by-step guidance for common DIY projects
              </p>
            </div>
            <ProjectTemplates variant="grid" maxItems={6} />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-gradient-to-br from-[#C67B5C] via-[#B8593B] to-[#A65D3F] rounded-3xl p-8 sm:p-12 text-center text-white overflow-hidden">
            {/* Blueprint grid overlay */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '30px 30px'
            }} />

            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-xl" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to start your project?
              </h2>
              <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
                Get expert guidance in seconds. No signup, no hassle—just answers.
              </p>
              <Link
                href="/chat"
                className="inline-flex items-center gap-3 bg-white text-[#3E2723] px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#F5F0E6] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
              >
                <span>Start Building</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#FDFBF7] rounded-2xl py-6 px-8 shadow-lg border border-[#E8DFD0]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-[#C67B5C] to-[#A65D3F] p-2 rounded-lg">
                  <Wrench className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-[#3E2723]">DIY Helper</span>
              </div>
              <p className="text-sm text-[#5C4D42]">
                Built for DIYers, by DIYers. Powered by Claude AI.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
