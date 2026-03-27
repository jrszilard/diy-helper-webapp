'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Zap,
  BookOpen,
  ShoppingCart,
  Video,
  MapPin,
  Package,
  Ruler,
  Users,
  Award,
  CheckCircle,
  DollarSign,
  Star,
  Home,
} from 'lucide-react';
import WhyDIYHelper from '@/components/WhyDIYHelper';
import ProjectTemplates from '@/components/ProjectTemplates';
import LandingHero from '@/components/LandingHero';
import AuthButton from '@/components/AuthButton';
import ExpertQuickBar from '@/components/ExpertQuickBar';
import { useExpertStatus } from '@/hooks/useExpertStatus';
import { supabase } from '@/lib/supabase';
import AppLogo from '@/components/AppLogo';
import Button from '@/components/ui/Button';

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const { isExpert, expert, openQueueCount } = useExpertStatus();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined, name: session.user.user_metadata?.display_name ?? undefined } : null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined, name: session.user.user_metadata?.display_name ?? undefined } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signIn') === 'true' && !user) {
      const t = setTimeout(() => setShowAuth(true), 0);
      return () => clearTimeout(t);
    }
  }, [user]);

  const features = [
    {
      icon: BookOpen,
      title: "Building Codes",
      description: "Instant access to NEC, IRC, and local codes. No more searching through confusing documents.",
      color: "from-terracotta to-terracotta-dark"
    },
    {
      icon: Video,
      title: "Video Tutorials",
      description: "Curated tutorial videos for your specific project. Learn from the pros before you start.",
      color: "from-copper to-[#8B5A2B]"
    },
    {
      icon: ShoppingCart,
      title: "Smart Shopping Lists",
      description: "Auto-generated materials lists with local store pricing. Never over-buy again.",
      color: "from-forest-green to-forest-green-dark"
    },
    {
      icon: Package,
      title: "Tool Inventory",
      description: "Track what you own. We'll exclude items you already have from shopping lists.",
      color: "from-slate-blue to-slate-blue-dark"
    },
    {
      icon: MapPin,
      title: "Local Store Finder",
      description: "Find materials at Home Depot, Lowe's, and Ace Hardware near you with real-time pricing.",
      color: "from-earth-brown to-warm-brown"
    },
    {
      icon: Zap,
      title: "Smart Calculations",
      description: "Wire sizing, outlet counts, tile quantities—calculated correctly the first time.",
      color: "from-[#9B7BA6] to-[#7A5C87]"
    }
  ];

  return (
    <div className="min-h-screen bg-earth-brown-dark">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--earth-brown-dark)]/95 border-b border-[var(--blueprint-grid-major)]">
        <div className="u-container">
          <div className="flex justify-between items-center h-16">
            <AppLogo variant="dark" />
            <div className="flex items-center gap-3">
              <Button variant="ghost" href="/about" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10 hidden sm:inline-flex">
                About
              </Button>
              <Button variant="ghost" href="/experts/register" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10">
                Become an Expert
              </Button>
              <AuthButton user={user} variant="dark" isExpert={isExpert} externalShowAuth={showAuth} onAuthToggle={setShowAuth} />
            </div>
          </div>
        </div>
      </nav>

      {/* Expert Quick Bar - only shown to verified experts */}
      {isExpert && expert && (
        <ExpertQuickBar displayName={expert.displayName} openQueueCount={openQueueCount} />
      )}

      {/* Hero Section with Guided Bot */}
      <section className="relative pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Blueprint corner markers */}
        <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-white/20" />
        <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-white/20" />
        <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-white/20" />
        <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-white/20" />

        <div className="relative max-w-4xl mx-auto">
          <div className="content-card">
            <LandingHero />
          </div>
          {/* Skip link */}
          <p className="text-center mt-4 text-sm text-warm-brown">
            Already know what you need?{' '}
            <Link href="/chat" className="text-terracotta hover:underline">
              Skip to full chat →
            </Link>
          </p>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-surface rounded-2xl py-6 px-8 shadow-lg border border-earth-tan">
            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-12 text-earth-brown">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">Free</span>
                <span className="text-sm">to use</span>
              </div>
              <div className="h-8 w-px bg-earth-sand hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">Instant</span>
                <span className="text-sm">answers</span>
              </div>
              <div className="h-8 w-px bg-earth-sand hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">No signup</span>
                <span className="text-sm">required</span>
              </div>
              <div className="h-8 w-px bg-earth-sand hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">Verified</span>
                <span className="text-sm">experts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Sided Value Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="content-card">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                One platform, two ways to win
              </h2>
              <p className="text-lg text-warm-brown max-w-2xl mx-auto">
                Whether you&apos;re tackling a project or sharing your trade knowledge
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* For Homeowners */}
              <div className="bg-white rounded-2xl p-6 border border-earth-tan hover:border-terracotta transition-all duration-300 hover:shadow-lg">
                <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-slate-blue to-slate-blue-dark mb-4 shadow-lg">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">Get your project done right</h3>
                <ul className="space-y-3 mb-6">
                  {[
                    'AI-powered project plans with local building codes',
                    'Smart shopping lists with real store prices',
                    'Expert help when you get stuck',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-warm-brown">
                      <CheckCircle className="w-4 h-4 text-forest-green mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="tertiary" size="lg" href="/chat" rightIcon={ArrowRight}>
                  Start My Project
                </Button>
              </div>

              {/* For Trade Professionals */}
              <div className="bg-white rounded-2xl p-6 border border-earth-tan hover:border-gold transition-all duration-300 hover:shadow-lg">
                <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-gold to-gold-dark mb-4 shadow-lg">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">Turn your expertise into income</h3>
                <ul className="space-y-3 mb-6">
                  {[
                    'Answer DIY questions and get paid per response',
                    'Set your own rates and schedule',
                    'Build your reputation with verified reviews',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-warm-brown">
                      <CheckCircle className="w-4 h-4 text-forest-green mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/experts/register"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-gold to-gold-dark text-white px-5 py-2.5 rounded-xl hover:from-gold-dark hover:to-[#B8860B] font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <span>Start Earning</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
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
                <Ruler className="w-5 h-5 text-slate-blue" />
                <span className="text-sm font-medium text-slate-blue uppercase tracking-wider">Features</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Everything you need to DIY with confidence
              </h2>
              <p className="text-lg text-warm-brown max-w-2xl mx-auto">
                From planning to purchasing, we&apos;ve got you covered
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="group relative bg-white rounded-2xl p-6 border border-earth-tan hover:border-terracotta transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-warm-brown text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Demo Conversation Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-earth-brown-dark text-white relative overflow-hidden">
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
            <p className="text-earth-sand text-lg">
              A real conversation with DIY Helper
            </p>
          </div>

          {/* Chat Demo */}
          <div className="bg-[#3E3530]/50 rounded-2xl p-6 sm:p-8 border border-warm-brown">
            <div className="space-y-6">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-terracotta text-white rounded-2xl rounded-br-md px-5 py-3 max-w-[85%]">
                  <p>What size wire do I need for a 20-amp kitchen circuit that&apos;s 35 feet from the panel?</p>
                </div>
              </div>

              {/* Assistant message */}
              <div className="flex justify-start">
                <div className="bg-warm-brown rounded-2xl rounded-bl-md px-5 py-4 max-w-[90%]">
                  <p className="mb-4">For a 20-amp circuit at 35 feet, you&apos;ll need <span className="text-terracotta font-semibold">12-gauge wire</span> per NEC 210.19.</p>

                  {/* Product card */}
                  <div className="bg-earth-brown-dark/50 rounded-xl p-4 border border-[#6B5D4F]">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-[#6B5D4F] rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                        🔌
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">Southwire 250ft 12/2 NM-B Romex</p>
                        <p className="text-sm text-earth-brown-light mt-1">Copper with Ground - In Stock</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-terracotta font-bold text-lg">$87.43</span>
                          <span className="text-xs text-earth-brown-light bg-warm-brown px-2 py-1 rounded">Home Depot</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-earth-sand text-sm">
                    Would you like me to add this to your shopping list, or see some installation videos first?
                  </p>
                </div>
              </div>
            </div>

            {/* Demo input (non-functional, just for show) */}
            <div className="mt-6 pt-6 border-t border-warm-brown">
              <div
                className="bg-warm-brown/50 rounded-xl px-5 py-4 text-earth-brown-light cursor-pointer hover:bg-warm-brown transition-colors"
                onClick={() => router.push('/chat')}
              >
                Try asking your own question...
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Expert Earnings Spotlight */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="content-card">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-gold-dark" />
                <span className="text-sm font-medium text-gold-dark uppercase tracking-wider">Expert Spotlight</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Experts on DIY Helper
              </h2>
              <p className="text-lg text-warm-brown">
                Real professionals. Real earnings.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mb-10">
              {[
                {
                  name: 'Mike T.',
                  trade: 'Licensed Electrician',
                  location: 'Portland, OR',
                  quote: 'I answer 5-6 questions a week during downtime between jobs. Easy extra income doing what I already know.',
                  earnings: '$2,400',
                  period: '/mo avg',
                  rating: '4.9',
                  reviews: '47',
                },
                {
                  name: 'Sarah K.',
                  trade: 'Master Plumber',
                  location: 'Austin, TX',
                  quote: 'I do a couple video consultations a week. DIYers love getting real-time help, and the pay is great.',
                  earnings: '$1,800',
                  period: '/mo avg',
                  rating: '4.8',
                  reviews: '32',
                },
              ].map((expert, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 border border-earth-tan">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-white font-bold text-lg">
                      {expert.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{expert.name}</p>
                      <p className="text-sm text-earth-brown">{expert.trade} · {expert.location}</p>
                    </div>
                  </div>
                  <p className="text-sm text-warm-brown italic mb-4 leading-relaxed">
                    &ldquo;{expert.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-4 pt-4 border-t border-earth-tan">
                    <div>
                      <span className="text-xl font-bold text-foreground">{expert.earnings}</span>
                      <span className="text-sm text-earth-brown">{expert.period}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-gold-dark fill-gold-dark" />
                      <span className="font-bold text-foreground">{expert.rating}</span>
                      <span className="text-sm text-earth-brown">({expert.reviews} reviews)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Link
                href="/experts/register"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-gold to-gold-dark text-white px-6 py-3 rounded-xl hover:from-gold-dark hover:to-[#B8860B] font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <span>Become an Expert</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="mt-3 text-sm text-earth-brown">
                Free to join — start earning within days
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Project Templates Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="content-card">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Popular Project Templates
              </h2>
              <p className="text-lg text-warm-brown max-w-2xl mx-auto">
                Get started quickly with step-by-step guidance for common DIY projects
              </p>
            </div>
            <ProjectTemplates variant="grid" maxItems={6} />
          </div>
        </div>
      </section>

      {/* Final CTA — Dual */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-gradient-to-br from-terracotta via-rust to-terracotta-dark rounded-3xl p-8 sm:p-12 text-center text-white overflow-hidden">
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
                Ready to get started?
              </h2>
              <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
                Whether you&apos;re tackling a project or sharing your expertise
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-3 bg-white text-foreground px-8 py-4 rounded-xl font-bold text-lg hover:bg-earth-cream transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                >
                  <span>Start My Project</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/experts/register"
                  className="inline-flex items-center gap-3 bg-white/15 text-white border-2 border-white/40 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/25 transition-all hover:-translate-y-0.5"
                >
                  <span>Become an Expert</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-[var(--space-l)]">
        <div className="u-container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <AppLogo variant="dark" />
            <div className="flex items-center gap-1">
              <Button variant="ghost" href="/about" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10 text-sm">
                About
              </Button>
              <Button variant="ghost" href="/experts/register" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10 text-sm">
                Become an Expert
              </Button>
              <span className="text-white/30 text-sm pl-2">Powered by Claude AI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
