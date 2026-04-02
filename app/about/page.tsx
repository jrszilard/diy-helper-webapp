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
  Award,
  CheckCircle,
  Star,
  Home,
} from 'lucide-react';
import WhyDIYHelper from '@/components/WhyDIYHelper';
import ProjectTemplates from '@/components/ProjectTemplates';
import AppLogo from '@/components/AppLogo';
import Button from '@/components/ui/Button';

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
    color: "from-[#4A7C59] to-[var(--forest-green-dark)]"
  },
  {
    icon: Package,
    title: "Tool Inventory",
    description: "Track what you own. We'll exclude items you already have from shopping lists.",
    color: "from-[#5D7B93] to-[var(--slate-blue-dark)]"
  },
  {
    icon: MapPin,
    title: "Local Store Finder",
    description: "Find materials at Home Depot, Lowe's, and Ace Hardware near you with real-time pricing.",
    color: "from-[#7D6B5D] to-[var(--warm-brown)]"
  },
  {
    icon: Zap,
    title: "Smart Calculations",
    description: "Wire sizing, outlet counts, tile quantities—calculated correctly the first time.",
    color: "from-[#9B7BA6] to-[#7A5C87]"
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--earth-cream)]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--earth-brown-dark)]/95 border-b border-[var(--blueprint-grid-major)]">
        <div className="u-container">
          <div className="flex justify-between items-center h-16">
            <AppLogo variant="dark" />
            <div className="flex items-center gap-3">
              <Link href="/about" className="text-sm font-medium text-white">
                About
              </Link>
              <Button variant="ghost" href="/experts/register" className="text-[var(--earth-sand)] hover:text-white hover:bg-white/10">
                Become an Expert
              </Button>
              <Link
                href="/"
                className="bg-terracotta text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-terracotta-dark transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Social Proof Bar */}
      <section className="py-[var(--space-s)] border-b border-[#E8DFD0]">
        <div className="u-container">
          <div className="flex flex-wrap justify-center items-center gap-[var(--space-m)] sm:gap-[var(--space-xl)] text-[#7D6B5D]">
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
            <div className="h-8 w-px bg-[#D4C8B8] hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#3E2723]">Verified</span>
              <span className="text-sm">experts</span>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Sided Value Section */}
      <section className="py-[var(--space-2xl)]">
        <div className="u-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#3E2723] mb-4">
              One platform, two ways to win
            </h2>
            <p className="text-lg text-[var(--warm-brown)] max-w-2xl mx-auto">
              Whether you&apos;re tackling a project or sharing your trade knowledge
            </p>
          </div>

          <div className="u-grid">
            {/* For Homeowners */}
            <div className="col-span-12 sm:col-span-6 bg-white rounded-2xl p-6 border border-[#E8DFD0] hover:border-[#C67B5C] transition-all duration-300 hover:shadow-lg">
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-[#5D7B93] to-[var(--slate-blue-dark)] mb-4 shadow-lg">
                <Home className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#3E2723] mb-4">Get your project done right</h3>
              <ul className="space-y-3 mb-6">
                {[
                  'AI-powered project plans with local building codes',
                  'Smart shopping lists with real store prices',
                  'Expert help when you get stuck',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[var(--warm-brown)]">
                    <CheckCircle className="w-4 h-4 text-[#4A7C59] mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button variant="tertiary" size="lg" href="/" rightIcon={ArrowRight}>
                Start My Project
              </Button>
            </div>

            {/* For Trade Professionals */}
            <div className="col-span-12 sm:col-span-6 bg-white rounded-2xl p-6 border border-[#E8DFD0] hover:border-[var(--gold)] transition-all duration-300 hover:shadow-lg">
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] mb-4 shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#3E2723] mb-4">Turn your expertise into income</h3>
              <ul className="space-y-3 mb-6">
                {[
                  'Answer DIY questions and get paid per response',
                  'Set your own rates and schedule',
                  'Build your reputation with verified reviews',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[var(--warm-brown)]">
                    <CheckCircle className="w-4 h-4 text-[#4A7C59] mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/experts/register"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-white px-5 py-2.5 rounded-xl hover:from-[var(--gold-dark)] hover:to-[#B8860B] font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <span>Start Earning</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why DIY Helper Comparison */}
      <WhyDIYHelper />

      {/* Features Grid */}
      <section className="py-[var(--space-2xl)]">
        <div className="u-container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Ruler className="w-5 h-5 text-[#5D7B93]" />
              <span className="text-sm font-medium text-[#5D7B93] uppercase tracking-wider">Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#3E2723] mb-4">
              Everything you need to DIY with confidence
            </h2>
            <p className="text-lg text-[var(--warm-brown)] max-w-2xl mx-auto">
              From planning to purchasing, we&apos;ve got you covered
            </p>
          </div>

          <div className="u-grid">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="col-span-12 sm:col-span-6 lg:col-span-4 group relative bg-white rounded-2xl p-6 border border-[#E8DFD0] hover:border-[#C67B5C] transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#3E2723] mb-2">{feature.title}</h3>
                <p className="text-[var(--warm-brown)] text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Expert Earnings Spotlight */}
      <section className="py-[var(--space-2xl)] bg-[var(--earth-tan)]">
        <div className="u-container">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-[var(--gold-dark)]" />
              <span className="text-sm font-medium text-[var(--gold-dark)] uppercase tracking-wider">Expert Spotlight</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#3E2723] mb-4">
              Experts on DIY Helper
            </h2>
            <p className="text-lg text-[var(--warm-brown)]">Real professionals. Real earnings.</p>
          </div>

          <div className="u-grid mb-10">
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
              <div key={idx} className="col-span-12 sm:col-span-6 bg-white rounded-2xl p-6 border border-[#E8DFD0]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] flex items-center justify-center text-white font-bold text-lg">
                    {expert.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-[#3E2723]">{expert.name}</p>
                    <p className="text-sm text-[#7D6B5D]">{expert.trade} · {expert.location}</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--warm-brown)] italic mb-4 leading-relaxed">
                  &ldquo;{expert.quote}&rdquo;
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-[#E8DFD0]">
                  <div>
                    <span className="text-xl font-bold text-[#3E2723]">{expert.earnings}</span>
                    <span className="text-sm text-[#7D6B5D]">{expert.period}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-[var(--gold-dark)] fill-[var(--gold-dark)]" />
                    <span className="font-bold text-[#3E2723]">{expert.rating}</span>
                    <span className="text-sm text-[#7D6B5D]">({expert.reviews} reviews)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/experts/register"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-white px-6 py-3 rounded-xl hover:from-[var(--gold-dark)] hover:to-[#B8860B] font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <span>Become an Expert</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="mt-3 text-sm text-[#7D6B5D]">Free to join — start earning within days</p>
          </div>
        </div>
      </section>

      {/* Project Templates */}
      <section className="py-[var(--space-2xl)]">
        <div className="u-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#3E2723] mb-4">
              Popular Project Templates
            </h2>
            <p className="text-lg text-[var(--warm-brown)] max-w-2xl mx-auto">
              Get started quickly with step-by-step guidance for common DIY projects
            </p>
          </div>
          <ProjectTemplates variant="grid" maxItems={6} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-[var(--space-3xl)]">
        <div className="u-container">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-gradient-to-br from-[#C67B5C] via-[#B8593B] to-[#A65D3F] rounded-3xl p-8 sm:p-12 text-center text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-xl" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to get started?</h2>
                <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
                  Whether you&apos;re tackling a project or sharing your expertise
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-[var(--space-s)]">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-3 bg-white text-[#3E2723] px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#F5F0E6] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
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
        </div>
      </section>

      {/* Footer */}
      <footer className="py-[var(--space-l)] border-t border-[#E8DFD0]">
        <div className="u-container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <AppLogo />
            <p className="text-sm text-[var(--warm-brown)]">
              Built for DIYers and the pros who help them. Powered by Claude AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
