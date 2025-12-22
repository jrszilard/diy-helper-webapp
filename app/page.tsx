'use client';

import { useState, useEffect } from 'react';
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
  ChevronRight,
  Sparkles,
  Send
} from 'lucide-react';
import WhyDIYHelper from '@/components/WhyDIYHelper';
import ProjectTemplates from '@/components/ProjectTemplates';

export default function LandingPage() {
  const router = useRouter();
  const [chatInput, setChatInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  
  const placeholders = [
    "How do I install a ceiling fan safely?",
    "What size wire do I need for a 20-amp circuit?",
    "Help me plan a bathroom tile project",
    "What permits do I need for a deck in my area?",
    "Calculate materials for my kitchen backsplash"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      // Store the message and navigate to chat
      sessionStorage.setItem('initialChatMessage', chatInput);
      router.push('/chat');
    }
  };

  const handleQuickStart = (prompt: string) => {
    sessionStorage.setItem('initialChatMessage', prompt);
    router.push('/chat');
  };

  const features = [
    {
      icon: BookOpen,
      title: "Building Codes",
      description: "Instant access to NEC, IRC, and local codes. No more searching through confusing documents.",
      color: "from-amber-500 to-orange-600"
    },
    {
      icon: Video,
      title: "Video Tutorials",
      description: "Curated tutorial videos for your specific project. Learn from the pros before you start.",
      color: "from-rose-500 to-pink-600"
    },
    {
      icon: ShoppingCart,
      title: "Smart Shopping Lists",
      description: "Auto-generated materials lists with local store pricing. Never over-buy again.",
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: Package,
      title: "Tool Inventory",
      description: "Track what you own. We'll exclude items you already have from shopping lists.",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: MapPin,
      title: "Local Store Finder",
      description: "Find materials at Home Depot, Lowe's, and Ace Hardware near you with real-time pricing.",
      color: "from-violet-500 to-purple-600"
    },
    {
      icon: Zap,
      title: "Smart Calculations",
      description: "Wire sizing, outlet counts, tile quantities—calculated correctly the first time.",
      color: "from-cyan-500 to-blue-600"
    }
  ];

  const popularProjects = [
    { label: "Install a ceiling fan", icon: "💡" },
    { label: "Build a deck", icon: "🪵" },
    { label: "Tile a bathroom", icon: "🚿" },
    { label: "Wire an outlet", icon: "🔌" },
    { label: "Fix a leaky faucet", icon: "🔧" },
    { label: "Install shelving", icon: "📚" }
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Subtle texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-stone-50/80 border-b border-stone-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-400 blur-lg opacity-30" />
                <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-lg shadow-amber-500/20">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="text-xl font-bold text-stone-900 tracking-tight">
                DIY Helper
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/chat" 
                className="hidden sm:flex items-center gap-2 text-stone-600 hover:text-stone-900 font-medium transition-colors"
              >
                <span>Open Full Chat</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/chat" 
                className="bg-stone-900 text-white px-5 py-2.5 rounded-xl hover:bg-stone-800 font-semibold transition-all hover:shadow-lg hover:shadow-stone-900/20 hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Integrated Chat */}
      <section className="relative pt-12 sm:pt-20 pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-200 rounded-full blur-3xl opacity-20" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-orange-200 rounded-full blur-3xl opacity-20" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-stone-200 text-stone-700 px-4 py-2 rounded-full text-sm font-medium mb-8 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>AI-Powered Project Assistant</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-stone-900 mb-6 leading-[1.1] tracking-tight">
            Your DIY projects,
            <br />
            <span className="relative">
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                done right
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                <path d="M2 6C50 2 150 2 198 6" stroke="url(#underline-gradient)" strokeWidth="3" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="underline-gradient" x1="0" y1="0" x2="200" y2="0">
                    <stop stopColor="#f59e0b"/>
                    <stop offset="0.5" stopColor="#f97316"/>
                    <stop offset="1" stopColor="#f43f5e"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-stone-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Get expert guidance, building codes, materials lists, and local store prices—all in one conversation.
          </p>

          {/* Main Chat Input - The Hero Element */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <form onSubmit={handleChatSubmit}>
              <div className={`relative bg-white rounded-2xl shadow-2xl shadow-stone-900/10 border-2 transition-all duration-300 ${
                isInputFocused 
                  ? 'border-amber-400 shadow-amber-500/20' 
                  : 'border-stone-200 hover:border-stone-300'
              }`}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder={placeholders[placeholderIndex]}
                  className="w-full px-6 py-5 pr-16 text-lg text-stone-900 placeholder-stone-400 rounded-2xl focus:outline-none bg-transparent"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all duration-200 ${
                    chatInput.trim()
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-105'
                      : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
            
            {/* Helper text */}
            <p className="text-sm text-stone-500 mt-3">
              Press <kbd className="px-2 py-0.5 bg-stone-200 rounded text-stone-700 font-mono text-xs">Enter</kbd> to start chatting
            </p>
          </div>

          {/* Quick Start Prompts */}
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {popularProjects.map((project, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickStart(project.label)}
                className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-all text-sm font-medium text-stone-700 hover:text-stone-900 shadow-sm hover:shadow"
              >
                <span>{project.icon}</span>
                <span>{project.label}</span>
                <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-8 border-y border-stone-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16 text-stone-500">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-stone-900">Free</span>
              <span className="text-sm">to use</span>
            </div>
            <div className="h-8 w-px bg-stone-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-stone-900">Instant</span>
              <span className="text-sm">answers</span>
            </div>
            <div className="h-8 w-px bg-stone-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-stone-900">No signup</span>
              <span className="text-sm">required</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why DIY Helper Comparison */}
      <WhyDIYHelper />

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              Everything you need to DIY with confidence
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              From planning to purchasing, we've got you covered
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group relative bg-white rounded-2xl p-6 border border-stone-200 hover:border-stone-300 transition-all duration-300 hover:shadow-xl hover:shadow-stone-900/5 hover:-translate-y-1"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Conversation Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-stone-900 text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              See how it works
            </h2>
            <p className="text-stone-400 text-lg">
              A real conversation with DIY Helper
            </p>
          </div>

          {/* Chat Demo */}
          <div className="bg-stone-800/50 rounded-2xl p-6 sm:p-8 border border-stone-700">
            <div className="space-y-6">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-amber-500 text-white rounded-2xl rounded-br-md px-5 py-3 max-w-[85%]">
                  <p>What size wire do I need for a 20-amp kitchen circuit that's 35 feet from the panel?</p>
                </div>
              </div>

              {/* Assistant message */}
              <div className="flex justify-start">
                <div className="bg-stone-700 rounded-2xl rounded-bl-md px-5 py-4 max-w-[90%]">
                  <p className="mb-4">For a 20-amp circuit at 35 feet, you'll need <span className="text-amber-400 font-semibold">12-gauge wire</span> per NEC 210.19.</p>
                  
                  {/* Product card */}
                  <div className="bg-stone-600/50 rounded-xl p-4 border border-stone-500/50">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-stone-500 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                        🔌
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">Southwire 250ft 12/2 NM-B Romex</p>
                        <p className="text-sm text-stone-400 mt-1">Copper with Ground • In Stock</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-amber-400 font-bold text-lg">$87.43</span>
                          <span className="text-xs text-stone-400 bg-stone-500/50 px-2 py-1 rounded">Home Depot</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-stone-300 text-sm">
                    Would you like me to add this to your shopping list, or see some installation videos first?
                  </p>
                </div>
              </div>
            </div>

            {/* Demo input (non-functional, just for show) */}
            <div className="mt-6 pt-6 border-t border-stone-700">
              <div 
                className="bg-stone-700/50 rounded-xl px-5 py-4 text-stone-400 cursor-pointer hover:bg-stone-700 transition-colors"
                onClick={() => router.push('/chat')}
              >
                Try asking your own question...
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              From question to completion
            </h2>
            <p className="text-lg text-stone-600">
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
                  <div className="hidden sm:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-amber-300 to-transparent" />
                )}
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl text-3xl mb-4 border border-amber-200">
                  {item.emoji}
                </div>
                <div className="text-xs font-bold text-amber-600 mb-1">STEP {item.step}</div>
                <h3 className="text-lg font-bold text-stone-900 mb-1">{item.title}</h3>
                <p className="text-sm text-stone-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Templates Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              Popular Project Templates
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Get started quickly with step-by-step guidance for common DIY projects
            </p>
          </div>
          <ProjectTemplates variant="grid" maxItems={6} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-8 sm:p-12 text-center text-white overflow-hidden">
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
                className="inline-flex items-center gap-3 bg-white text-stone-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-stone-100 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
              >
                <span>Start Building</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-stone-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-lg">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-stone-900">DIY Helper</span>
            </div>
            <p className="text-sm text-stone-500">
              Built for DIYers, by DIYers. Powered by Claude AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
