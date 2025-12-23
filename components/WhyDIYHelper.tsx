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
    <section className="py-16 bg-[#E8DFD0]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#3E2723] mb-4">
            Why DIY Helper?
          </h2>
          <p className="text-lg text-[#7D6B5D] max-w-2xl mx-auto">
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
                  ? 'bg-[#C67B5C] text-white shadow-lg'
                  : 'bg-[#FDFBF7] text-[#5C4D42] hover:bg-[#F5F0E6] border border-[#D4C8B8]'
              }`}
            >
              {s.id === 'electrical' && 'Electrical'}
              {s.id === 'deck' && 'Deck Building'}
              {s.id === 'bathroom' && 'Bathroom Tile'}
            </button>
          ))}
        </div>

        {/* Question Display */}
        <div className="bg-[#4A3F35] text-white rounded-xl p-4 mb-8 text-center">
          <p className="text-sm text-[#D4C8B8] mb-1">Your question:</p>
          <p className="text-lg font-medium">"{scenario.question}"</p>
        </div>

        {/* Comparison Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* ChatGPT */}
          <div className="bg-[#FDFBF7] rounded-xl p-6 border border-[#D4C8B8]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#E8DFD0] rounded-lg">
                <Bot className="w-5 h-5 text-[#7D6B5D]" />
              </div>
              <h3 className="font-bold text-[#3E2723]">Generic AI</h3>
            </div>
            <p className="text-[#7D6B5D] text-sm mb-4">{scenario.chatgpt.answer}</p>
            <div className="space-y-2">
              {scenario.chatgpt.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-[#B8593B] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#5C4D42]">{issue}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Google Search */}
          <div className="bg-[#FDFBF7] rounded-xl p-6 border border-[#D4C8B8]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#E8DFD0] rounded-lg">
                <Search className="w-5 h-5 text-[#7D6B5D]" />
              </div>
              <h3 className="font-bold text-[#3E2723]">Google Search</h3>
            </div>
            <p className="text-[#7D6B5D] text-sm mb-4">{scenario.google.answer}</p>
            <div className="space-y-2">
              {scenario.google.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-[#B8593B] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#5C4D42]">{issue}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DIY Helper */}
          <div className="bg-gradient-to-br from-[#FDF8F3] to-[#FDF3ED] rounded-xl p-6 border-2 border-[#C67B5C] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#C67B5C] text-white text-xs font-bold px-3 py-1 rounded-full">
                BEST OPTION
              </span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#FDF3ED] rounded-lg">
                <Zap className="w-5 h-5 text-[#C67B5C]" />
              </div>
              <h3 className="font-bold text-[#3E2723]">DIY Helper</h3>
            </div>
            <p className="text-[#5C4D42] text-sm mb-4 font-medium">{scenario.diyHelper.answer}</p>
            <div className="space-y-2">
              {scenario.diyHelper.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4A7C59] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#5C4D42]">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <button
            onClick={handleTryIt}
            className="inline-flex items-center gap-2 bg-[#C67B5C] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#A65D3F] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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
