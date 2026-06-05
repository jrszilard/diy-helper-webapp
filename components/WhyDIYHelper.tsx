'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Zap, ArrowRight, Search, MessageSquare, Bot } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface Scenario {
  id: string;
  question: string;
  chatgpt: {
    answer: string;
    issues: string[];
  };
  google: {
    answer: string;
    issues: string[];
  };
  diyHelper: {
    answer: string;
    benefits: string[];
  };
}

const scenarios: Scenario[] = [
  {
    id: 'electrical',
    question: "I need to add an outlet in my Massachusetts garage",
    chatgpt: {
      answer: "Generic advice about outlet installation procedures",
      issues: [
        "May not know current MA electrical codes",
        "No local store pricing",
        "Can't check your inventory"
      ]
    },
    google: {
      answer: "Search 5+ sites, piece together info manually",
      issues: [
        "Dense code documents to read",
        "Separate searches for each store",
        "No personalization"
      ]
    },
    diyHelper: {
      answer: "Complete project plan with local codes + pricing",
      benefits: [
        "MA NEC 2023 requirements included",
        "Tools you own crossed off list",
        "Home Depot/Lowe's prices",
        "Step-by-step tutorial videos"
      ]
    }
  },
  {
    id: 'deck',
    question: "Help me build a 12x16 deck in Austin, Texas",
    chatgpt: {
      answer: "General deck building steps and considerations",
      issues: [
        "Generic lumber recommendations",
        "No permit info for Austin",
        "Can't calculate exact materials"
      ]
    },
    google: {
      answer: "Multiple searches for codes, materials, tutorials",
      issues: [
        "Hours of research needed",
        "Conflicting information",
        "Manual price comparisons"
      ]
    },
    diyHelper: {
      answer: "Austin permits + complete materials list + videos",
      benefits: [
        "Austin building permit requirements",
        "Exact lumber quantities calculated",
        "Local store availability",
        "Deck-specific tutorial videos"
      ]
    }
  },
  {
    id: 'bathroom',
    question: "I want to tile my bathroom floor",
    chatgpt: {
      answer: "Tiling process overview and tips",
      issues: [
        "Can't calculate tile needed",
        "Generic product suggestions",
        "No visual tutorials"
      ]
    },
    google: {
      answer: "Scattered info across DIY blogs and forums",
      issues: [
        "Outdated techniques possible",
        "Ad-heavy websites",
        "No shopping list"
      ]
    },
    diyHelper: {
      answer: "Full project plan with tile calculator + shopping list",
      benefits: [
        "Tile quantity calculated for you",
        "Recommended underlayment & grout",
        "Curated video tutorials",
        "Real-time store prices"
      ]
    }
  }
];

export default function WhyDIYHelper() {
  const [activeScenario, setActiveScenario] = useState(0);
  const router = useRouter();
  const scenario = scenarios[activeScenario];

  const handleTryIt = () => {
    sessionStorage.setItem('initialChatMessage', scenario.question);
    router.push('/');
  };

  return (
    <section className="py-[var(--space-2xl)]">
      <div className="u-container">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif font-normal text-white mb-4">
            Why Fixerator?
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            See how Fixerator compares to other options for your home improvement projects
          </p>
        </div>

        {/* Scenario Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {scenarios.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveScenario(idx)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                idx === activeScenario
                  ? 'bg-rust text-white shadow-lg'
                  : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.10] border border-white/[0.08]'
              }`}
            >
              {s.id === 'electrical' && 'Electrical'}
              {s.id === 'deck' && 'Deck Building'}
              {s.id === 'bathroom' && 'Bathroom Tile'}
            </button>
          ))}
        </div>

        {/* Question Display */}
        <Card padding="md" className="mb-8 text-center">
          <p className="text-sm text-white/40 mb-1">Your question:</p>
          <p className="text-lg font-medium text-white">&ldquo;{scenario.question}&rdquo;</p>
        </Card>

        {/* Comparison Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Generic AI */}
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/[0.06] rounded-lg">
                <Bot className="w-5 h-5 text-white/60" />
              </div>
              <h3 className="font-serif font-normal text-white">Generic AI</h3>
            </div>
            <p className="text-white/60 text-sm mb-4">{scenario.chatgpt.answer}</p>
            <div className="space-y-2">
              {scenario.chatgpt.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rust flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white/60">{issue}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Google Search */}
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/[0.06] rounded-lg">
                <Search className="w-5 h-5 text-white/60" />
              </div>
              <h3 className="font-serif font-normal text-white">Google Search</h3>
            </div>
            <p className="text-white/60 text-sm mb-4">{scenario.google.answer}</p>
            <div className="space-y-2">
              {scenario.google.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rust flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white/60">{issue}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Fixerator */}
          <Card padding="lg" className="border-2 border-rust bg-rust/[0.08] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-rust text-white text-xs font-bold px-3 py-1 rounded-full">
                BEST OPTION
              </span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rust/20 rounded-lg">
                <Zap className="w-5 h-5 text-rust" />
              </div>
              <h3 className="font-serif font-normal text-white">Fixerator</h3>
            </div>
            <p className="text-white/80 text-sm mb-4 font-medium">{scenario.diyHelper.answer}</p>
            <div className="space-y-2">
              {scenario.diyHelper.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest-green flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white/60">{benefit}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Button
            variant="primary"
            size="lg"
            onClick={handleTryIt}
            leftIcon={MessageSquare}
            rightIcon={ArrowRight}
          >
            Try This Question
          </Button>
        </div>
      </div>
    </section>
  );
}
