'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Zap, ArrowRight, Search, MessageSquare, Bot } from 'lucide-react';

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
    router.push('/chat');
  };

  return (
    <section className="py-16 bg-stone-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
            Why DIY Helper?
          </h2>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            See how DIY Helper compares to other options for your home improvement projects
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
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
              }`}
            >
              {s.id === 'electrical' && 'Electrical'}
              {s.id === 'deck' && 'Deck Building'}
              {s.id === 'bathroom' && 'Bathroom Tile'}
            </button>
          ))}
        </div>

        {/* Question Display */}
        <div className="bg-stone-800 text-white rounded-xl p-4 mb-8 text-center">
          <p className="text-sm text-stone-400 mb-1">Your question:</p>
          <p className="text-lg font-medium">"{scenario.question}"</p>
        </div>

        {/* Comparison Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* ChatGPT */}
          <div className="bg-white rounded-xl p-6 border border-stone-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-stone-100 rounded-lg">
                <Bot className="w-5 h-5 text-stone-600" />
              </div>
              <h3 className="font-bold text-stone-900">Generic AI</h3>
            </div>
            <p className="text-stone-600 text-sm mb-4">{scenario.chatgpt.answer}</p>
            <div className="space-y-2">
              {scenario.chatgpt.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-stone-600">{issue}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Google Search */}
          <div className="bg-white rounded-xl p-6 border border-stone-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-stone-100 rounded-lg">
                <Search className="w-5 h-5 text-stone-600" />
              </div>
              <h3 className="font-bold text-stone-900">Google Search</h3>
            </div>
            <p className="text-stone-600 text-sm mb-4">{scenario.google.answer}</p>
            <div className="space-y-2">
              {scenario.google.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-stone-600">{issue}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DIY Helper */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border-2 border-amber-300 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                BEST OPTION
              </span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-stone-900">DIY Helper</h3>
            </div>
            <p className="text-stone-700 text-sm mb-4 font-medium">{scenario.diyHelper.answer}</p>
            <div className="space-y-2">
              {scenario.diyHelper.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-stone-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <button
            onClick={handleTryIt}
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <MessageSquare className="w-5 h-5" />
            Try This Question
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
