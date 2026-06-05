import { ArrowRight, Ruler, CheckCircle } from 'lucide-react';
import WhyDIYHelper from '@/components/WhyDIYHelper';
import ProjectTemplates from '@/components/ProjectTemplates';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const features = [
  {
    title: "Building Codes",
    description: "Search NEC, IRC, and local codes by project type — without reading through the full document.",
  },
  {
    title: "Video Guides",
    description: "Project-specific video walkthroughs sourced from licensed tradespeople and trusted instructors.",
  },
  {
    title: "Materials Lists",
    description: "Generated based on your project specs, with current pricing from Home Depot, Lowe's, and local suppliers.",
  },
  {
    title: "Tool Inventory",
    description: "Log the tools you already own. Shopping lists will automatically exclude them.",
  },
  {
    title: "Local Store Finder",
    description: "Find materials at stores near you with up-to-date availability and pricing.",
  },
  {
    title: "Project Calculations",
    description: "Wire gauge, outlet load, tile coverage, lumber quantities — calculated from your project dimensions.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-earth-night">
      {/* Two-Sided Value Section */}
      <section className="py-[var(--space-2xl)]">
        <div className="u-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-white mb-4">
              Built for homeowners and trade professionals
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Whether you&apos;re planning a renovation or want to put your trade knowledge to work
            </p>
          </div>

          <div className="u-grid">
            {/* For Homeowners */}
            <Card padding="lg" className="col-span-12 sm:col-span-6 flex flex-col">
              <h3 className="text-xl font-serif font-normal text-white mb-4">Plan, prepare, and build with confidence</h3>
              <ul className="space-y-3 mb-6 flex-1">
                {[
                  'Project plans that reference local building codes automatically',
                  'Materials lists with pricing from stores near you',
                  'Access to licensed trade professionals when you need a second opinion',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-white/60">
                    <CheckCircle className="w-4 h-4 text-forest-green mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button variant="tertiary" size="lg" href="/" rightIcon={ArrowRight}>
                Start a Project
              </Button>
            </Card>

            {/* For Trade Professionals */}
            <Card padding="lg" className="col-span-12 sm:col-span-6 flex flex-col">
              <h3 className="text-xl font-serif font-normal text-white mb-4">Share your expertise on your schedule</h3>
              <ul className="space-y-3 mb-6 flex-1">
                {[
                  'Answer project questions in your trade area',
                  'Set your own availability and per-question rate',
                  'Build a verified profile with reviews from real clients',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-white/60">
                    <CheckCircle className="w-4 h-4 text-forest-green mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button
                href="/experts/register"
                rightIcon={ArrowRight}
                size="lg"
                className="bg-gradient-to-r from-gold to-copper text-white hover:from-copper hover:to-copper hover:shadow-lg hover:-translate-y-0.5"
              >
                Apply as an Expert
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Fixerator Comparison */}
      <WhyDIYHelper />

      {/* Features Grid */}
      <section className="py-[var(--space-2xl)]">
        <div className="u-container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Badge variant="default" icon={Ruler}>Features</Badge>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-white mb-4">
              What DIY Helper includes
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Tools to help you plan, shop, and build — without the guesswork
            </p>
          </div>

          <div className="u-grid">
            {features.map((feature, idx) => (
              <Card
                key={idx}
                padding="lg"
                className="col-span-12 sm:col-span-6 lg:col-span-4"
              >
                <h3 className="text-lg font-serif font-normal text-white mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Expert Earnings Spotlight — hidden, uncomment to restore */}
      {/* <section className="py-[var(--space-2xl)] bg-earth-brown-dark">
        <div className="u-container">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <Badge variant="warning" icon={Award}>Expert Spotlight</Badge>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-white mb-4">
              How trade professionals use DIY Helper
            </h2>
            <p className="text-lg text-white/60">Licensed tradespeople who answer questions on their own time.</p>
          </div>

          <div className="u-grid mb-10">
            {[
              {
                name: 'Mike T.',
                trade: 'Licensed Electrician',
                location: 'Portland, OR',
                quote: 'I set aside a few hours a week for questions during slower periods. The homeowners asking are usually a couple steps in and genuinely stuck — so the answers are specific, not generic.',
                rating: 4.9,
                reviews: '47',
              },
              {
                name: 'Sarah K.',
                trade: 'Master Plumber',
                location: 'Austin, TX',
                quote: 'Most questions take me 10 or 15 minutes. I can see photos of what they\'re working with, which makes it easy to give a real answer instead of a guess.',
                rating: 4.8,
                reviews: '32',
              },
            ].map((expert, idx) => (
              <Card key={idx} padding="lg" className="col-span-12 sm:col-span-6">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={expert.name} size="lg" />
                  <div>
                    <p className="font-bold text-white">{expert.name}</p>
                    <p className="text-sm text-white/40">{expert.trade} · {expert.location}</p>
                  </div>
                </div>
                <p className="text-sm text-white/60 italic mb-4 leading-relaxed">
                  &ldquo;{expert.quote}&rdquo;
                </p>
                <div className="flex items-center gap-1.5 pt-4 border-t border-white/[0.08]">
                  <StarRating value={expert.rating} size="sm" />
                  <span className="font-bold text-white">{expert.rating}</span>
                  <span className="text-sm text-white/40">({expert.reviews} reviews)</span>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              href="/experts/register"
              rightIcon={ArrowRight}
              size="lg"
              className="bg-gradient-to-r from-gold to-copper text-white hover:from-copper hover:to-copper hover:shadow-lg hover:-translate-y-0.5"
            >
              Apply as an Expert
            </Button>
            <p className="mt-3 text-sm text-white/40">Free to apply — most approvals within 48 hours</p>
          </div>
        </div>
      </section> */}

      {/* Project Templates */}
      <section className="py-[var(--space-2xl)]">
        <div className="u-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-white mb-4">
              Common Project Types
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Pre-built guidance, code references, and materials estimates for the most frequent home improvement projects
            </p>
          </div>
          <ProjectTemplates variant="grid" maxItems={6} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-[var(--space-3xl)] border-t border-white/[0.08]">
        <div className="u-container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-serif font-normal text-white mb-4">
              Ready to start your project?
            </h2>
            <p className="text-lg text-white/60 mb-10">
              No account needed. Create one if you want to save your work or connect with a licensed expert.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-[var(--space-s)]">
              <Button variant="primary" href="/" size="lg" rightIcon={ArrowRight}>
                Start a Project
              </Button>
              <Button variant="outline" href="/experts/register" size="lg" rightIcon={ArrowRight}>
                Apply as an Expert
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
